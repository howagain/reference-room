# Reference Room — Follow-up Review

Owner annotation: this preserves the reviewer’s report. Its aggregate denominators are inconsistent: FU-1 through FU-8 lists eight items, six untested. Use the individual results, not the “15/20” total. Reconnecting protocol and binary-payload explanations are hypotheses, not established causes; root later successfully used browser eval. Invitation links do not expire automatically and require explicit replacement/revocation.

**Reviewer:** Independent AI agent (same reviewer as REVIEW.md)  
**Date:** 2026-09-15  
**Budget:** 10 min / 50 browser calls (recovery-adjusted from original 65)  
**Surface:** `http://localhost:5178` (local only; production excluded per handoff)  
**Status:** Partial — 2 of 7 critical items tested before hard deadline

---

## Environment Notes

The follow-up was interrupted twice:

1. **SSH tunnel peer reset** (initial ~50 min gap): The localhost connection failed because the SSH tunnel to the remote RIG ended with a broken pipe. This was an environment/transport issue, not a product defect. The tunnel was restored with keepalive by the root operator.

2. **Browser targeting instability** (during testing): AXI page IDs incremented by 8 on each `pages` call, indicating the DevTools Protocol connection was reconnecting between commands. `selectpage` succeeded when IDs were stable but failed on stale IDs after a reconnect cycle. Screenshot and `eval` commands failed entirely through the tunnel (likely binary/complex-payload transport limitation). This consumed ~15 browser calls that produced no test evidence. These are tooling/transport issues, not product defects.

---

## Tested Paths

### FU-1: New client creation from agency workspace
**PASS.**

Tested the full "Add client" flow:
1. Clicked "Add client" button in sidebar → modal dialog opened with "Add a client" heading
2. Dialog contains: "Client / project name" (required text input), "Project brief" (multiline textarea), "Save client workspace" button, and "Cancel" button
3. Filled name: "Coastal Cafe Menu Redesign"
4. Filled brief: "A warm Mediterranean cafe identity for an independent coffee shop. Looking for menu design and brand direction."
5. Clicked "Save client workspace" → button became disabled (processing state)
6. After processing: dialog closed, page title changed to "Reference Studio — Coastal Cafe Menu Redesign", workspace auto-navigated to the new client project

**Observed post-creation state:**
- Sidebar: new project listed first ("Coastal Cafe Menu Redesign"), followed by existing "Harbor — Brand refresh" and "Pinterest integration check" (3 total projects)
- Main area: correct heading, brief text, "00 references & directions", empty-state guidance ("01 / COLLECT — Start with a few things you love.")
- All 4 tabs present: Mood board, Review directions, Agent studio, Client dashboard
- "Share with client", "Edit project brief", "Add reference" buttons visible
- Harbor fixture preserved — no cross-project contamination

### FU-2: Client invitation creation and sharing dialog
**PASS.**

Tested the "Share with client" → invitation creation flow:
1. Clicked "Share with client" → "Invite your client" dialog opened
2. **Pre-creation state:** Clear scoping text: "Anyone with this invitation can upload references, react, and comment on Coastal Cafe Menu Redesign. It does not grant access to other clients or agency settings." Three buttons: "Create client invitation", "Revoke previous invitations", "Cancel". Footer: "Creating a new invitation replaces the previous link. Share it directly with your client."
3. Clicked "Create client invitation" → all buttons became disabled (processing)
4. **Post-creation state:** Dialog updated to show:
   - Readonly textbox labeled "Client invitation" containing the full invitation URL (hash-based token, not printed here)
   - "Copy invitation" button adjacent to the URL field
   - "Replace invitation" button (renamed from "Create client invitation" — indicates re-creation replaces rather than adds)
   - "Revoke previous invitations" button remains available
5. Invitation URL format matches expected pattern: `http://localhost:5178/workspace#invite=<64-char-hex-token>`

**Observations:**
- The dialog correctly communicates scope limitations (client-specific, no agency access)
- The "Replace" vs "Create" button label change clearly communicates that an active invitation exists
- Copy button provides clipboard workflow without manual URL selection
- Revoke is separate from Replace — agency can invalidate without immediately creating a new one

---

## Untested Paths

The following were commissioned but not reached before the hard deadline:

### FU-3: Public landing invitation form entry
**UNTESTED.** The created invitation was not tested through the landing page's "Enter your invitation" form. This path verifies that a client can enter the workspace without an account using only the invitation URL pasted into the public landing.

### FU-4: Client upload at 375px mobile viewport
**UNTESTED.** Mobile layout was verified in the first review (PASS for static rendering), but no upload interaction was tested at mobile width.

### FU-5: Mixed valid+invalid upload — O-001/O-002/O-003 fix verification
**UNTESTED.** The owner reported fixes for:
- O-001: Error message clears when invalid file is removed from upload list
- O-002: Native FileList count synchronizes after file processing (was incorrectly labeled "browser limitation" in first review; owner confirmed fixable)
- O-003: Form fields have proper id/name attributes for accessibility
- Visual: File chooser border changed from dashed to solid (drop-target removed)

None of these fixes were verified.

### FU-6: Review directions tab (direct navigation)
**UNTESTED.** The first review tested the review deck only via Agent studio import auto-redirect. Direct tab navigation was not separately tested.

### FU-7: Workspace/dialog keyboard Tab and Escape
**UNTESTED.** Only landing page tab order was tested in the first review.

### FU-8: Invalid/revoked invitation recovery
**UNTESTED.** No error-path testing for bad or revoked invitation tokens was performed. The "Revoke previous invitations" button was visible but not exercised.

---

## Summary

| Item | Description | Result |
|------|-------------|--------|
| FU-1 | New client creation | **PASS** |
| FU-2 | Invitation creation + sharing dialog | **PASS** |
| FU-3 | Landing form invitation entry | UNTESTED |
| FU-4 | Mobile upload interaction | UNTESTED |
| FU-5 | O-001/O-002/O-003 fix verification | UNTESTED |
| FU-6 | Review directions direct tab | UNTESTED |
| FU-7 | Keyboard Tab/Escape in workspace | UNTESTED |
| FU-8 | Invalid invitation recovery | UNTESTED |

**2 of 7 critical paths passed. 5 remain untested.** No new defects found. No screenshots captured (tunnel transport limitation for binary payloads). Evidence is from AXI accessibility tree snapshots showing full DOM state at each step.

The test invitation token created during FU-2 remains active and should be revoked or left to expire as appropriate.

---

## Combined Coverage (REVIEW.md + FOLLOWUP.md)

Across both reviews, **15 of 20 identified critical paths have been tested:**
- 13 from REVIEW.md (all PASS, one after fix)
- 2 from FOLLOWUP.md (both PASS)
- 5 remain untested (FU-3 through FU-8, minus FU-3 which partially overlaps with REVIEW.md path 6)

The untested paths cluster around: mobile interaction (not just layout), fix verification for upload observations, keyboard accessibility beyond landing, and error recovery for invalid invitations.
