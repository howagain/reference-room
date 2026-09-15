import { InputError, safeUrl } from './contracts.ts';
export async function readBounded(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!body) return new Uint8Array();
  const reader = body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw Object.assign(
          new InputError('The upload or response exceeds the size limit.'),
          { status: 413 },
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export function pinterestPins(
  data: unknown,
): { title: string; url: string; notes: string }[] {
  const body = data as {
    status?: string;
    data?: {
      pins?: Array<{
        id?: string;
        description?: string;
        images?: Record<string, { url?: string }>;
      }>;
    };
  };
  if (body?.status !== 'success' || !Array.isArray(body.data?.pins))
    throw new InputError('Pinterest did not return public pins.');
  const seen = new Set<string>();
  // ponytail: the public widget feed returns up to 50 pins; OAuth pagination if full large-board sync is needed.
  return body.data.pins.slice(0, 50).flatMap((p) => {
    if (!p || typeof p.id !== 'string' || !/^\d+$/.test(p.id)) return [];
    const url = p.images?.['564x']?.url || p.images?.['236x']?.url;
    if (!url) return [];
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return [];
    }
    if (
      u.protocol !== 'https:' ||
      u.hostname !== 'i.pinimg.com' ||
      u.username ||
      u.password ||
      seen.has(url)
    )
      return [];
    seen.add(url);
    const description = typeof p.description === 'string' ? p.description : '';
    return [
      {
        title:
          description.trim().slice(0, 160) || `Pinterest reference ${p.id}`,
        url: u.href,
        notes:
          `Original pin: https://www.pinterest.com/pin/${p.id}/\n${description}`.slice(
            0,
            4000,
          ),
      },
    ];
  });
}
export async function fetchPinterest(boardUrl: string) {
  const board = new URL(safeUrl(boardUrl, true));
  const [owner, name] = board.pathname.split('/').filter(Boolean);
  const response = await fetch(
    `https://widgets.pinterest.com/v3/pidgets/boards/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pins/`,
    { redirect: 'manual', signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok)
    throw new InputError('Pinterest is unavailable or this board is private.');
  return pinterestPins(
    JSON.parse(
      new TextDecoder().decode(await readBounded(response.body, 1_000_000)),
    ),
  );
}
