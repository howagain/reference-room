// Select a local invited client room in the managed browser before running.
// Creates one synthetic image; verifies the native form and partial-failure UI.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
const cli = `${homedir()}/.local/bin/af-network`;
const invitation = process.env.TEST_INVITATION;
assert.ok(
  invitation,
  'Set TEST_INVITATION to an already-open local test room.',
);
const pages = execFileSync(cli, ['browser', 'run', 'pages'], {
  encoding: 'utf8',
});
const page = pages
  .split('\n')
  .find((line) => line.includes(',' + invitation + ','))
  ?.trim()
  .split(',')[0];
assert.ok(page, 'Open the local invited room first.');
execFileSync(cli, ['browser', 'run', 'selectpage', page], { stdio: 'pipe' });
const marker = `Upload regression ${Date.now()}`;
const result = execFileSync(
  `${homedir()}/.local/bin/af-network`,
  [
    'browser',
    'run',
    'eval',
    `async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname) || !location.hash.startsWith('#invite=')) throw Error('Select a local invited test room.');
  const pause = () => new Promise(resolve => setTimeout(resolve, 100));
  const wait = async (check) => { for (let i=0; i<100; i++) { if (check()) return; await pause(); } throw Error('UI condition timed out'); };
  const button = (label) => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label);
  await wait(() => button('Upload references'));
  window.__referenceRoomUploadCheck = {marker: ${JSON.stringify(marker)}, status:'running'};
  button('Upload references').click();
  await wait(() => document.querySelector('dialog[open] input[type=file]'));
  const input = document.querySelector('dialog[open] input[type=file]');
  const canvas = document.createElement('canvas'); canvas.width=8; canvas.height=8;
  canvas.getContext('2d').fillRect(0,0,8,8);
  const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const selection = new DataTransfer();
  selection.items.add(new File([png], ${JSON.stringify(marker + '.png')}, {type:'image/png'}));
  selection.items.add(new File(['invalid image contents'], 'invalid-regression.png', {type:'image/png'}));
  input.files=selection.files; input.dispatchEvent(new Event('change', {bubbles:true}));
  await wait(() => document.querySelectorAll('.upload-files li').length===2);
  input.form.requestSubmit();
  await wait(() => document.querySelector('dialog[open]')?.textContent.includes('The image contents do not match its file type.'));
  if (input.files.length!==1 || input.files[0].name!=='invalid-regression.png') throw Error('Native picker did not retain only failed file');
  document.querySelector('button[aria-label="Remove invalid-regression.png"]').click();
  await wait(() => input.files.length===0 && !document.querySelector('dialog[open]').textContent.includes('The image contents do not match its file type.'));
  if ([...document.querySelectorAll('dialog[open] input,dialog[open] textarea')].some(el=>!el.name&&!el.id)) throw Error('Unnamed form control');
  button('Cancel').click();
  await wait(() => !document.querySelector('dialog[open]'));
  if (!document.body.textContent.includes(${JSON.stringify(marker)})) throw Error('Successful image missing from mood board');
  window.__referenceRoomUploadCheck = {marker: ${JSON.stringify(marker)}, status:'passed',width:innerWidth,check:'successful upload preserved; native pending file count and removable error synchronized'};
  return 'UPLOAD_FORM_PASS';
}`,
  ],
  { encoding: 'utf8', timeout: 60000 },
);
assert.match(result, /UPLOAD_FORM_PASS/);
console.log(result);
