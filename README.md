# Reference Room

An MIT-licensed mood-board portal for design agencies and their clients.

[Open Reference Room](https://reference-room.jhaugen.chatgpt.site) · [Source](https://github.com/howagain/reference-room)
Original implementation inspired by [Taste](https://buildwithtaste.com/how-it-works)
and [mood-boarding](https://www.mood-boarding.com/).

## Workflow

1. Name and brand your agency. Create a client and write their project brief.
2. Upload design references or paste a Pinterest board. Public boards import up
   to 50 pins from Pinterest's widget feed; private/unavailable boards retain the
   source link and clearly report why images were not imported.
3. Share a client invitation. Clients enter without an account, upload up to 12
   images at once, add reference links, react, and comment within their own room.
4. Copy the Agent studio prompt into any agent. Discuss the references, attach
   uploaded images, and ask it to generate design directions.
5. Import its JSON response or a single HTML file. Review the HTML in the swipe
   deck, comment, and save chosen directions to the client dashboard.
6. Export the project context or copy the updated prompt to refine again.

## Run locally

Node 22.18+ and npm:

```sh
npm ci
npm run db:migrate
npm run dev
```

Open http://localhost:5173 for the landing page or `/workspace` for the agency
portal, then use the local sign-in link. The Sites development
plugin supplies a local test user only on loopback. It strips spoofed identity
headers. Product data lives in local D1/R2 emulation under `.wrangler/state`.

## Boot the RIG

```sh
docker compose up -d
# http://localhost:5178
docker compose logs -f app
docker compose stop
```

The devcontainer uses the same Compose service. The loopback-only container
preview supplies a local development agency; this bypass is excluded from builds. Dependencies and D1/R2 state are
separate named volumes. `docker compose down` retains them; deleting volumes
removes the stored data. This is a development RIG, not an internet-facing auth
proxy. The repository's RIG identity is declared in `rig.json`; in Automate Friday,
validate it with `node rig/bin/rig-wiki-identity.mjs moodboard --json`.

## Hosting and authentication

The hosted build runs on Cloudflare Workers with D1 and R2. Sites provisions the
bindings declared in `.openai/hosting.json`; schema migrations live in `drizzle`.
The agency owner is identified by the trusted Sites authentication dispatcher.
Client invitations contain a random bearer secret, stored only as a SHA-256 hash
on the server. Replacing or revoking an invitation invalidates earlier links.

The published portal permits external visitors. Agency workspaces require ChatGPT
sign-in; clients enter through their private invitation links. Hosting access and
board authorization are separate. A private Sites deployment is an owner preview. A separate self-hosted deployment must
provide a trusted identity proxy that strips visitor-provided
`oai-authenticated-user-*` headers and injects verified identity. Never expose
Wrangler's raw production-preview server directly to the internet. Custom domains
and a standalone public identity provider are not configured by this repository.

## Verify

```sh
npm run check
npm test
npm run build
npm run start -- --ip 127.0.0.1 --port 8787 --local
# another terminal, against this LOCAL raw Worker preview only:
npm run test:workflow
```

The workflow check creates synthetic test records with unique identities and
checks client isolation, comments, reaction replacement, saved designs, agency
and accountless client uploads, upload notes, invalid-image rejection, invitation
revocation, and cross-origin write rejection.

## Boundaries

- Agent integration is the requested copy/paste exchange, with actual feedback
  included. There is no simulated AI response or automatic design analysis.
- Imported HTML is sandboxed with scripts/forms disabled and a restrictive CSP.
- Pinterest's public widget feed is a bounded preview, not an OAuth-backed full
  board sync. Original pin and board URLs remain in each imported pin's notes.
- Project JSON includes reference metadata, comments and inline HTML; it does not
  bundle uploaded image bytes. Images persist in R2.
- An invitation represents one client reviewer; people sharing the same invitation
  also share the same reaction identity. Comments retain their entered name.

## Client access

The public landing page explains both entry paths. Agencies sign in with ChatGPT;
clients use a room-specific invitation URL and never need an account. Existing
root-path invitations redirect to `/workspace` while retaining their fragment.
Clients can contribute images, web links, and public Pinterest boards. Agency
branding, client administration, HTML imports, and final dashboard selections
remain agency-only.

Image batches upload sequentially. If a file fails, completed images remain saved
and are removed from the pending list; fix or remove the failed file to resume.
Notes are saved with each image. Invite secrets stay in the URL fragment and
API authorization header; the database stores only their hash.

### Browser regression

On an Automate Friday machine with the managed browser available, start the RIG,
create a test client with at least one reference, and provide its invitation:

```sh
TEST_INVITATION='http://localhost:5178/workspace#invite=YOUR_LOCAL_TEST_TOKEN' node tests/comment-browser.mjs
```

This creates a separate browser tab and a synthetic client comment. It verifies
that the visible form values are submitted even when native autofill has not
updated React state, then closes the test tab. Run it when another browser review
is not using the shared browser selection.

[Usability review and coverage limits](docs/USABILITY.md). For the native upload/error recovery check, leave a local invited client room open in managed Chrome and run `TEST_INVITATION='YOUR_OPEN_LOCAL_INVITATION_URL' node tests/upload-browser.mjs`. It creates one synthetic image.
