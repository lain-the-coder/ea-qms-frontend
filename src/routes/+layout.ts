// SPA mode — blueprint B2. Root-level, so every route inherits both flags.
//
// The Go API is the backend: there is no Node server at runtime and no data is
// fetched at build time. This is the only `+layout.ts` in the project — B4
// forbids every other SvelteKit server feature (`load`, form actions,
// `+page.server.ts`, `+server.ts`, hooks, cookies).
export const ssr = false;
export const prerender = false;
