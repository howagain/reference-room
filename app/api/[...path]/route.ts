import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { safeUrl, parseDirections } from '../../../lib/contracts';
import { readBounded, fetchPinterest } from '../../../lib/imports';

export const dynamic = 'force-dynamic';
const db = () => env.DB;
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const query = (sql: string, ...args: (string | number | null)[]) =>
  db()
    .prepare(sql)
    .bind(...args);
const all = async (sql: string, ...args: (string | number | null)[]) =>
  (await query(sql, ...args).all()).results;
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
function str(v: unknown, max = 4000, required = false): string {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
    fail('Check the required fields and text length.');
  return v.trim();
}
async function access(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (token) {
    if (!/^[a-f0-9]{64}$/.test(token)) fail('This invitation is invalid.', 401);
    const client = await query(
      'SELECT * FROM clients WHERE tokenHash = ?',
      await hash(token),
    ).first();
    if (!client) fail('This invitation has expired or been revoked.', 401);
    const agency = await query(
      'SELECT id, name, accent, logo FROM agencies WHERE id = ?',
      String(client.agencyId),
    ).first();
    return {
      role: 'client' as const,
      actor: `client:${client.id}`,
      agency,
      clients: [client],
    };
  }
  const h = await headers();
  // Self-hosters must strip incoming identity headers at their trusted auth proxy.
  const user =
    h.get('oai-authenticated-user-id') ||
    (env.LOCAL_DEV === '1' ? 'local-agency' : null);
  if (!user) fail('Sign in to open your agency workspace.', 401);
  const agency = await query(
    'SELECT id, name, accent, logo FROM agencies WHERE owner = ?',
    user,
  ).first();
  return {
    role: 'agency' as const,
    actor: user,
    agency,
    clients: agency
      ? await all(
          'SELECT * FROM clients WHERE agencyId = ? ORDER BY createdAt DESC',
          String(agency.id),
        )
      : [],
  };
}
async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.slice('/api/'.length).split('/');
    if (
      request.method !== 'GET' &&
      request.headers.get('origin') &&
      request.headers.get('origin') !== url.origin
    )
      fail('Cross-origin writes are not allowed.', 403);
    const ctx = await access(request);
    const agencyOnly = () => {
      if (ctx.role !== 'agency') fail('Only the agency can change this.', 403);
    };
    const clientFor = (clientId: unknown) => {
      const c = ctx.clients.find((c) => c.id === clientId);
      if (!c) fail('Client not found.', 404);
      return c;
    };
    const designFor = async (designId: string) => {
      const d = await query(
        'SELECT * FROM designs WHERE id = ?',
        designId,
      ).first();
      if (!d) fail('Design not found.', 404);
      clientFor(d.clientId);
      return d;
    };
    if (request.method === 'GET') {
      if (path[0] === 'workspace') {
        const clients = ctx.clients.map(({ tokenHash, agencyId, ...c }) => c);
        const ids = clients.map((c) => String(c.id));
        const placeholders = ids.map(() => '?').join(',');
        const designs = ids.length
          ? await all(
              `SELECT * FROM designs WHERE clientId IN (${placeholders}) ORDER BY createdAt DESC`,
              ...ids,
            )
          : [];
        const comments = ids.length
          ? await all(
              `SELECT c.* FROM comments c JOIN designs d ON d.id=c.designId WHERE d.clientId IN (${placeholders}) ORDER BY c.createdAt`,
              ...ids,
            )
          : [];
        const reactions = ids.length
          ? await all(
              `SELECT r.designId, r.actor, r.value FROM reactions r JOIN designs d ON d.id=r.designId WHERE d.clientId IN (${placeholders})`,
              ...ids,
            )
          : [];
        return Response.json(
          { ...ctx, clients, designs, comments, reactions },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
      if (path[0] === 'files') {
        const d = await designFor(path[1]);
        if (!d.fileKey) fail('File not found.', 404);
        const file = await env.FILES.get(String(d.fileKey));
        if (!file) fail('File not found.', 404);
        return new Response(file.body, {
          headers: {
            'Content-Type':
              file.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      fail('Not found.', 404);
    }
    if (request.method !== 'POST') fail('Method not allowed.', 405);
    if (path[0] === 'upload') {
      agencyOnly();
      if (Number(request.headers.get('content-length')) > 11_000_000)
        fail('Images must be under 10 MB.', 413);
      const form = await new Response(
        await readBounded(request.body, 11_000_000),
        {
          headers: {
            'Content-Type': request.headers.get('Content-Type') || '',
          },
        },
      ).formData();
      const c = clientFor(form.get('clientId'));
      const file = form.get('file');
      if (
        !(file instanceof File) ||
        !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
          file.type,
        ) ||
        file.size > 10_000_000 ||
        file.size === 0
      )
        fail('Upload a PNG, JPEG, WebP, or GIF under 10 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const valid =
        file.type === 'image/png'
          ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
          : file.type === 'image/jpeg'
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : file.type === 'image/gif'
              ? new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/)
              : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
                new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
      if (!valid) fail('The image contents do not match its file type.');
      const designId = id(),
        key = `${ctx.agency?.id}/${c.id}/${designId}`;
      await env.FILES.put(key, bytes, {
        httpMetadata: { contentType: file.type },
      });
      try {
        await query(
          'INSERT INTO designs (id,clientId,title,kind,fileKey,createdAt) VALUES (?,?,?,?,?,?)',
          designId,
          String(c.id),
          str(form.get('title') || file.name, 160, true),
          'image',
          key,
          now(),
        ).run();
      } catch (e) {
        await env.FILES.delete(key);
        throw e;
      }
      return Response.json({ id: designId }, { status: 201 });
    }
    const raw = new TextDecoder().decode(
      await readBounded(request.body, 1_500_000),
    );
    const b = JSON.parse(raw || '{}');
    if (path[0] === 'agency') {
      agencyOnly();
      const name = str(b.name, 100, true),
        accent = str(b.accent, 7, true),
        logo = b.logo ? safeUrl(str(b.logo, 2000)) : '';
      if (!/^#[0-9a-f]{6}$/i.test(accent)) fail('Choose a valid accent color.');
      await query(
        'INSERT INTO agencies (id,owner,name,accent,logo) VALUES (?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name, accent=excluded.accent, logo=excluded.logo',
        id(),
        ctx.actor,
        name,
        accent,
        logo,
      ).run();
    } else if (path[0] === 'clients') {
      agencyOnly();
      if (!ctx.agency) fail('Create your agency first.');
      if (path[1]) {
        clientFor(path[1]);
        await query(
          'UPDATE clients SET name=?, brief=? WHERE id=?',
          str(b.name, 120, true),
          str(b.brief, 8000),
          path[1],
        ).run();
      } else
        await query(
          'INSERT INTO clients (id,agencyId,name,brief,createdAt) VALUES (?,?,?,?,?)',
          id(),
          String(ctx.agency.id),
          str(b.name, 120, true),
          str(b.brief || '', 8000),
          now(),
        ).run();
    } else if (path[0] === 'invite') {
      agencyOnly();
      clientFor(b.clientId);
      const token = b.revoke
        ? null
        : Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('');
      await query(
        'UPDATE clients SET tokenHash=? WHERE id=?',
        token ? await hash(token) : null,
        b.clientId,
      ).run();
      return Response.json({ token });
    } else if (path[0] === 'designs') {
      agencyOnly();
      const c = clientFor(b.clientId);
      if (b.directions) {
        const directions = parseDirections(str(b.directions, 1_400_000, true));
        await db().batch(
          directions.map((d) =>
            query(
              'INSERT INTO designs (id,clientId,title,kind,html,notes,createdAt) VALUES (?,?,?,?,?,?,?)',
              id(),
              String(c.id),
              d.title,
              'html',
              d.html,
              d.notes,
              now(),
            ),
          ),
        );
      } else {
        const kind = b.kind === 'pinterest' ? 'pinterest' : 'link';
        const boardUrl = safeUrl(str(b.url, 2000, true), kind === 'pinterest');
        await query(
          'INSERT INTO designs (id,clientId,title,kind,url,notes,createdAt) VALUES (?,?,?,?,?,?,?)',
          id(),
          String(c.id),
          str(b.title, 160, true),
          kind,
          boardUrl,
          str(b.notes || ''),
          now(),
        ).run();
        if (kind === 'pinterest') {
          try {
            const pins = await fetchPinterest(boardUrl);
            const existing = new Set(
              (
                await all(
                  'SELECT url FROM designs WHERE clientId=?',
                  String(c.id),
                )
              ).map((d) => d.url),
            );
            const fresh = pins.filter((p) => !existing.has(p.url));
            if (fresh.length)
              await db().batch(
                fresh.map((p) =>
                  query(
                    'INSERT INTO designs (id,clientId,title,kind,url,notes,createdAt) VALUES (?,?,?,?,?,?,?)',
                    id(),
                    String(c.id),
                    p.title,
                    'pin',
                    p.url,
                    `Board: ${boardUrl}\n${p.notes}`.slice(0, 4000),
                    now(),
                  ),
                ),
              );
            return Response.json({
              ok: true,
              message: `Board saved. Imported ${fresh.length} public pins${pins.length >= 50 ? ' (first 50 pins)' : ''}.`,
            });
          } catch (error) {
            console.warn(
              'Pinterest import failed',
              error instanceof Error ? error.message : 'unknown',
            );
            return Response.json({
              ok: true,
              message:
                'Board link saved. Pinterest could not provide its public pins. You can upload images from the board instead.',
            });
          }
        }
      }
    } else if (path[0] === 'comments') {
      await designFor(b.designId);
      await query(
        'INSERT INTO comments (id,designId,author,role,body,createdAt) VALUES (?,?,?,?,?,?)',
        id(),
        b.designId,
        str(b.author, 80, true),
        ctx.role,
        str(b.body, 4000, true),
        now(),
      ).run();
    } else if (path[0] === 'reaction') {
      await designFor(b.designId);
      if (!['love', 'pass', 'skip'].includes(b.value))
        fail('Choose love, pass, or skip.');
      await query(
        'INSERT INTO reactions (id,designId,actor,value) VALUES (?,?,?,?) ON CONFLICT(designId,actor) DO UPDATE SET value=excluded.value',
        id(),
        b.designId,
        ctx.actor,
        b.value,
      ).run();
    } else if (path[0] === 'save') {
      agencyOnly();
      await designFor(b.designId);
      await query(
        'UPDATE designs SET saved=? WHERE id=?',
        b.saved ? 1 : 0,
        b.designId,
      ).run();
    } else fail('Not found.', 404);
    return Response.json({ ok: true });
  } catch (e) {
    const error = e as Error & { status?: number };
    if (error.status)
      return Response.json({ error: error.message }, { status: error.status });
    if (e instanceof SyntaxError || e instanceof TypeError)
      return Response.json(
        { error: 'The submitted data is invalid.' },
        { status: 400 },
      );
    console.error('Portal request failed:', error.name);
    return Response.json(
      { error: 'Could not save this change. Please try again.' },
      { status: 500 },
    );
  }
}
export const GET = handle;
export const POST = handle;
