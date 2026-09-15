// Run after starting the RIG, with TEST_INVITATION set to a client-room link.
// Uses the existing Automate Friday managed browser; creates one test comment.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
const invitation = process.env.TEST_INVITATION;
assert.ok(invitation, 'Set TEST_INVITATION to a local client invitation containing a reference.');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(invitation).hostname), 'Use a local test room.');
const cli = `${homedir()}/.local/bin/af-network`;
const browser = (...args) => {
  try { return execFileSync(cli, ['browser', 'run', ...args], { encoding: 'utf8', timeout: 30000 }); }
  catch { throw Error(`Managed browser ${args[0]} failed; inspect the test tab. Invitation details omitted.`); }
};
const selectedPage = () => browser('pages').match(/^\s*(\d+),[^\n]*,true\s*$/m)?.[1];
const previous = selectedPage();
let created;
try {
  browser('newpage', invitation);
  created = selectedPage();
  assert.ok(created && created !== previous, 'Expected a separate test tab.');
  const marker = `Comment regression ${Date.now()}`;
  const result = browser('eval', `async () => {
    const pause = () => new Promise(resolve => setTimeout(resolve, 100));
    let review;
    for (let i = 0; i < 100; i++) {
      review = document.querySelector('button[aria-label^="Review "]');
      if (review) break;
      await pause();
    }
    if (!review) throw Error('The invited test room needs at least one reference.');
    review.click();
    for (let i = 0; i < 30 && !document.querySelector('dialog[open] form'); i++) await pause();
    const form = document.querySelector('dialog[open] form');
    if (!form) throw Error('Reference feedback form did not open.');
    // Native autofill can change displayed values without updating React state.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(form.querySelector('input'), 'Browser regression');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(form.querySelector('textarea'), ${JSON.stringify(marker)});
    form.querySelector('button').click();
    for (let i = 0; i < 100; i++) {
      if ([...document.querySelectorAll('dialog .comments article')].some(node => node.textContent.includes(${JSON.stringify(marker)}))) return 'COMMENT_FORM_PASS';
      await pause();
    }
    throw Error('Displayed comment was not saved: ' + (document.querySelector('dialog [role="alert"]')?.textContent || 'no response'));
  }`);
  assert.ok(result.includes('COMMENT_FORM_PASS'), 'Comment did not persist through visible form submission.');
  console.log('PASS: visible autofilled values are saved through the client comment form.');
} finally {
  if (created && created !== previous) browser('closepage', created);
  if (previous) browser('selectpage', previous);
}
