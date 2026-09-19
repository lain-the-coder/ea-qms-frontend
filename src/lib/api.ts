/**
 * The one fetch wrapper. Blueprint B7. No component calls `fetch` directly.
 *
 * `/login`, `/refresh` and `/revoke` are registered without `middlewareAuth`.
 * They each call `send` with no token, and none of them has a 401 path, so a
 * wrong password or a dead refresh token can never trigger a refresh.
 * Blueprint A1.2.
 *
 * That exemption comes from how the calls are built, not from a list of
 * paths. Only `authorised`, at the bottom, has a 401 path to be exempted
 * from, and only `request` and `download` call it.
 *
 * Import direction: this module imports the auth store, and the store imports
 * nothing. Pages orchestrate between the two.
 */
import { goto } from '$app/navigation';
import { PUBLIC_API_URL } from '$env/static/public';
import { auth, endSession, getRefreshToken } from '$lib/auth.svelte';
import type {
	ErrorBody,
	LoginRequest,
	LoginResponse,
	RefreshRequest,
	RefreshResponse
} from './types';

/**
 * A caller handles failure by checking `ok`, and TypeScript will not let it
 * reach `data` until it has. No response the API sends makes a call throw.
 * A malformed success body still would, but that would be an API defect,
 * not a case to design around.
 *
 * `status: 0` means no response arrived at all. That covers a network
 * failure, a CORS block (A12), and a connection the server closed without
 * answering. It also covers a download whose body was cut off after its
 * 200 (see `download`).
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ErrorBody };

type Method = 'GET' | 'POST' | 'PUT';

/**
 * One fetch. It attaches a bearer header only when given a token, and it
 * knows nothing about 401s.
 *
 * ⚠️ A `FormData` body (the evidence upload) gets NO `Content-Type`. The
 * browser writes `multipart/form-data; boundary=…` itself, and only it knows
 * the boundary it generated. Set by hand, the header lacks it and the server
 * cannot split the parts (B7). Any other body is JSON.
 *
 * `request()`'s 401 retry passes the same `FormData` here a second time.
 * That is safe: `fetch` serialises a `FormData` afresh on every call, so it
 * is not consumed the way a stream body would be.
 */
async function send(
	method: Method,
	path: string,
	body: unknown,
	token: string | null
): Promise<Response | null> {
	const multipart = body instanceof FormData;
	const headers: Record<string, string> = {};
	if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
	if (token !== null) headers['Authorization'] = `Bearer ${token}`;
	try {
		return await fetch(PUBLIC_API_URL + path, {
			method,
			headers,
			body: multipart ? body : body === undefined ? undefined : JSON.stringify(body)
		});
	} catch {
		// fetch rejects only when no response arrived at all.
		return null;
	}
}

/**
 * `read` reads a SUCCESS body only. JSON unless told otherwise, and only the
 * download passes `blob()`. An error body never reaches it: every error the
 * API sends is JSON, the download's included, so the status is branched on
 * here, before anything is read, once for every caller (A6.2).
 */
