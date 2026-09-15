'use client';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type FormEvent,
} from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  X,
  Heart,
  MessageCircle,
  Bookmark,
  Grid2X2,
  Layers,
  Sparkles,
  Settings2,
  Link as LinkIcon,
  Upload,
  Copy,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  Users,
  SlidersHorizontal,
} from 'lucide-react';
import {
  agentPrompt,
  sandboxHtml,
  type Workspace,
  type Design,
} from '../lib/contracts';

type View = 'board' | 'review' | 'agent' | 'dashboard';
type Modal = 'agency' | 'client' | 'reference' | 'html' | 'share' | null;
const tabs = [
  { id: 'board', label: 'Mood board', icon: Grid2X2 },
  { id: 'review', label: 'Review directions', icon: Layers },
  { id: 'agent', label: 'Agent studio', icon: Sparkles },
  { id: 'dashboard', label: 'Client dashboard', icon: Bookmark },
] as const;
function ModalBox({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function download(name: string, content: string, type = 'application/json') {
  const u = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function ImagePreview({ design, token }: { design: Design; token: string }) {
  const [src, setSrc] = useState(''),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true,
      object = '';
    setSrc('');
    setFailed(false);
    const controller = new AbortController();
    fetch(`/api/files/${design.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.blob();
      })
      .then((b) => {
        object = URL.createObjectURL(b);
        if (alive) setSrc(object);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      controller.abort();
      if (object) URL.revokeObjectURL(object);
    };
  }, [design.id, token]);
  return failed ? (
    <p className="muted">Image could not load. Reopen to try again.</p>
  ) : src ? (
    <img src={src} alt={design.title} />
  ) : (
    <p className="muted">Loading image…</p>
  );
}
function Preview({
  design,
  token,
  large = false,
}: {
  design: Design;
  token: string;
  large?: boolean;
}) {
  if (design.kind === 'pin')
    return (
      <img
        src={design.url}
        alt={design.title}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  if (design.kind === 'image')
    return <ImagePreview design={design} token={token} />;
  if (design.kind === 'html')
    return (
      <iframe
        title={design.title}
        sandbox=""
        referrerPolicy="no-referrer"
        srcDoc={sandboxHtml(design.html)}
        tabIndex={large ? 0 : -1}
      />
    );
  return (
    <div
      className={`link-preview ${design.kind === 'pinterest' ? 'pinterest' : ''}`}
    >
      <span className="link-symbol">
        {design.kind === 'pinterest' ? 'P' : <LinkIcon size={32} />}
      </span>
      <strong>{design.title}</strong>
      <span>{new URL(design.url).hostname}</span>
      <a
        href={design.url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        Open {design.kind === 'pinterest' ? 'Pinterest board' : 'reference'}{' '}
        <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
export default function Portal() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [token, setToken] = useState(''),
    [ready, setReady] = useState(false),
    [unauthorized, setUnauthorized] = useState(false);
  const [clientId, setClientId] = useState(''),
    [view, setView] = useState<View>('board'),
    [modal, setModal] = useState<Modal>(null),
    [clientMode, setClientMode] = useState<'new' | 'edit'>('new'),
    [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState('all'),
    [reviewIndex, setReviewIndex] = useState(0),
    [invite, setInvite] = useState('');
  const [referenceKind, setReferenceKind] = useState('image'),
    [importMode, setImportMode] = useState('json'),
    [author, setAuthor] = useState(''),
    [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const touch = useRef<number | null>(null);
  useEffect(() => {
    if (!fileInput.current) return;
    const selection = new DataTransfer();
    files.forEach((file) => selection.items.add(file));
    fileInput.current.files = selection.files;
  }, [files, modal, referenceKind]);
  useEffect(() => {
    setToken(new URLSearchParams(location.hash.slice(1)).get('invite') || '');
    setReady(true);
  }, []);
  async function api<T = Record<string, unknown>>(
    path: string,
    body?: unknown,
  ) {
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    if (body && !(body instanceof FormData))
      headers['Content-Type'] = 'application/json';
    const response = await fetch(`/api/${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      if (response.status === 401) setUnauthorized(true);
      throw Error(
        typeof data.error === 'string' ? data.error : 'Something went wrong.',
      );
    }
    return data as T;
  }
  async function refresh() {
    const w = await api<Workspace>('workspace');
    setWorkspace(w);
    setUnauthorized(false);
    setClientId((current) =>
      w.clients.some((c) => c.id === current)
        ? current
        : w.clients[0]?.id || '',
    );
  }
  useEffect(() => {
    if (ready) refresh().catch((e) => setError(e.message));
  }, [ready, token]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function mutate(path: string, body: unknown, message?: string) {
    const result = await api(path, body);
    await refresh();
    if (typeof result.message === 'string') setNotice(result.message);
    else if (message) setNotice(message);
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied to clipboard.');
    } catch {
      setError('Clipboard unavailable. Select and copy the text below.');
    }
  }
  const agency = workspace?.agency,
    isAgency = workspace?.role === 'agency',
    client = workspace?.clients.find((c) => c.id === clientId);
  const designs =
      workspace?.designs.filter((d) => d.clientId === clientId) || [],
    directions = designs.filter((d) => d.kind === 'html'),
    saved = designs.filter((d) => d.saved),
    selected = workspace?.designs.find((d) => d.id === detail);
  const review = directions[reviewIndex % directions.length];
  const feedback =
    workspace?.comments.filter((c) =>
      designs.some((d) => d.id === c.designId),
    ) || [];
  const votes =
    workspace?.reactions.filter((r) =>
      designs.some((d) => d.id === r.designId),
    ) || [];
  const prompt = client ? agentPrompt(client, designs, feedback, votes) : '';
  const agentBrief = useRef({ clientId: '', prompt: '' });
  useEffect(() => {
    agentBrief.current = {
      clientId: !unauthorized && client ? client.id : '',
      prompt: !unauthorized ? prompt : '',
    };
  }, [client?.id, prompt, unauthorized]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool(
            tool: {
              name: string;
              description: string;
              inputSchema: object;
              annotations: {
                readOnlyHint: boolean;
                untrustedContentHint: boolean;
              };
              execute(input: unknown): unknown;
            },
            options: { signal: AbortSignal },
          ): void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'get_selected_client_design_brief',
            description:
              'Read the selected client’s design brief, references, comments, and reactions as the same prompt shown in Agent studio.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw Error('Provide an empty object.');
              if (!agentBrief.current.clientId || !agentBrief.current.prompt)
                throw Error('Open an authorized client room first.');
              return { ...agentBrief.current };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => console.warn('Agent tool registration unavailable.'));
    } catch {
      console.warn('Agent tool registration unavailable.');
    }
    return () => lifecycle.abort();
  }, []);
  const style = { '--accent': agency?.accent || '#354cff' } as CSSProperties;
  useEffect(() => {
    if (agency)
      document.title = `${agency.name} — ${client?.name || 'Client workspace'}`;
  }, [agency?.name, client?.name]);
  const close = () => {
    setModal(null);
    setInvite('');
    setFiles([]);
    setError('');
  };
  function form(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    return new FormData(e.currentTarget);
  }
  async function react(designId: string, value: string, advance = false) {
    await mutate('reaction', { designId, value });
    if (advance) setReviewIndex((i) => (i + 1) % directions.length);
  }
  const card = (d: Design) => (
    <article className="design-card" key={d.id}>
      <div className={`preview ${d.kind}`}>
        <Preview design={d} token={token} />
        {d.saved > 0 && (
          <span className="saved-tag">
            <Bookmark size={12} /> Saved direction
          </span>
        )}
        <button
          className="preview-open"
          onClick={() => setDetail(d.id)}
          aria-label={`Review ${d.title}`}
        />
      </div>
      <div className="card-caption">
        <button className="text-button" onClick={() => setDetail(d.id)}>
          <strong>{d.title}</strong>
          <small>
            {d.kind === 'html'
              ? 'HTML direction'
              : d.kind === 'pinterest'
                ? 'Pinterest board'
                : d.kind === 'image'
                  ? 'Uploaded reference'
                  : d.kind === 'pin'
                    ? 'Pinterest pin'
                    : 'Web reference'}
          </small>
        </button>
        <span className="card-count">
          <MessageCircle size={14} />
          {workspace?.comments.filter((c) => c.designId === d.id).length}
        </span>
      </div>
    </article>
  );
  if (unauthorized)
    return (
      <main className="welcome" style={style}>
        <a href="/" className="wordmark">
          <span className="mark">rr</span>Reference Room
        </a>
        <div className="welcome-content">
          <h1>
            {token
              ? 'This invitation is unavailable.'
              : 'Your agency workspace'}
          </h1>
          {token ? (
            <>
              <p role="alert">{error}</p>
              <p>
                Ask your agency for a new invitation link. You don’t need to
                create an account.
              </p>
              <a className="button" href="/#client-access">
                Use a different invitation
              </a>
            </>
          ) : (
            <>
              <p>
                Sign in with ChatGPT to create or open your agency. Invited
                clients use their private link instead.
              </p>
              <a
                className="button primary"
                href="/signin-with-chatgpt?return_to=%2Fworkspace"
                target="_top"
              >
                Continue with ChatGPT <ArrowRight size={18} />
              </a>
              <p>
                <a href="/#client-access">I have a client invitation</a>
              </p>
            </>
          )}
        </div>
      </main>
    );
  if (!workspace)
    return (
      <main className="welcome">
        <div className="wordmark">
          <span className="mark">rr</span>Reference Room
        </div>
        <p role="status">{error || 'Opening your workspace…'}</p>
        {error && <button onClick={() => run(refresh)}>Try again</button>}
      </main>
    );
  if (!agency)
    return (
      <main className="welcome" style={style}>
        <div className="wordmark">
          <span className="mark">rr</span>Reference Room
        </div>
        <div className="onboarding">
          <section>
            <p className="eyebrow">YOUR STUDIO. YOUR POINT OF VIEW.</p>
            <h1>
              A room for
              <br />
              the right direction.
            </h1>
            <p>
              Give clients a place to collect references, share their reactions,
              and shape the work with you.
            </p>
            <div className="process">
              <span>01 Collect</span>
              <span>02 Discuss</span>
              <span>03 Create</span>
            </div>
          </section>
          <form
            className="setup-form"
            onSubmit={(e) => {
              const f = form(e);
              run(async () => {
                await mutate('agency', {
                  name: f.get('name'),
                  accent: f.get('accent'),
                  logo: '',
                });
              });
            }}
          >
            <h2>Make it your studio</h2>
            <label>
              Agency name
              <input
                name="name"
                placeholder="Your design studio"
                required
                maxLength={100}
              />
            </label>
            <label>
              Brand accent
              <input type="color" name="accent" defaultValue="#354cff" />
            </label>
            <button className="primary" disabled={busy}>
              Create workspace <ArrowRight size={18} />
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </div>
      </main>
    );
  return (
    <div className="shell" style={style}>
      <aside className="sidebar">
        <a
          href={token ? `/workspace#invite=${token}` : '/workspace'}
          className="wordmark"
        >
          {agency.logo ? (
            <img src={agency.logo} alt="" />
          ) : (
            <span className="mark">
              {agency.name.slice(0, 2).toLowerCase()}
            </span>
          )}
          <span>
            {agency.name}
            <small>CLIENT WORKSPACE</small>
          </span>
        </a>
        <div className="sidebar-label">
          PROJECTS{' '}
          {isAgency && (
            <button
              className="icon"
              onClick={() => {
                setClientMode('new');
                setModal('client');
              }}
              aria-label="Add client"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        <nav className="clients">
          {workspace.clients.map((c) => (
            <button
              key={c.id}
              className={c.id === clientId ? 'active' : ''}
              onClick={() => {
                setClientId(c.id);
                setReviewIndex(0);
                setFilter('all');
              }}
            >
              <span className="client-dot" />
              {c.name}
              <ChevronRight size={14} />
            </button>
          ))}
          {!workspace.clients.length && (
            <p className="muted">Your clients will appear here.</p>
          )}
        </nav>
        <div className="sidebar-bottom">
          {isAgency && (
            <button onClick={() => setModal('agency')}>
              <Settings2 size={17} /> Studio settings
            </button>
          )}
          <span className="tiny">
            {isAgency ? 'Agency workspace' : 'Client review room'}
          </span>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <span>
            <span className="muted">Workspace</span>
            <span className="slash">/</span>
            {client?.name || 'Clients'}
          </span>
          <div className="top-actions">
            <span className="live-dot" />
            {busy ? 'Saving…' : 'Shared workspace'}
            {isAgency && client && (
              <button onClick={() => setModal('share')}>
                <Users size={16} /> Share with client
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="banner error" role="alert">
            {error}
            <button
              className="icon"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="banner" role="status">
            <span>
              <Check size={16} /> {notice}
            </span>
            <button
              className="icon"
              onClick={() => setNotice('')}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {!client ? (
          <section className="empty-workspace">
            <p className="eyebrow">FIRST, MAKE SOME ROOM</p>
            <h1>
              Your next project
              <br />
              starts here.
            </h1>
            <p>
              Create a client workspace for references, feedback, and the
              directions you decide to keep.
            </p>
            {isAgency && (
              <button
                className="primary"
                onClick={() => {
                  setClientMode('new');
                  setModal('client');
                }}
              >
                <Plus size={18} /> Add your first client
              </button>
            )}
          </section>
        ) : (
          <>
            <section className="project-heading">
              <div>
                <p className="eyebrow">
                  {view === 'dashboard'
                    ? 'THE SHARED DIRECTION'
                    : 'A WORK IN PROGRESS'}
                </p>
                <h1>
                  {client.name}
                  <span className="heading-dot">.</span>
                </h1>
                <p>
                  {client.brief || 'A shared space to find what feels right.'}
                </p>
              </div>
              <div className="project-actions">
                {isAgency && (
                  <button
                    className="icon"
                    onClick={() => {
                      setClientMode('edit');
                      setModal('client');
                    }}
                    aria-label="Edit project brief"
                  >
                    <SlidersHorizontal size={19} />
                  </button>
                )}
                <span className="project-total">
                  <strong>{designs.length.toString().padStart(2, '0')}</strong>{' '}
                  references & directions
                </span>
              </div>
            </section>
            <nav className="tabs" aria-label="Project views">
              {tabs
                .filter((t) => isAgency || t.id !== 'agent')
                .map((t) => (
                  <button
                    key={t.id}
                    className={view === t.id ? 'active' : ''}
                    aria-current={view === t.id ? 'page' : undefined}
                    onClick={() => setView(t.id)}
                  >
                    <t.icon size={17} />
                    {t.label}
                    {t.id === 'dashboard' && saved.length > 0 && (
                      <span>{saved.length}</span>
                    )}
                  </button>
                ))}
            </nav>
            {view === 'board' && (
              <section className="board-section">
                <div className="section-toolbar">
                  <div className="filters">
                    {[
                      ['all', 'Everything'],
                      ['image', 'Images'],
                      ['pinterest', 'Pinterest'],
                      ['html', 'Directions'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={filter === value ? 'active' : ''}
                        aria-pressed={filter === value}
                        onClick={() => setFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    className="primary"
                    onClick={() => {
                      setFilter('all');
                      setModal('reference');
                    }}
                  >
                    <Upload size={17} />{' '}
                    {isAgency ? 'Add reference' : 'Upload references'}
                  </button>
                </div>
                <div className="design-grid">
                  {designs
                    .filter(
                      (d) =>
                        filter === 'all' ||
                        d.kind === filter ||
                        (filter === 'pinterest' && d.kind === 'pin'),
                    )
                    .map(card)}
                  {
                    <button
                      className="add-tile"
                      onClick={() => setModal('reference')}
                    >
                      <span>
                        <Plus size={24} />
                      </span>
                      <strong>Add something that speaks to you</strong>
                      <small>Upload an image or paste a link</small>
                    </button>
                  }
                </div>
                {!designs.length && (
                  <div className="board-note">
                    <span>01 / COLLECT</span>
                    <p>
                      Start with a few things you love.
                      <br />
                      <strong>
                        A screenshot, a Pinterest board, an unexpected detail.
                      </strong>
                    </p>
                  </div>
                )}
              </section>
            )}
            {view === 'review' && (
              <section className="review-section">
                {review ? (
                  <>
                    <div className="section-toolbar">
                      <div>
                        <h2>Trust your first reaction.</h2>
                        <p className="muted">
                          Love it, pass, or come back to it. Then tell us why.
                        </p>
                      </div>
                      <span className="counter">
                        {(reviewIndex % directions.length) + 1} /{' '}
                        {directions.length}
                      </span>
                    </div>
                    <div className="review-layout">
                      <div
                        className="review-canvas"
                        onTouchStart={(e) => {
                          touch.current = e.touches[0].clientX;
                        }}
                        onTouchEnd={(e) => {
                          if (touch.current === null || busy) return;
                          const delta =
                            e.changedTouches[0].clientX - touch.current;
                          touch.current = null;
                          if (Math.abs(delta) > 90)
                            run(() =>
                              react(
                                review.id,
                                delta > 0 ? 'love' : 'pass',
                                true,
                              ),
                            );
                        }}
                      >
                        <Preview design={review} token={token} large />
                      </div>
                      <aside className="review-info">
                        <p className="eyebrow">
                          DIRECTION{' '}
                          {((reviewIndex % directions.length) + 1)
                            .toString()
                            .padStart(2, '0')}
                        </p>
                        <h2>{review.title}</h2>
                        <p>{review.notes}</p>
                        <p className="muted">
                          Your reaction:{' '}
                          {votes.find(
                            (r) =>
                              r.designId === review.id &&
                              r.actor === workspace.actor,
                          )?.value || 'Not reviewed'}
                        </p>
                        <div className="reaction-buttons">
                          <button
                            disabled={busy}
                            onClick={() =>
                              run(() => react(review.id, 'pass', true))
                            }
                          >
                            <X />
                            Pass
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              run(() => react(review.id, 'skip', true))
                            }
                          >
                            Skip
                            <ArrowRight />
                          </button>
                          <button
                            className="love"
                            disabled={busy}
                            onClick={() =>
                              run(() => react(review.id, 'love', true))
                            }
                          >
                            <Heart />
                            Love
                          </button>
                        </div>
                        <button onClick={() => setDetail(review.id)}>
                          <MessageCircle size={17} /> Discuss this direction
                        </button>
                        {isAgency && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                mutate(
                                  'save',
                                  { designId: review.id, saved: !review.saved },
                                  review.saved
                                    ? 'Removed from dashboard.'
                                    : 'Saved to the client dashboard.',
                                ),
                              )
                            }
                          >
                            <Bookmark size={17} />
                            {review.saved
                              ? 'Remove from dashboard'
                              : 'Save to client dashboard'}
                          </button>
                        )}
                        <div className="review-navigation">
                          <button
                            className="icon"
                            aria-label="Previous direction"
                            onClick={() =>
                              setReviewIndex(
                                (i) =>
                                  (i + directions.length - 1) %
                                  directions.length,
                              )
                            }
                          >
                            <ChevronLeft />
                          </button>
                          <button
                            className="icon"
                            aria-label="Next direction"
                            onClick={() =>
                              setReviewIndex((i) => (i + 1) % directions.length)
                            }
                          >
                            <ChevronRight />
                          </button>
                        </div>
                      </aside>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <Layers size={32} />
                    <h2>Something to react to.</h2>
                    <p>
                      {isAgency
                        ? 'Import HTML designs in Agent studio to start reviewing.'
                        : 'Your agency will add designs here for your feedback. You can upload references to the mood board while you wait.'}
                    </p>
                    {isAgency && (
                      <button
                        className="primary"
                        onClick={() => setView('agent')}
                      >
                        Open agent studio <ArrowRight size={17} />
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}
            {view === 'agent' && (
              <section className="agent-section">
                <div className="agent-intro">
                  <p className="eyebrow">YOUR AGENT, WITH CONTEXT</p>
                  <h2>
                    Turn “I like this”
                    <br />
                    into a direction.
                  </h2>
                  <p>
                    The prompt carries this client's brief, references,
                    reactions, and comments. Use it with your preferred agent,
                    then bring the work back.
                  </p>
                  <div className="context-counts">
                    <span>
                      <strong>{designs.length}</strong> references
                    </span>
                    <span>
                      <strong>{feedback.length}</strong> comments
                    </span>
                    <span>
                      <strong>{votes.length}</strong> reactions
                    </span>
                  </div>
                </div>
                <div className="agent-steps">
                  <article>
                    <span className="step-number">01</span>
                    <h3>Start the conversation</h3>
                    <p>
                      Copy the brief into your agent. Attach uploaded reference
                      images when asked. Discuss what to keep and what to avoid.
                    </p>
                    <button className="primary" onClick={() => copy(prompt)}>
                      <Copy size={16} /> Copy agent prompt
                    </button>
                    <details>
                      <summary>Read the prompt</summary>
                      <textarea
                        name="agentPrompt"
                        aria-label="Agent prompt"
                        readOnly
                        value={prompt}
                        rows={12}
                      />
                    </details>
                  </article>
                  <article>
                    <span className="step-number">02</span>
                    <h3>Bring the designs back</h3>
                    <p>
                      Ask your agent to generate HTML directions. Paste its JSON
                      response or save one HTML file here.
                    </p>
                    {isAgency && (
                      <button onClick={() => setModal('html')}>
                        <Plus size={17} /> Import agent designs
                      </button>
                    )}
                  </article>
                  <article>
                    <span className="step-number">03</span>
                    <h3>Find the one to move forward</h3>
                    <p>
                      Review each direction, add feedback, and save the
                      favorites to the client dashboard. Copy an updated prompt
                      to refine again.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setView('review')}
                    >
                      Review {directions.length} directions{' '}
                      <ArrowRight size={17} />
                    </button>
                  </article>
                </div>
              </section>
            )}
            {view === 'dashboard' && (
              <section className="dashboard-section">
                <div className="section-toolbar">
                  <div>
                    <h2>A direction worth keeping.</h2>
                    <p className="muted">
                      Selected references and designs for {client.name}.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      download(
                        `${client.name}-design-brief.json`,
                        JSON.stringify(
                          {
                            client,
                            agency,
                            designs,
                            comments: feedback,
                            reactions: votes,
                          },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    <Download size={16} /> Export project
                  </button>
                </div>
                <div className="design-grid">{saved.map(card)}</div>
                {!saved.length && (
                  <div className="empty-state">
                    <Bookmark size={30} />
                    <h2>The shortlist starts with a save.</h2>
                    <p>
                      {isAgency
                        ? 'Open a reference or review a direction, then save it here for your client.'
                        : 'Your agency will save the selected direction here. Your reactions and comments help shape it.'}
                    </p>
                    <button onClick={() => setView('board')}>
                      Explore the mood board <ArrowRight size={17} />
                    </button>
                  </div>
                )}
                <div className="feedback-summary">
                  <h3>
                    The conversation so far <span>{feedback.length}</span>
                  </h3>
                  {feedback
                    .slice(-6)
                    .reverse()
                    .map((c) => (
                      <button
                        key={c.id}
                        className="feedback-row"
                        onClick={() => setDetail(c.designId)}
                      >
                        <span className="avatar">{c.author.slice(0, 1)}</span>
                        <span>
                          <strong>
                            {c.author}{' '}
                            <small>
                              {designs.find((d) => d.id === c.designId)?.title}
                            </small>
                          </strong>
                          <p>{c.body}</p>
                        </span>
                        <ArrowUpRight size={18} />
                      </button>
                    ))}
                  {!feedback.length && (
                    <p className="muted">
                      Comments on your references and directions will appear
                      here.
                    </p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
        <footer className="workspace-footer">
          <span>A shared point of view.</span>
          <span>{agency.name}</span>
        </footer>
      </main>
      {modal && (
        <ModalBox
          title={
            modal === 'agency'
              ? 'Your studio, your identity'
              : modal === 'client'
                ? client
                  ? clientMode === 'new'
                    ? 'Add a client'
                    : 'Project details'
                  : 'Add a client'
                : modal === 'reference'
                  ? 'Add to the mood board'
                  : modal === 'html'
                    ? 'Import agent designs'
                    : 'Invite your client'
          }
          close={() => {
            if (!busy) close();
          }}
        >
          {modal === 'agency' && (
            <form
              onSubmit={(e) => {
                const f = form(e);
                run(async () => {
                  await mutate(
                    'agency',
                    Object.fromEntries(f),
                    'Studio branding updated.',
                  );
                  close();
                });
              }}
            >
              <label>
                Agency name
                <input
                  name="name"
                  defaultValue={agency.name}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Accent color
                <input
                  type="color"
                  name="accent"
                  defaultValue={agency.accent}
                />
              </label>
              <label>
                Logo image URL
                <input
                  name="logo"
                  type="url"
                  defaultValue={agency.logo}
                  placeholder="https://your-studio.com/logo.png"
                />
              </label>
              <p className="muted">
                Your name, logo, and accent appear in every client room.
              </p>
              <button className="primary" disabled={busy}>
                Save studio settings
              </button>
            </form>
          )}
          {modal === 'client' && (
            <form
              onSubmit={(e) => {
                const f = form(e);
                run(async () => {
                  const adding = clientMode === 'new';
                  const result = await api(
                    adding ? 'clients' : `clients/${clientId}`,
                    {
                      name: f.get('name'),
                      brief: f.get('brief'),
                    },
                  );
                  await refresh();
                  if (adding && typeof result.id === 'string')
                    setClientId(result.id);
                  setView('board');
                  setFilter('all');
                  close();
                });
              }}
            >
              <label>
                Client / project name
                <input
                  name="name"
                  defaultValue={clientMode === 'edit' ? client?.name : ''}
                  required
                  maxLength={120}
                  placeholder="Acme — New brand direction"
                />
              </label>
              <label>
                Project brief
                <textarea
                  name="brief"
                  defaultValue={clientMode === 'edit' ? client?.brief : ''}
                  maxLength={8000}
                  rows={5}
                  placeholder="What are we making? Who is it for? What should it feel like?"
                />
              </label>
              <button className="primary" disabled={busy}>
                Save client workspace
              </button>
            </form>
          )}
          {modal === 'reference' && (
            <form
              onSubmit={(e) => {
                const f = form(e);
                run(async () => {
                  if (referenceKind === 'image') {
                    if (!files.length)
                      throw Error('Choose at least one image.');
                    let completed = 0;
                    try {
                      for (const file of files) {
                        setUploadProgress(
                          `Uploading ${completed + 1} of ${files.length}: ${file.name}`,
                        );
                        const data = new FormData();
                        data.set('clientId', clientId);
                        data.set('file', file);
                        data.set(
                          'title',
                          files.length === 1 && f.get('title')
                            ? String(f.get('title'))
                            : file.name,
                        );
                        data.set('notes', String(f.get('notes') || ''));
                        await api('upload', data);
                        completed++;
                        setFiles((pending) =>
                          pending.filter((item) => item !== file),
                        );
                      }
                      setNotice(
                        `${completed} ${completed === 1 ? 'image' : 'images'} added to the mood board.`,
                      );
                    } finally {
                      setUploadProgress('');
                      await refresh();
                    }
                  } else
                    await mutate(
                      'designs',
                      {
                        clientId,
                        title: f.get('title'),
                        kind: referenceKind,
                        url: f.get('url'),
                        notes: f.get('notes'),
                      },
                      'Reference added.',
                    );
                  setFilter('all');
                  close();
                });
              }}
            >
              <div className="segmented">
                {[
                  ['image', 'Upload image'],
                  ['pinterest', 'Pinterest board'],
                  ['link', 'Web link'],
                ].map(([k, l]) => (
                  <button
                    type="button"
                    key={k}
                    className={referenceKind === k ? 'active' : ''}
                    disabled={busy}
                    aria-pressed={referenceKind === k}
                    onClick={() => setReferenceKind(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <label>
                {referenceKind === 'image'
                  ? 'Title (optional for one image)'
                  : 'Title'}
                <input
                  name="title"
                  required={referenceKind !== 'image'}
                  maxLength={160}
                  placeholder={
                    referenceKind === 'image'
                      ? 'Uses the filename if left blank'
                      : 'What caught your eye?'
                  }
                />
              </label>
              {referenceKind === 'image' ? (
                <>
                  <label className="upload-zone">
                    <Upload size={24} />
                    Choose reference images
                    <input
                      ref={fileInput}
                      name="file"
                      type="file"
                      multiple
                      disabled={busy}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => {
                        const chosen = Array.from(e.target.files || []);
                        if (chosen.length > 12) {
                          setError('Choose up to 12 images at a time.');
                          e.target.value = '';
                          setFiles([]);
                          return;
                        }
                        setFiles(chosen);
                        setError('');
                      }}
                    />
                    <small>
                      Up to 12 images · PNG, JPG, WebP or GIF · 10 MB each
                    </small>
                  </label>
                  {!!files.length && (
                    <ul className="upload-files" aria-label="Selected images">
                      {files.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                          <span>
                            {file.name}{' '}
                            <small>
                              {(file.size / 1_000_000).toFixed(1)} MB
                            </small>
                          </span>
                          <button
                            type="button"
                            className="icon"
                            disabled={busy}
                            aria-label={`Remove ${file.name}`}
                            onClick={() => {
                              setFiles((current) =>
                                current.filter((_, i) => i !== index),
                              );
                              setError('');
                            }}
                          >
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {uploadProgress && <p role="status">{uploadProgress}</p>}
                </>
              ) : (
                <>
                  <label>
                    {referenceKind === 'pinterest'
                      ? 'Pinterest board URL'
                      : 'Reference URL'}
                    <input
                      name="url"
                      type="url"
                      required
                      placeholder={
                        referenceKind === 'pinterest'
                          ? 'https://www.pinterest.com/name/board/'
                          : 'https://…'
                      }
                    />
                  </label>
                  {referenceKind === 'pinterest' && (
                    <p className="muted">
                      We'll save the board and import up to 50 public pins.
                      Private boards need individual image uploads.
                    </p>
                  )}
                  <label>
                    What do you like about it?
                    <textarea name="notes" maxLength={4000} rows={3} />
                  </label>
                </>
              )}
              <button className="primary" disabled={busy}>
                {busy
                  ? 'Adding…'
                  : referenceKind === 'image'
                    ? `Upload${files.length ? ` ${files.length}` : ''} ${files.length === 1 ? 'image' : 'images'}`
                    : 'Add reference'}
              </button>
            </form>
          )}
          {modal === 'html' && (
            <form
              onSubmit={(e) => {
                const f = form(e);
                run(async () => {
                  let directions = String(f.get('directions') || '');
                  if (importMode === 'html') {
                    let html = String(f.get('html') || '');
                    const file = f.get('file');
                    if (file instanceof File && file.size) {
                      if (file.size > 100000)
                        throw Error('HTML files must be under 100 KB.');
                      html = await file.text();
                    }
                    directions = JSON.stringify({
                      designs: [
                        { title: f.get('title'), notes: f.get('notes'), html },
                      ],
                    });
                  }
                  await mutate(
                    'designs',
                    { clientId, directions },
                    'Designs imported. Ready to review.',
                  );
                  setView('review');
                  setReviewIndex(0);
                  close();
                });
              }}
            >
              <div className="segmented">
                <button
                  type="button"
                  className={importMode === 'json' ? 'active' : ''}
                  onClick={() => setImportMode('json')}
                >
                  Agent JSON
                </button>
                <button
                  type="button"
                  className={importMode === 'html' ? 'active' : ''}
                  onClick={() => setImportMode('html')}
                >
                  Single HTML
                </button>
              </div>
              {importMode === 'json' ? (
                <label>
                  Paste the agent response
                  <textarea
                    name="directions"
                    required
                    rows={12}
                    placeholder={
                      '{"designs":[{"title":"Direction A","notes":"Why it fits","html":"<!doctype html>..."}]}'
                    }
                  />
                </label>
              ) : (
                <>
                  <label>
                    Direction name
                    <input name="title" required maxLength={160} />
                  </label>
                  <label>
                    Rationale
                    <textarea name="notes" rows={2} maxLength={4000} />
                  </label>
                  <label>
                    HTML file
                    <input
                      name="file"
                      type="file"
                      accept=".html,.htm,text/html"
                    />
                  </label>
                  <label>
                    Or paste HTML
                    <textarea name="html" rows={8} />
                  </label>
                </>
              )}
              <p className="muted">
                HTML displays in a protected preview. Scripts and forms are
                disabled.
              </p>
              <button className="primary" disabled={busy}>
                Import & review <ArrowRight size={17} />
              </button>
            </form>
          )}
          {modal === 'share' && (
            <div className="share-panel">
              <p>
                Anyone with this invitation can upload references, react, and
                comment on <strong>{client?.name}</strong>. It does not grant
                access to other clients or agency settings.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await api('invite', { clientId });
                    setInvite(
                      `${location.origin}/workspace#invite=${result.token}`,
                    );
                  })
                }
              >
                <LinkIcon size={17} />
                {invite ? 'Replace invitation' : 'Create client invitation'}
              </button>
              {invite && (
                <>
                  <label>
                    Client invitation
                    <input
                      name="invitation"
                      readOnly
                      value={invite}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <button onClick={() => copy(invite)}>
                    <Copy size={16} />
                    Copy invitation
                  </button>
                </>
              )}
              <button
                className="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api('invite', { clientId, revoke: true });
                    setInvite('');
                    setNotice('Previous client invitations revoked.');
                  })
                }
              >
                Revoke previous invitations
              </button>
              <p className="muted">
                Creating a new invitation replaces the previous link. Share it
                directly with your client.
              </p>
            </div>
          )}
          <button type="button" disabled={busy} onClick={close}>
            Cancel
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </ModalBox>
      )}
      {selected && (
        <ModalBox
          title={selected.title}
          close={() => {
            setDetail(null);
            setComment('');
          }}
        >
          <div className="detail-preview">
            <Preview design={selected} token={token} large />
          </div>
          {selected.url && (
            <a
              className="external"
              href={selected.url}
              target="_blank"
              rel="noreferrer"
            >
              Open original reference <ArrowUpRight size={15} />
            </a>
          )}
          <p>{selected.notes}</p>
          <div className="detail-actions">
            {[
              ['love', 'Love', Heart],
              ['pass', 'Pass', X],
              ['skip', 'Skip', ArrowRight],
            ].map(([value, label, Icon]) => {
              const I = Icon as typeof Heart;
              return (
                <button
                  key={value as string}
                  className={
                    votes.some(
                      (r) =>
                        r.designId === selected.id &&
                        r.actor === workspace.actor &&
                        r.value === value,
                    )
                      ? 'selected'
                      : ''
                  }
                  disabled={busy}
                  onClick={() => run(() => react(selected.id, value as string))}
                >
                  <I size={16} />
                  {label as string}
                </button>
              );
            })}
            {isAgency && (
              <button
                disabled={busy}
                onClick={() =>
                  run(() =>
                    mutate(
                      'save',
                      { designId: selected.id, saved: !selected.saved },
                      selected.saved
                        ? 'Removed from dashboard.'
                        : 'Saved to client dashboard.',
                    ),
                  )
                }
              >
                <Bookmark size={16} />
                {selected.saved ? 'Saved' : 'Save to dashboard'}
              </button>
            )}
            {selected.kind === 'html' && (
              <button
                onClick={() =>
                  download(`${selected.title}.html`, selected.html, 'text/html')
                }
              >
                <Download size={16} />
                HTML
              </button>
            )}
          </div>
          <section className="comments">
            <h3>Talk about the details</h3>
            {workspace.comments
              .filter((c) => c.designId === selected.id)
              .map((c) => (
                <article key={c.id}>
                  <header>
                    <strong>{c.author}</strong>
                    <span>
                      {c.role} · {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </header>
                  <p>{c.body}</p>
                </article>
              ))}
            <form
              onSubmit={(e) => {
                const fields = form(e);
                const submittedAuthor = String(fields.get('author') || '');
                const submittedComment = String(fields.get('body') || '');
                // Submit visible values, including native autofill, before a saving-state render.
                setAuthor(submittedAuthor);
                setComment(submittedComment);
                run(async () => {
                  await mutate('comments', {
                    designId: selected.id,
                    author: submittedAuthor,
                    body: submittedComment,
                  });
                  setComment('');
                });
              }}
            >
              <label>
                Your name
                <input
                  name="author"
                  autoComplete="name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                  maxLength={80}
                  placeholder={isAgency ? agency.name : 'Your name'}
                />
              </label>
              <label>
                Your feedback
                <textarea
                  name="body"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  maxLength={4000}
                  rows={3}
                  placeholder="The typography feels right. Could we try a quieter palette?"
                />
              </label>
              <button className="primary" disabled={busy}>
                Add comment <MessageCircle size={16} />
              </button>
            </form>
            {isAgency && (
              <button
                className="text-button"
                onClick={() => {
                  setDetail(null);
                  setView('agent');
                }}
              >
                Discuss this feedback with your agent <Sparkles size={16} />
              </button>
            )}
          </section>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDetail(null);
              setComment('');
            }}
          >
            Close reference
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </ModalBox>
      )}
    </div>
  );
}
