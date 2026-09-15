# Usability review — 2026-09-15

Reference Room is live at https://reference-room.jhaugen.chatgpt.site.
Agencies sign in; clients enter an agency invitation without creating an account.

## Independent evidence

A separate Claude Opus browser agent reviewed the application without reading its
source or calling its APIs directly. The initial report covers 13 paths: landing,
agency workspace, agent prompt disclosure, HTML import, review/reactions, saved
dashboard, accountless invitation access, multiple uploads with partial failure,
persistence, comments, mobile layout, basic landing keyboard order, and a fresh
production landing load. Follow-up also confirmed new client creation and creation
of a scoped invitation through the agency UI.

The initial report's “copy prompt” result establishes prompt disclosure and content;
it does not independently establish clipboard contents. File selection used browser
DataTransfer/File assignment to the visible native input after the automation
upload command failed. The normal application submit controls handled the uploads.

## Findings and disposition

| Finding | Change | Evidence |
| --- | --- | --- |
| **High: comment submitted an empty body despite visible text** | Snapshot native FormData before setting saving state | Independent recheck saved the exact original 126-character comment; runnable browser regression also passed |
| Error remained after removing a failed upload | Clear error when removing a pending file | Owner’s native-form browser regression passed; independent follow-up recheck incomplete |
| Native file count included already uploaded files | Synchronize native FileList with remaining files | Owner’s native-form browser regression passed; independent follow-up recheck incomplete |
| Four controls lacked names/IDs | Name comment, invitation and prompt controls | Upload form names checked in browser; remaining names source checked |
| Dashed chooser border suggested a drop target | Use a solid border around the native file chooser | Implemented; drag-and-drop is not advertised |

There are no unresolved high-severity findings from the tested paths. The original
report incorrectly called FileList synchronization a browser limitation; it is a
fixable application state issue. Browser-visible text differing from React state
was observed in the comment failure. Native autofill is covered by the regression;
the precise trigger of the original state divergence was not established.

## Additional owner checks

After the independent reviewer stood down, the implementation author verified:

- Landing invitation form opened the correct accountless client room.
- Native upload regression passed: one valid image survived a second invalid file, native FileList retained only the failed file, and removal cleared both picker and error.
- Browser viewport was 375 pixels wide; uploaded image appeared on the mobile board.
- Tab kept focus inside the upload dialog, and Escape closed it. This is a basic keyboard check, not an exhaustive focus-order audit.
- Direct Review directions tab rendered the HTML review deck.

`tests/upload-browser.mjs` is the runnable upload check. These checks are attributed to the owner, not counted as independent review coverage.

## Limits

The follow-up was interrupted first by an SSH tunnel peer reset (remote app stayed
healthy), then by repeated browser targeting failures and shifting tab IDs. These
are environment observations, not evidence that the deployed product failed.
The bounded review ended with these paths still unverified by the independent agent:

- Pasting a newly created invitation into the landing form and invitation revocation recovery.
- Mobile upload interactions and workspace/dialog keyboard focus/Escape.
- Web/Pinterest input controls, branding edits, brief editing, export and actual clipboard contents.
- The three minor UI fixes above, actual screen-reader use and optional WebMCP.
- Production agency sign-in and a valid production invitation round trip; the browser was signed out.

The compiled Worker workflow independently checks authorization, client uploads,
invalid image rejection, image notes/bytes, cross-client isolation, comments,
reactions, saved directions, invitation revocation and cross-origin rejection.
These checks do not substitute for the missing browser interactions. TypeScript,
two contract tests, production build and the comment browser regression passed.

## Reports

- [Initial independent report](INDEPENDENT-REVIEW.md)
- [Bounded follow-up report](INDEPENDENT-FOLLOWUP.md)

Original screenshots and raw review evidence remain in the local private review
directory. Invitation tokens are excluded from these published reports.
