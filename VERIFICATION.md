# Verification

## Proven on 2026-09-15

- Node 22.18 on air-m1: TypeScript check, two focused contract tests, and production build pass.
- The real compiled Worker passes `tests/workflow.mjs`, including accountless client uploads, persisted image notes, invalid image rejection, forbidden cross-client uploads/links, and agency-only HTML import: two client spaces, reference and HTML imports, persistent comments, reaction replacement, saved dashboard state, image byte round-trip, unauthorized access rejection, invitation revocation, and cross-origin write rejection.
- `docker compose up -d` starts the RIG on air-m1, bound to loopback port 5178. HTTP page and workspace API return 200. Local agency identity is available only in the development configuration.
- A real paste of `https://www.pinterest.com/pinterest/official-news/` through the RIG API saved its board reference and imported 46 pin images. The bounded feed can return at most 50 pins.
- RIG restart preserves the exact workspace JSON: one client and 47 references (board plus 46 pins). Ephemeral development locks clear while D1/R2 named volumes persist.
- Public MIT source is available at https://github.com/howagain/reference-room.
- The deployed portal at https://reference-room.jhaugen.chatgpt.site is public after explicit owner approval. Landing and workspace HTML return 200; anonymous workspace API, invalid invitation API, and forged identity-header requests return 401. Python urllib was blocked by Cloudflare (1010); curl and managed Chrome verified portal reachability.
- The agency sign-in link reaches ChatGPT login; the managed browser has no signed-in account.
- RIG wiki identity validator passes: `concepts/AgencyMoodboard`, connected to `VibeCodingDesignPatterns` and `ProgressiveAutomationLadder`.

## Current delivery

- Public landing at `/` with separate agency and client invitation entry paths; agency and invited client portal at `/workspace`.
- Legacy `/#invite=...` links redirect while preserving the invitation fragment.
- Public version 4 is deployed from source `0496c95327ad2133acc137d519155a8586dd97fa`. Root and workspace pages return 200; anonymous and forged-identity API requests return 401.
- Client batches retain successful uploads after a later failure, keep remaining files available for retry, and persist notes with each image.

## Reference findings

- Taste's how-it-works page describes reference capture, positive and negative reactions, and reusable agent guidance: https://buildwithtaste.com/how-it-works
- Alex Kehr's September 11 demo describes generating alternatives, choosing a direction, and refining before changing application code: https://x.com/alexkehr/status/2098511303430312439
- Mood-boarding's public demo and client bundle expose image selection, paired comparisons, comments and a review flow. Its signup form was inspected but not submitted: https://www.mood-boarding.com/s/demo

## Validation limits

- The compiled Worker integration verifies invitation scope and revocation locally. A valid invitation has not been exercised against production because the available browser is signed out. The hosting access change alone does not establish that authenticated round trip.
- Independent computer-use review covered 13 first-pass paths plus client creation and invitation generation. Its high-severity comment finding was fixed and independently rechecked. Browser instability limited follow-up coverage. Additional owner checks verified landing invitation entry, mobile upload/error recovery, native picker synchronization, direct review navigation and basic dialog Tab/Escape. See `docs/USABILITY.md` for exact attribution and remaining gaps.
- The optional WebMCP read tool exposes the selected client's Agent studio prompt in supporting browsers. No supported WebMCP validation context was available; registration and execution remain unverified there. The ordinary copy/paste workflow does not depend on it.
- Public Sites is the supported hosted path. Custom domains and standalone public identity-provider integration are outside this implementation; the RIG is local development.
- The X demo's post text was read; its video was not visually reviewed.

## Root-cause fixes found during checks

- A migrations-only Wrangler configuration was being merged with Vite's binding configuration, duplicating DB/R2 bindings and compatibility flags. It now uses a separate explicitly selected config.
- Wrangler's compiled preview defaults persistence relative to `dist/server`; the start script now selects the same project-local state path as migrations.
- Workers rejects Fetch's `redirect: error`; Pinterest requests now use `manual` and reject non-success statuses.
- Host and container development locks must not share a PID namespace. The RIG keeps its `.vinext` state on an ephemeral tmpfs mount so stale PIDs cannot survive a container restart.

- Independent browser review reproduced visible feedback being submitted as an empty body. The form now snapshots native FormData before updating saving state. The exact original 126-character comment passed independent recheck, and `tests/comment-browser.mjs` passes a native-autofill regression through the visible client form.
- Pending image uploads now synchronize the native file picker count, and removing a pending file clears its error. All form controls have names/IDs. The chooser uses a solid border to avoid suggesting unsupported drag-and-drop.
