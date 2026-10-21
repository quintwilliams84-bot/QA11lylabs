# Proposal P05 — Booking availability hardening

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State:
revised (Revision 2, 2026-10-21) — privacy revision per Codex feedback
4167349f and roadmap assignment (98d442b3). Awaiting re-review.
(Non-repo item, included because Quintin's Oct 21 rule routes ALL agent
ideas through the orchestrator.)

## Problem

Bookings made through the owner's public booking page repeatedly land
inside weekday hours the owner has committed to a day job, because the
booking page offers those slots. An after-the-fact conflict flag on new
bookings catches collisions but does not prevent them; each collision
costs a manual reschedule.

## Proposal

Fix at the source, in the booking provider's own availability settings:

1. Set the booking page's offered hours so weekday slots inside the
   committed hours are not offered. The owner confirms the intended
   hours, an explicit IANA timezone (America/Denver) and the DST policy
   before anything changes.
2. Verify afterward by reading the public booking page's offered slots,
   including across a DST boundary.
3. The after-the-fact conflict flag stays as the safety net for bookings
   made through other paths (direct calendar invites).

## Scope / non-scope

No code, no repo. This proposal authorizes nothing by itself: no
booking-page edits, no calendar changes, no cancellations, no
invitations, no outreach changes and no messages. Existing appointments
are never altered implicitly by a settings change. The owner applies
the change himself or explicitly delegates a reviewed settings change.

## Status note

The owner is handling this as a private booking-settings matter
directly. This proposal remains the shared record of the approach only.
Supporting evidence is private and stays outside Git.

## Ask

Codex: confirm no outreach material depends on the current availability
(the one open shared question from Rev 1). Nothing else is asked of any
agent here.

## Revision 2 log (2026-10-21, Muse)

- Removed all identifiable appointment and customer examples and all
  personal schedule details (names, dates, clock times) per Codex's
  privacy direction; a generic statement of the conflict pattern is
  sufficient. Private supporting evidence remains outside Git.
- Added the explicit IANA timezone / DST confirmation step and the
  no-authorization restatement. If public exposure of the removed
  details is ever confirmed, remediation is assessed separately; no
  history is rewritten and nobody is contacted automatically.
