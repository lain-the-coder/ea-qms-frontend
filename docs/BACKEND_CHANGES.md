# Backend changes — frontend handoff

Context for the frontend build. Six changes were made to `ea-qms-backend` between the
`types.ts` work and now.

**Short version: the API contract did not change.** No endpoint was added, removed or
renamed. No request body changed. No response body changed. No status code changed for
any existing path. `types.ts` and the OpenAPI spec are both still accurate.

What follows is the list, with the one item that does affect frontend code marked.

---

## 1. Connection pool bounded

`main.go`, between `sql.Open` and `Ping`.

```go
// before — MaxOpenConns defaulted to unlimited, MaxIdleConns to 2
rawDB, err := sql.Open("postgres", dbURL)
err = rawDB.Ping()
```

```go
// after
rawDB, err := sql.Open("postgres", dbURL)

maxConns := 10
if val, ok := parseUintConfig("DB_MAX_OPEN_CONNS", 32); ok && val > 0 {
    maxConns = int(val)
}
rawDB.SetMaxOpenConns(maxConns)
rawDB.SetMaxIdleConns(maxConns)
rawDB.SetConnMaxIdleTime(5 * time.Minute)
rawDB.SetConnMaxLifetime(1 * time.Hour)

err = rawDB.Ping()
```

New optional env var `DB_MAX_OPEN_CONNS`, defaults to 10 when unset.

**Frontend impact: none.**

---

## 2. Server timeouts

`main.go`, the `http.Server` literal.

```go
// before
server := &http.Server{
    Addr:    ":1304",
    Handler: cfg.middlewareCORS(mux),
}
```

```go
// after
server := &http.Server{
    Addr:              ":1304",
    Handler:           cfg.middlewareLogging(cfg.middlewareCORS(mux)),
    ReadHeaderTimeout: 10 * time.Second,
    WriteTimeout:      30 * time.Second,
    IdleTimeout:       60 * time.Second,
}
```

`ReadTimeout` is deliberately left unset so evidence uploads are not truncated on a slow
connection.

**Frontend impact: none in practice.** A 10 MB upload or download would have to take more
than 30 seconds for `WriteTimeout` to bite, which is roughly twenty times what a normal
transfer needs.

---

## 3. Instance identity — **the one item that touches the frontend**

Every response now carries an `X-Instance-ID` header naming the process that served it.
Also on every log line.

```go
// middleware.go, first statement in middlewareLogging
w.Header().Set("X-Instance-ID", cfg.instanceID)
```

`middlewareCORS` was updated so a browser can actually read it — this is the frontend-
relevant part, since a browser hides any non-safelisted response header from JavaScript
unless the server permits it:

```go
// before
w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length")
```

```go
// after (both the preflight branch and the actual response)
w.Header().Set("Access-Control-Expose-Headers",
    "Content-Disposition, Content-Length, X-Instance-ID")
```

**Frontend impact: additive only.** Nothing breaks. The header is now *readable* from
JavaScript if wanted — useful for including in a bug report, since it identifies which
backend instance produced a bad response. Ignore it entirely and everything works as
before.

Value comes from `INSTANCE_ID` in the environment, falling back to the hostname.

---

## 4. Logging moved outside the mux

`middlewareLogging` was applied per route; it now wraps the whole mux, and wraps
`middlewareCORS` in turn.

```go
// before — logging attached to each of 23 routes
mux.Handle("GET /api/me", cfg.middlewareLogging(cfg.middlewareAuth(cfg.HandlerGetMe)))
```

```go
// after — routes carry only per-route concerns
mux.Handle("GET /api/me", cfg.middlewareAuth(cfg.HandlerGetMe))

// and the mux is wrapped once
Handler: cfg.middlewareLogging(cfg.middlewareCORS(mux))
```

Previously an unmatched path produced no log line at all, and preflight `OPTIONS`
requests were never logged because CORS answered and returned before the mux was reached.
Both are now logged.

**Frontend impact: none.** Responses are identical; only server-side logging changed.

---

## 5. Response status recorded in logs

New file `responserecorder.go` wraps `http.ResponseWriter` so the request-finished log
line can report the status code. `http.ResponseWriter` is write-only and provides no way
to read a status back, so it has to be intercepted.

```go
type responseRecorder struct {
    http.ResponseWriter
    status int
}

func (rec *responseRecorder) WriteHeader(status int) {
    rec.status = status
    rec.ResponseWriter.WriteHeader(status)
}
```

**Frontend impact: none.** The response on the wire is byte-for-byte unchanged.

---

## 6. Request deadline

`middlewareLogging` now attaches a 30-second deadline to the request context, which
propagates into every sqlc call and `BeginTx`.

```go
ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()
r = r.WithContext(ctx)
```

Without it a hung query would hold its pool connection for the life of the process.

**Frontend impact: essentially none, with one caveat.** If a request ever exceeds 30
seconds it now returns **500** rather than hanging. Mapping that to a 504 is deferred
work, so a timeout is currently indistinguishable from a server error in the response.
Nothing in normal operation comes close — the slowest observed endpoint is login at
~300 ms, because argon2id is deliberately slow.

---

## Summary for the frontend build

| Change | Frontend impact |
| ------ | --------------- |
| Pool bounded | None |
| Server timeouts | None |
| `X-Instance-ID` + CORS expose | **Additive** — new readable header, optional to use |
| Logging wraps the mux | None |
| Status in logs | None |
| 30 s request deadline | None in practice; a timeout surfaces as 500 |

**Nothing in `types.ts` or the OpenAPI spec needs revising.** Carry on with the login API
call as planned.
