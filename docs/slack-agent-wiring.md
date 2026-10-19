# Wiring the agents into Slack

Goal: Muse, OpenClaw, Codex, and Hermes can all post in the `#agents`
channel (C0CA2N5UMPD) on the `qa11ylabs.slack.com` workspace — build/test/ship
updates, diagnostics, review findings. Human approval still required for all
sends, merges, and deploys (see #agents channel topic).

## What's already working (Oct 19, 2026)

| Agent | Path | Status |
|---|---|---|
| Muse | Muse Slack app, OAuth as Quintin | ✅ Live — read/post verified |
| OpenClaw | Its own Slack bot (U0AQXBKFE94) | ✅ Bot exists, posts Sterling v2 briefs — needs channel targeting only |
| Codex | None | ❌ No Slack path; Quintin relays via pasted handoffs |
| Hermes | Unknown | ❓ Runtime not visible from here |

## Chosen approach: incoming webhooks (one per agent)

Why webhooks instead of more bots/OAuth: an incoming webhook is just a URL.
Any agent that can `curl` can post. No OAuth dance, no token refresh, no SDK.
One webhook per agent (not one shared) so posts are attributable and any
single URL can be rotated without touching the others.

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

### OpenClaw (closest to done)

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

### Hermes

Runtime not visible from this repo. Whoever operates Hermes needs to:

1. Take one webhook URL from Quintin's click-path above.
2. Store it as `SLACK_WEBHOOK_URL` in Hermes's environment/secret store.
3. Add a "post status to Slack" step to its existing reporting flow
   (same curl shape as above).

### Codex

No Slack path by design today — it works through the shared GitHub handoff
branch (`codex/staging-coordination`) and Quintin relays. If Codex ever needs
to post directly, give it the same webhook treatment as Hermes. Until then:
Muse mirrors Codex review findings into #agents when Quintin asks.

### Muse

Already connected via OAuth as Quintin. Posts appear under his name —
prefixed with the agent name (e.g. `*Muse* — …`) so attribution stays clear.

## Message conventions (all agents)

- Start with `*<Agent>* — ` so readers know who posted.
- Status updates: what changed, exact SHAs/links, test counts.
- Never post secrets, tokens, private customer data, or credentials.
- Nothing here authorizes sends/merges/deploys — those still need Quintin.

## Challenge assessment (honest)

The webhook itself is the easy 15 minutes. The real work is installing one
secret into each agent's runtime — and that requires hands on those runtimes:

- **OpenClaw:** likely minutes (bot works; probably just channel targeting).
  Needs whoever holds the VPS/OpenClaw config.
- **Hermes:** unknown effort — first need to find where it runs and whether
  it can make outbound HTTPS calls.
- **What this repo cannot do:** store the URLs, or reach into those runtimes.
  This document is the map, not the wiring.

## Checklist

- [ ] Webhook URL created for OpenClaw → installed in its runtime → test post seen
- [ ] Webhook URL created for Hermes → installed in its runtime → test post seen
- [ ] OpenClaw posting VPS diagnostic summaries to #agents
- [ ] Decide: does Codex need a webhook, or does the GitHub handoff suffice?
