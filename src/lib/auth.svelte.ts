/**
 * The session: who is signed in, and the access token their requests carry.
 * Blueprint B8 and A1.1.
 *
 * This module has no runtime imports, and must keep it that way. `api.ts`
 * imports it, and pages orchestrate between the two, so an import from here
 * back into `api.ts` would be a cycle. The `import type` below is erased at
 * compile time.
 */
import type { LoginResponse, MeResponse } from './types';

/** The refresh token's key in `localStorage`, the only place it is stored. */
const REFRESH_KEY = 'ea-qms.refresh_token';

/**
 * Export the object, never its fields. Destructuring a rune breaks
 * reactivity, so read `auth.user`, not `const { user } = auth`.
 */
export const auth = $state<{
	user: MeResponse | null;
	/** Memory only, so a closed tab leaves no access token behind. A1.1. */
	accessToken: string | null;
	/**
	 * The `error` of the 401 that ended the last session. It is carried to the
	 * login screen so the screen can say why: `Account is deactivated` must not
	 * be shown as an expired session, because signing in again will not help.
	 * A1.7. `null` for an ordinary sign-out.
	 */
	endedReason: string | null;
}>({ user: null, accessToken: null, endedReason: null });

export function getRefreshToken(): string | null {
	return localStorage.getItem(REFRESH_KEY);
}

/**
 * Fields are picked rather than spread. `...res` would put `token` and
 * `refresh_token` onto `auth.user`, leaving the refresh token in reactive
 * state readable from anywhere in the app.
 */
export function startSession(res: LoginResponse): void {
	auth.user = { id: res.id, full_name: res.full_name, email: res.email, role: res.role };
	auth.accessToken = res.token;
	auth.endedReason = null;
	localStorage.setItem(REFRESH_KEY, res.refresh_token);
}

export function endSession(reason: string | null): void {
	auth.user = null;
	auth.accessToken = null;
	auth.endedReason = reason;
	localStorage.removeItem(REFRESH_KEY);
}
