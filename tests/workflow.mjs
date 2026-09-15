import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const user = `test-${crypto.randomUUID()}`;
async function call(path, body, identity = user, token = '') {
  const r = await fetch(`${origin}/api/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(identity ? { 'oai-authenticated-user-id': identity } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
assert.equal((await call('workspace', undefined, '')).status, 401);
assert.equal(
  (await call('agency', { name: 'Test Studio', accent: '#304ffe', logo: '' }))
    .status,
  200,
);
await call('clients', { name: 'Client One', brief: 'Quiet editorial design' });
await call('clients', { name: 'Client Two', brief: '' });
let w = (await call('workspace')).data;
assert.equal(w.clients.length, 2);
const c = w.clients.find((c) => c.name === 'Client One'),
  other = w.clients.find((c) => c.name === 'Client Two');
assert.equal(
  (
    await call('designs', {
      clientId: c.id,
      title: 'Reference',
      kind: 'link',
      url: 'https://example.com',
      notes: 'More space',
    })
  ).status,
  200,
);
assert.equal(
  (
    await call('designs', {
      clientId: c.id,
      title: 'Bad',
      url: 'javascript:alert(1)',
    })
  ).status,
  400,
);
assert.equal(
  (
    await call('designs', {
      clientId: c.id,
      directions: JSON.stringify({
        designs: [
          {
            title: 'Editorial',
            html: '<main><h1>Quiet direction</h1></main>',
            notes: 'Space and hierarchy',
          },
        ],
      }),
    })
  ).status,
  200,
);
w = (await call('workspace')).data;
const d = w.designs.find((d) => d.kind === 'html');
assert.ok(d);
const token = (await call('invite', { clientId: c.id })).data.token;
assert.equal(token.length, 64);
let guest = (await call('workspace', undefined, '', token)).data;
assert.equal(guest.clients.length, 1);
assert.equal(guest.clients[0].id, c.id);
assert.ok(!JSON.stringify(guest).includes('tokenHash'));
assert.equal(
  (
    await call(
      'comments',
      {
        designId: d.id,
        author: 'Client One',
        body: 'Love the type, avoid orange',
      },
      '',
      token,
    )
  ).status,
  200,
);
assert.equal(
  (await call('reaction', { designId: d.id, value: 'love' }, '', token)).status,
  200,
);
assert.equal(
  (await call('reaction', { designId: d.id, value: 'pass' }, '', token)).status,
  200,
);
assert.equal((await call('save', { designId: d.id, saved: true })).status, 200);
assert.equal(
  (await call('save', { designId: d.id, saved: false }, '', token)).status,
  403,
);
assert.equal(
  (await call('clients/' + other.id, { name: 'Hacked', brief: '' }, '', token))
    .status,
  403,
);
assert.equal(
  (
    await call(
      'designs',
      { clientId: other.id, title: 'No access', url: 'https://example.com' },
      'unrelated-agency',
    )
  ).status,
  404,
);
assert.equal(
  (
    await call(
      'comments',
      { designId: d.id, author: 'Other', body: 'Intrusion' },
      'unrelated-agency',
    )
  ).status,
  404,
);
assert.equal(
  (await call('files/' + d.id, undefined, 'unrelated-agency')).status,
  404,
);
w = (await call('workspace')).data;
assert.equal(w.comments[0].body, 'Love the type, avoid orange');
assert.equal(w.designs.find((x) => x.id === d.id).saved, 1);
assert.equal(w.reactions.length, 1);
assert.equal(w.reactions[0].value, 'pass');
const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
    'base64',
  ),
);
const form = new FormData();
form.set('clientId', c.id);
form.set('title', 'Uploaded PNG');
form.set('file', new Blob([png], { type: 'image/png' }), 'reference.png');
const uploaded = await fetch(`${origin}/api/upload`, {
  method: 'POST',
  headers: { 'oai-authenticated-user-id': user },
  body: form,
});
assert.equal(uploaded.status, 201);
const upload = await uploaded.json();
const file = await fetch(`${origin}/api/files/${upload.id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
assert.equal(file.status, 200);
assert.deepEqual(new Uint8Array(await file.arrayBuffer()), png);
assert.equal(
  (await call('files/' + upload.id, undefined, 'unrelated-agency')).status,
  404,
);
await call('invite', { clientId: c.id, revoke: true });
assert.equal((await call('workspace', undefined, '', token)).status, 401);
const cross = await fetch(`${origin}/api/agency`, {
  method: 'POST',
  headers: {
    Origin: 'https://evil.example',
    'Content-Type': 'application/json',
    'oai-authenticated-user-id': user,
  },
  body: JSON.stringify({ name: 'No', accent: '#000000' }),
});
assert.equal(cross.status, 403);
console.log(
  'PASS: agency/client isolation, reference and HTML import, comments, reaction replacement, saved dashboard, upload bytes, invitation revocation, and cross-origin write protection.',
);
