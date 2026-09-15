# Reference Room — Independent Usability Review

Archived first-pass report. See `USABILITY.md` for the owner’s final disposition and follow-up coverage. Screenshot filenames refer to the private local review evidence directory, not deployed site assets. The original O-002 browser-limitation interpretation below was incorrect: assigning a synchronized FileList fixes the count.

**Reviewer:** Independent AI agent (not the implementation author)  
**Date:** 2026-09-15  
**Surfaces tested:** `http://localhost:5178` (dev fixture), `https://reference-room.jhaugen.chatgpt.site` (production)  
**Method:** Browser-based interaction via managed Chrome (AXI). No source code read. No direct API calls.  
**Tooling note:** AXI `upload` CLI command failed on file inputs; image uploads tested via browser-side DataTransfer/File assignment to the visible `<input type="file">` and standard UI submission. This is an automation tooling limitation, not a product defect.

---

## Critical Path Results

### 1. Landing page (desktop)
**PASS.** Clear value proposition ("Find the direction. Together."), two distinct CTAs (agency workspace vs client invitation), "How it works" 3-step flow, "For clients" section with invitation link input, FAQ accordion, footer with GitHub link. Good visual hierarchy.  
**Evidence:** `01-landing-desktop.png`, `02-landing-bottom.png`

### 2. Agency workspace — project view
**PASS.** Sidebar with studio branding, project list, studio settings. Main area: project header with brief, 4-tab navigation (Mood board, Review directions, Agent studio, Client dashboard), filter buttons (Everything/Images/Pinterest/Directions), "Add reference" and "Share with client" actions.  
**Evidence:** `03-agency-workspace.png`

### 3. Agent studio — copy prompt
**PASS.** Clear 3-step workflow (Start conversation → Bring designs back → Find the one). Prompt disclosure expands to show full structured prompt with project brief, references as JSON, feedback, reactions, and agent output format instructions. Context counts shown (2 references, 0 comments, 0 reactions).  
**Evidence:** `04-agent-studio.png`

### 4. Import HTML design via Agent studio
**PASS.** Import dialog offers two tabs: "Agent JSON" and "Single HTML". Single HTML tab has Direction name, Rationale, file picker, and paste-HTML fields. Pasted HTML imported successfully, auto-navigated to review deck.  
**Evidence:** `05-import-dialog.png`, `06-review-deck-imported.png`

### 5. Review deck — react and save to dashboard
**PASS.** Tinder-style deck with Pass/Skip/Love buttons. "Love" reaction persisted and auto-advanced to next card. Navigating back showed "Your reaction: love". "Save to client dashboard" button toggled to "Remove from dashboard". Client dashboard tab badge incremented from 1 → 2. Status toast confirmed save.  
**Evidence:** `06-review-deck-imported.png`, `07-client-dashboard.png`

### 6. Client invitation — accountless access
**PASS.** Opening the fixture invitation URL loaded the client workspace with correct role separation:
- **Hidden from client:** Agent studio tab, Add client button, Share with client button, Edit project brief
- **Client-specific:** "Client review room" label (vs "Agency workspace"), "Upload references" button (vs "Add reference")
- **Visible to client:** Mood board, Review directions, Client dashboard tabs; all directions and saved directions visible  
**Evidence:** `08-client-view.png`

### 7. Multi-file image upload with failure isolation
**PASS.** Batch upload of 3 files (2 valid PNGs + 1 invalid): valid images uploaded successfully and appeared on mood board, invalid file isolated with clear error ("The image contents do not match its file type."). Submit button dynamically updated count ("Upload 3 images" → "Upload 1 image"). Individual Remove buttons per file. File constraints clearly stated (12 images, PNG/JPG/WebP/GIF, 10 MB each).  
**Evidence:** `10-multi-file-selected.png`, `11-upload-partial-failure.png`

### 8. Persistence after refresh
**PASS.** Full page reload preserved: uploaded images (blob URLs), all directions, saved-direction badges, comment counts.

### 9. Client comment on direction
**PASS (after fix).** See defect F-001 below for the original failure. After the fix was synced, the exact original comment text submitted successfully.  
**Evidence:** `12-client-review-detail.png`, `17-comment-fix-verified.png`

### 10. Agent-to-review-to-dashboard loop (critical path)
**PASS.** Full loop tested: Agent studio → Copy prompt (structured JSON with references) → Import single HTML → Review deck → React (Love) → Save to client dashboard → Client dashboard shows saved direction with comment count. The imported direction rendered correctly in iframes throughout. Client dashboard header changed from "A WORK IN PROGRESS" to "THE SHARED DIRECTION" for contextual clarity.

### 11. Production landing
**PASS.** Fresh load of `https://reference-room.jhaugen.chatgpt.site/` matches the local build: same headline, nav bar, For clients section, FAQ, client invitation form. (Note: an earlier stale-tab observation showed an older version; this was corrected by a fresh navigation — the prior tab had been opened before the v3 deployment.)  
**Evidence:** `21-production-fresh-load.png` (fresh), `20-production-landing.png` (stale tab, pre-deployment)

### 12. Mobile layout (375×812)
**PASS.** Landing: responsive single-column, all nav items visible, readable type sizes. Workspace: sidebar collapses inline, 2-column card grid, tabs fit, Upload references button full-width. Project header and brief readable.  
**Evidence:** `15-mobile-landing.png`, `18-mobile-client-workspace.png`, `19-mobile-client-header.png`

