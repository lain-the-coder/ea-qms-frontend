/**
 * Display helpers shared by the dashboard and the change-control list.
 *
 * Both were written inline on the dashboard at step 5 and are needed again by
 * step 6's table (flag 22). They are functions and a lookup table, not markup,
 * so the three-copies rule is not the test — Lain's call was to move the two
 * that repeat and leave `stateHref` on the dashboard, which is still its only
 * caller.
 */
import type { State } from './types';

/**
 * State → the `global.css` badge class.
 *
 * `Record<State, …>` makes TypeScript demand all six, so a new state could not
 * be added to `types.ts` without this failing to compile. No prototype draws
 * `badge-cancelled`, but `global.css` defines it and cancelled records appear
 * in both recent activity and the list.
 */
export const BADGE: Record<State, string> = {
	Initiated: 'badge-initiated',
	'Pending Implementation Approval': 'badge-pending-impl',
	'In Implementation': 'badge-in-implementation',
	'Pending Final Approval': 'badge-pending-final',
	Closed: 'badge-closed',
	Cancelled: 'badge-cancelled'
};

// "23 Jan 2026, 9:15 AM", as the prototypes write it, in the browser's own time
// zone. en-GB gives that order but lower-cases am/pm, hence the parts. Chrome
// writes September as "Sept"; that is the locale, not a defect.
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	hour12: true
});

/** An RFC 3339 instant from the API, rendered in the browser's zone. */
export function formatDateTime(iso: string): string {
	return DATE_TIME.formatToParts(new Date(iso))
		.map((part) => (part.type === 'dayPeriod' ? part.value.toUpperCase() : part.value))
		.join('');
}
