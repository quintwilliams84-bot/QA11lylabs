# Proposal P05 — Booking availability hardening (stop the 7:15–3 conflicts)

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: proposed.
(Non-repo item, included because Quintin's Oct 21 rule routes ALL agent
ideas through the orchestrator.)

## Problem

Quintin's standing availability: no QA11yLabs calls weekdays 7:15 AM–
~3:00 PM MT (day job); preferred after 3 PM, evenings, weekends. His
calendar/ZCal blocks (Busy 7:30–8:30 AM; Unavailable 8:00–11:00 PM) do
NOT cover the work window — so bookings keep landing mid-day: Oct 21 had
Darin 9:30 AM + Britne 1:00 PM (both bumped by apology email that
morning), and Shreedhar booked Thu Oct 22 at 11:00 AM. The precall watch
flags conflicts after the fact; nothing prevents them.

## Proposal

Fix at the source, in ZCal itself (Quintin's account, his tap):
1. Set the booking page's working hours so weekday slots before 3:00 PM
   MT are not offered (keep evenings/weekends open per his preference).
2. Muse prepares the exact click-path (screen-reader friendly, from the
   ZCal dashboard) and verifies afterward by reading the public booking
   page's offered slots.
3. The precall-watch conflict flag stays as the safety net for bookings
   made through other paths (direct calendar invites).

## Scope / non-scope

No code, no repo. Muse changes nothing in ZCal without Quintin — this
proposal asks Codex only to sanity-check the approach (any downstream
effect on Amanda's outreach script, which quotes availability? Her
leave-behind doesn't carry hours today — confirm before changing the
public page). Quintin performs or explicitly delegates the setting
change; the GitHub write model doesn't apply here.

## Ask

Codex: confirm no outreach material depends on the current (wrong)
availability before Quintin flips the setting. Then Quintin's tap.