async function toResult<T>(
	res: Response | null,
	read: (res: Response) => Promise<T> = (r) => r.json()
): Promise<ApiResult<T>> {
	if (res === null) {
		return {
			ok: false,
			status: 0,
			error: { error: 'Could not reach the server. Check your connection and try again.' }
		};
	}
	if (res.ok) {
		// Every success is assumed to carry a body, and there is deliberately no
		// 204 guard here. The API's only bodiless success is `/revoke`, which
		// never comes through this function (see `revoke`). A guard would have
		// to return `data: undefined as T`, a cast that lies to every caller
		// about `T`. If another 204 endpoint ever appears, give its caller an
		// explicit `ApiResult<void>` path instead.
		return { ok: true, data: await read(res) };
	}
	try {
		return { ok: false, status: res.status, error: (await res.json()) as ErrorBody };
	} catch {
		// Not every error body is the API's JSON. Go's mux answers an unmatched
		// method or path in plain text.
		return { ok: false, status: res.status, error: { error: `Request failed (${res.status})` } };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated: no bearer header, no 401 path
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A plain endpoint call that touches no state. The login page stores the
 * session itself.
 */
export async function login(body: LoginRequest): Promise<ApiResult<LoginResponse>> {
	return toResult(await send('POST', '/login', body, null));
}

/**
 * A plain endpoint call. The caller decides what a failure means: the 401
 * path below, the silent refresh on load (step 4) and the scheduled refresh
 * (step 16) each handle their own outcome.
 */
export async function refresh(refreshToken: string): Promise<ApiResult<RefreshResponse>> {
	const body: RefreshRequest = { refresh_token: refreshToken };
	return toResult(await send('POST', '/refresh', body, null));
}

/**
 * Whether a failed `/refresh` is the server's verdict on the token, which
 * ends the session (decision 12). A network error (status 0) or a 500 says
 * nothing about the token, so the session stands.
 *
 * Shared by `request()` below and the session restore in the `(app)` layout,
 * so the rule lives in one place.
 *
 * Only for `/refresh` responses. From any other endpoint a 400 is a
 * validation error, and treating it as a verdict would sign the user out for
 * a bad form field.
 */
export function isTokenVerdict(status: number): boolean {
	return status === 401 || status === 400;
}

/**
 * Sign out. A1.4.
 *
 * Unlike `login`, this one does write the store, because the order is the
 * whole rule:
 * - Local state is cleared first, and unconditionally. Clearing is what ends
 *   the session in this tab.
 * - The call is skipped when no token is stored. A blank `refresh_token` is
 *   a 400, not a 204.
 *
 * The outcome is ignored. Nothing the server says would change what this tab
 * should do next, and a failed call only means the token stays usable until
 * it expires. It ends this session only. Login never revokes earlier tokens
 * (A1.4a).
 */
export async function revoke(): Promise<void> {
	const refreshToken = getRefreshToken();
	endSession(null);
	if (refreshToken === null) return;
	const body: RefreshRequest = { refresh_token: refreshToken };
	await send('POST', '/revoke', body, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated
// ─────────────────────────────────────────────────────────────────────────────

/*
 * A 401's status does not say whether the token is the problem. Every signed
 * transition also returns 401, as "Invalid credentials", when the e-signature
 * fails. So the body decides. `middlewareAuth` sends exactly two messages:
 *
 *   "Unauthorized"            token missing, invalid or expired. Refresh and retry.
 *   "Account is deactivated"  end the session now. A refresh would only say the same.
 *
 * Any other 401 is the handler's own verdict and goes back to the caller
 * untouched. Retrying a failed signature would log the user out for a typo.
 * Worse, each attempt writes its own `SignatureFailed` audit row, so the
 * retry would turn one failed attempt into two in a regulated record.
 *
 * Matching prose couples this file to `middleware.go`'s wording. If that
 * wording changes, the retry stops firing and an expired token shows up as
 * an error rather than a wrongful logout. That is the safe direction to fail.
 * A machine-readable error code from the API would remove the coupling.
 */
const TOKEN_REJECTED = 'Unauthorized';
const DEACTIVATED = 'Account is deactivated';

function signOut(reason: string | null): void {
	endSession(reason);
	goto('/login');
}

/**
 * Every call to an authenticated endpoint goes through here, by way of
 * `request` or `download` below. It attaches the access token and, when the
 * token was rejected, refreshes once and retries once. It never loops. A1.2.
 *
 * `read` is the only thing the two callers differ in, so the refresh dance
 * exists once. Two copies of it would drift apart.
 */
async function authorised<T>(
	method: Method,
	path: string,
	body: unknown,
	read: (res: Response) => Promise<T>
): Promise<ApiResult<T>> {
	const first = await toResult<T>(await send(method, path, body, auth.accessToken), read);
	if (first.ok || first.status !== 401) return first;
	if (first.error.error === DEACTIVATED) {
		signOut(DEACTIVATED);
		return first;
	}
	if (first.error.error !== TOKEN_REJECTED) return first;

	const refreshToken = getRefreshToken();
	if (refreshToken === null) {
		signOut(null);
		return first;
	}

	const refreshed = await refresh(refreshToken);
	if (!refreshed.ok) {
		// Otherwise the session stands and the caller shows the error.
		if (isTokenVerdict(refreshed.status)) signOut(refreshed.error.error);
		return refreshed;
	}
	auth.accessToken = refreshed.data.token;

	// One retry. The same body rule applies: if the retry reaches the handler
	// and the e-signature is wrong, that "Invalid credentials" goes back to
	// the caller, and it does not end the session.
	const retry = await toResult<T>(await send(method, path, body, auth.accessToken), read);
	if (
		!retry.ok &&
		retry.status === 401 &&
		(retry.error.error === TOKEN_REJECTED || retry.error.error === DEACTIVATED)
	) {
		signOut(retry.error.error);
	}
	return retry;
}

/**
 * Every JSON call to an authenticated endpoint.
 *
 * Never call it for `/login`, `/refresh` or `/revoke`. They have their own
 * functions above, which is what keeps them out of this path.
 */
export function request<T>(method: Method, path: string, body?: unknown): Promise<ApiResult<T>> {
	return authorised<T>(method, path, body, (r) => r.json());
}

/**
 * A file download: the same token and 401 retry as `request`, with the
 * success body read as a `Blob` (A6.2). A link cannot do this, because it
 * cannot send the bearer (trap 4).
 *
 * ⚠️ The catch is for a body cut off after its 200. `Content-Length` is set,
 * so the browser rejects `blob()` when fewer bytes arrive, and the server's
 * 30 s `WriteTimeout` makes that reachable on a slow link (flag 61). It is
 * here and not in `toResult`, where it would change what a malformed JSON
 * success does on every other call.
 */
export async function download(path: string): Promise<ApiResult<Blob>> {
	try {
		return await authorised('GET', path, undefined, (r) => r.blob());
	} catch {
		return { ok: false, status: 0, error: { error: 'The download was interrupted. Try again.' } };
	}
}
