# Verification and remaining work

## Proven on 2026-09-15

- Node 22.18 on air-m1: TypeScript check, two focused contract tests, and production build pass.
- The real compiled Worker passes `tests/workflow.mjs`: two client spaces, reference and HTML imports, persistent comments, reaction replacement, saved dashboard state, image byte round-trip, unauthorized access rejection, invitation revocation, and cross-origin write rejection.
- `docker compose up -d` starts the RIG on air-m1, bound to loopback port 5178. HTTP page and workspace API return 200. Local agency identity is available only in the development configuration.
- A real paste of `https://www.pinterest.com/pinterest/official-news/` through the RIG API saved its board reference and imported 46 pin images. The bounded feed can return at most 50 pins.
- RIG wiki identity validator passes: `concepts/AgencyMoodboard`, connected to `VibeCodingDesignPatterns` and `ProgressiveAutomationLadder`.

## Reference findings

- Taste's how-it-works page describes reference capture, positive and negative reactions, and reusable agent guidance: https://buildwithtaste.com/how-it-works
- Alex Kehr's September 11 demo describes generating alternatives, choosing a direction, and refining before changing application code: https://x.com/alexkehr/status/2098511303430312439
- Mood-boarding's public demo and client bundle expose image selection, paired comparisons, comments and a review flow. Its signup form was inspected but not submitted: https://www.mood-boarding.com/s/demo

## Remaining before goal completion

- Verify the deployed site and the human-facing agency/client round trip. Automated HTTP checks do not prove all UI interactions.
- Make external client invitations reachable through the hosting audience policy. An owner-only preview cannot be used by outside clients.
- Confirm standalone agency hosting/authentication or document and verify the supported public Sites deployment path; the local RIG is a development environment.
- Complete the full objective audit, including published open-source availability and the RIG restart/persistence check.

## Root-cause fixes found during checks

- A migrations-only Wrangler configuration was being merged with Vite's binding configuration, duplicating DB/R2 bindings and compatibility flags. It now uses a separate explicitly selected config.
- Wrangler's compiled preview defaults persistence relative to `dist/server`; the start script now selects the same project-local state path as migrations.
- Workers rejects Fetch's `redirect: error`; Pinterest requests now use `manual` and reject non-success statuses.
- Host and container development locks must not share a PID namespace. The RIG keeps its `.vinext` state in a separate volume.
