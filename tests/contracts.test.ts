import { test } from 'node:test';
import assert from 'node:assert/strict';
// Node's built-in TypeScript runner needs explicit extensions.
// @ts-ignore TS's bundler resolver does not emit these test files.
import {
  parseDirections,
  safeUrl,
  agentPrompt,
  sandboxHtml,
} from '../lib/contracts.ts';
test('agent round trip preserves feedback and rejects malformed artifacts', () => {
  const client = {
    id: 'c',
    name: 'Client A',
    brief: 'A calm booking service',
    createdAt: '2026-09-15',
  };
  const design = {
    id: 'd',
    clientId: 'c',
    title: 'Reference',
    kind: 'link',
    url: 'https://example.com/',
    fileKey: '',
    html: '',
    notes: 'Airy typography',
    saved: 1,
    createdAt: '2026-09-15',
  };
  const prompt = agentPrompt(
    client,
    [design],
    [
      {
        id: 'm',
        designId: 'd',
        author: 'Client',
        role: 'client',
        body: 'Avoid orange',
        createdAt: '2026-09-15',
      },
    ],
    [{ designId: 'd', actor: 'client:c', value: 'pass' }],
  );
  assert.match(prompt, /Avoid orange/);
  assert.match(prompt, /pass/);
  assert.match(prompt, /untrusted/);
  assert.match(prompt, /A calm booking service/);
  assert.deepEqual(
    parseDirections(
      '```json\n{"designs":[{"title":"A","html":"<main>Hello</main>"}]}\n```',
    ),
    [{ title: 'A', notes: '', html: '<main>Hello</main>' }],
  );
  for (const bad of [
    '{}',
    'null',
    '{"designs":[]}',
    '{"designs":[{"title":"A","html":""}]}',
  ])
    assert.throws(() => parseDirections(bad));
  assert.throws(() =>
    parseDirections(
      JSON.stringify({
        designs: [
          { title: 'A', html: '<main>' + 'x'.repeat(100001) + '</main>' },
        ],
      }),
    ),
  );
  assert.equal(
    safeUrl('https://www.pinterest.com/studio/editorial/', true),
    'https://www.pinterest.com/studio/editorial/',
  );
  for (const url of [
    'javascript:alert(1)',
    'http://pinterest.com/a/b/',
    'https://pinterest.com.evil.test/a/b/',
    'https://user:pass@pinterest.com/a/b/',
    'https://www.pinterest.com/pin/123/',
  ])
    assert.throws(() => safeUrl(url, true));
  assert.match(
    sandboxHtml('<script>fetch("/api")</script>'),
    /default-src 'none'/,
  );
  assert.match(sandboxHtml('<form></form>'), /form-action 'none'/);
});
// @ts-ignore Node test import.
import { pinterestPins, readBounded } from '../lib/imports.ts';
test('Pinterest imports accept only trusted image URLs and bound network bodies', async () => {
  const pin = {
    id: '123',
    description: 'Editorial',
    images: { '564x': { url: 'https://i.pinimg.com/564x/example.jpg' } },
  };
  assert.equal(
    pinterestPins({ status: 'success', data: { pins: [pin, pin] } }).length,
    1,
  );
  assert.equal(
    pinterestPins({
      status: 'success',
      data: {
        pins: [
          { ...pin, images: { '564x': { url: 'https://evil.test/a.jpg' } } },
        ],
      },
    }).length,
    0,
  );
  assert.throws(() => pinterestPins({ status: 'failure' }));
  assert.equal(
    new TextDecoder().decode(await readBounded(new Response('hello').body, 5)),
    'hello',
  );
  await assert.rejects(
    () => readBounded(new Response('too much').body, 3),
    /size limit/,
  );
});