### 13. Keyboard navigation
**PASS (basic).** Tab order on landing is logical: Home logo → How it works → For clients → Agency sign in → Create your agency workspace. Focus indicators present.

---

## Defects

### F-001: Comment submission sent empty body (FIXED)
**Severity:** High — client-facing feature broken  
**Status:** Fixed and verified in this review session  
**Reproduction:**
1. Open any direction review dialog as client
2. Fill "Your name" and "Your feedback" fields (both visually confirmed populated)
3. Click "Add comment"
4. **Observed:** Error "Check the required fields and text length." Feedback field cleared; name field retained.

**Network evidence:**
- Pre-submission DOM verification: textarea `.value` = 126 characters, `.validity.valueMissing` = false
- Request body sent: `{"designId":"...","author":"Sarah (Harbor)","body":""}` — body was empty string
- Server responded 400 with `{"error":"Check the required fields and text length."}`
- Successful request (shorter retry text, same session): body correctly populated, server returned 200

**Original failure text:** `"Love the calm feeling. The serif typography feels right for an architecture studio. Could we try a slightly warmer background?"`

**Evidence:** `13-comment-pre-submit.png` (fields populated before submit), `14-comment-failure-reproduced.png` (failure state with empty field and error)

**Fix verification:** After fix synced, the exact original text submitted successfully (reqid=398, status 200). Comment appeared with correct author, date, and body text.  
**Evidence:** `17-comment-fix-verified.png`

---

## Observations (non-blocking)

### O-001: Upload dialog error persists after removing the invalid file
After removing the invalid file from the upload list, the red error "The image contents do not match its file type." remained visible. Minor — the dialog is still functional and the error clears on close/reopen.

### O-002: Native file input shows stale count
After valid files are processed and removed from the list, the browser's native file input still shows "3 files" (the original selection count). This is a browser limitation (the native `<input type="file">` value cannot be programmatically reduced), not a product bug.

### O-003: Form field accessibility warning
Browser console: "A form field element should have an id or name attribute" (count: 4). Non-blocking but affects screen reader and testing tool compatibility.

---

## Untested Critical Paths

The following were **not tested** within this bounded review and must not be considered passed:

1. **New client creation and invitation sharing** — "Add client" button and "Share with client" flow were not exercised. The fixture used a pre-existing client with a pre-generated invitation.
2. **Client mobile upload and navigation** — Mobile viewport was tested for layout only. No upload, comment, or review interaction was tested at mobile width.
3. **Pinterest board and Web link reference types** — Only "Upload image" tab was tested. The "Pinterest board" and "Web link" tabs in the Add to mood board dialog were not exercised.
4. **Agency sign-in via ChatGPT OAuth** — Production sign-in path (`/signin-with-chatgpt`) was not tested (requires Jacob's browser session; out of scope).
5. **Studio settings / branding customization** — Studio settings button was visible but not clicked.
6. **Export project** — Button visible on Client dashboard but not exercised.
7. **Edit project brief** — Button visible but not exercised.
8. **Review directions tab (Tinder-style deck from tab)** — Tested only via Agent studio import auto-redirect. Direct tab navigation to the review deck was not separately tested.
9. **Keyboard navigation within workspace/dialogs** — Only landing page tab order was tested. Workspace keyboard accessibility (dialog trap, button focus, card navigation) was not tested.
10. **Screen reader / ARIA semantics** — Landmarks and roles appeared present in the accessibility tree but were not tested with an actual screen reader.
11. **Drag-and-drop image upload** — The upload area has a dashed-border drop zone visual but drag-and-drop was not tested.
12. **Second project ("Pinterest integration check")** — Only the Harbor project was tested.

---

## Screenshot Evidence Index

| File | Description |
|------|-------------|
| `01-landing-desktop.png` | Landing page hero, above fold |
| `02-landing-bottom.png` | Landing page FAQ + footer |
| `03-agency-workspace.png` | Agency workspace, Harbor project, Mood board tab |
| `04-agent-studio.png` | Agent studio tab, 3-step workflow |
| `05-import-dialog.png` | Import agent designs dialog |
| `06-review-deck-imported.png` | Review deck showing imported "Harbor coastal calm" |
| `07-client-dashboard.png` | Client dashboard with 2 saved directions |
| `08-client-view.png` | Client view via invitation (role separation) |
| `09-upload-dialog.png` | Upload dialog, empty state |
| `10-multi-file-selected.png` | Upload dialog with 3 files selected |
| `11-upload-partial-failure.png` | Upload dialog after partial failure (invalid.png rejected) |
| `12-client-review-detail.png` | Client review detail with comment form |
| `13-comment-pre-submit.png` | Comment form populated before submission (pre-fix) |
| `14-comment-failure-reproduced.png` | Comment failure reproduced — empty field + error |
| `15-mobile-landing.png` | Landing page at 375×812 |
| `16-mobile-landing-bottom.png` | Mobile landing bottom |
| `17-comment-fix-verified.png` | Comment success after fix |
| `18-mobile-client-workspace.png` | Mobile client workspace cards |
| `19-mobile-client-header.png` | Mobile client workspace header |
| `20-production-landing.png` | Production landing (stale tab — pre-deployment v2) |
| `21-production-fresh-load.png` | Production landing (fresh load — current v3) |
