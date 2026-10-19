# Wiring the agents into Slack

Goal: Muse and OpenClaw post in the `#agents` channel (C0CA2N5UMPD) on the
`qa11ylabs.slack.com` workspace — build/test/ship updates, diagnostics.
Codex works through the GitHub handoff branch; Hermes is delegation-only and
needs no Slack presence. Human approval still required for all sends,
merges, and deploys (see #agents channel topic).

## What's already working (Oct 19, 2026)

| Agent | Path | Status |
|---|---|---|
| Muse | Muse Slack app, OAuth as Quintin | ✅ Live — read/post verified |
| OpenClaw | Its own Slack bot (U0AQXBKFE94) | ✅ Bot exists, posts Sterling v2 briefs — needs channel targeting only |
| Codex | None | ➖ No Slack path; Quintin relays via pasted handoffs |
| Hermes | None needed | ➖ Delegation only — no Slack presence required |

## Chosen approach: incoming webhook for OpenClaw (if needed)

Why a webhook instead of more bots/OAuth: it's just a URL. Any agent that
can `curl` can post. No OAuth dance, no token refresh, no SDK. Only OpenClaw
might need one — and only if pointing its existing bot at #agents turns out
harder than a fresh webhook. Muse is already connected via OAuth.

**Secrets rule:** webhook URLs are secrets. They live in each agent's
environment / secret store — NEVER in this repo, never in chat logs.

## Quintin's click-path (workspace admin, ~15 min)

For each agent (OpenClaw, Hermes — Muse is already connected via OAuth):

1. Go to https://api.slack.com/apps → pick the **existing workspace app**
   (or create one: "From scratch", name e.g. `qa11y-openclaw`).
2. Left sidebar → **Incoming Webhooks** → toggle **On**.
3. **Add New Webhook to Workspace** → pick `#agents` → Authorize.
4. Copy the `https://hooks.slack.com/services/T…/B…/…` URL.

Then install the URL into the agent's runtime (below). Test immediately:

```sh
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"webhook test from <agent> — please ignore"}' \
  "$SLACK_WEBHOOK_URL"
```

A test post should appear in #agents within seconds. If it doesn't, the URL
is wrong or revoked — regenerate it in the same settings page.

## Per-agent wiring

### OpenClaw (the only one left to wire)

Its bot already works — the missing piece is delivery target, not credentials.
Two options, easiest first:

- **Option A (no new secrets):** have OpenClaw post via its existing bot token
  to channel `C0CA2N5UMPD`. If its Slack integration takes a channel
  parameter, that's a one-line config change.
- **Option B (webhook):** set `SLACK_WEBHOOK_URL` in OpenClaw's environment
  (VPS env / OpenClaw config — whoever holds that runtime), then:
  ```sh
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"*OpenClaw* — VPS diagnostics summary …"}' \
    "$SLACK_WEBHOOK_URL"
  ```

### Hermes — out of scope by design

No Slack presence needed. Delegation to Hermes happens through existing
channels (Quintin relays); it doesn't need a webhook, a bot, or a seat in
#agents. Kept deliberately simple.

### Codex

No Slack path by design — it works through the shared GitHub handoff
branch (`codex/staging-coordination`) and Quintin relays. If Codex ever needs
to post directly, give it the same webhook treatment as OpenClaw's Option B.
Until then: Muse mirrors Codex review findings into #agents when Quintin asks.

### Muse

Already connected via OAuth as Quintin. Posts appear under his name —
prefixed with the agent name (e.g. `*Muse* — …`) so attribution stays clear.

## Message conventions (all agents)

- Start with `*<Agent>* — ` so readers know who posted.
- Status updates: what changed, exact SHAs/links, test counts.
- Never post secrets, tokens, private customer data, or credentials.
- Nothing here authorizes sends/merges/deploys — those still need Quintin.

## Challenge assessment (honest)

The webhook itself is the easy 15 minutes. The only real wiring left is
OpenClaw: either point its working bot at #agents (one-line config), or
install one webhook URL in its runtime. That needs whoever holds the
VPS/OpenClaw config — this repo can't reach it.

Hermes is out of scope by design (delegation only). Codex stays on the
GitHub handoff. So the "how challenging" answer: one small config change,
one pair of hands.

## Checklist

- [ ] OpenClaw pointed at #agents (bot channel targeting, or webhook URL installed) → test post seen
- [ ] Decide: does Codex need a webhook, or does the GitHub handoff suffice?
- [ ] Hermes: nothing — delegation only, by design
