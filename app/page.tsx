'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Upload, MessageCircle, Bookmark } from 'lucide-react';

export default function Home() {
  const [error, setError] = useState('');
  useEffect(() => {
    if (new URLSearchParams(location.hash.slice(1)).has('invite'))
      location.replace(`/workspace${location.hash}`);
  }, []);
  function openInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const url = new URL(
        String(new FormData(event.currentTarget).get('invitation')).trim(),
      );
      const token = new URLSearchParams(url.hash.slice(1)).get('invite');
      if (
        url.origin !== location.origin ||
        !token ||
        !/^[a-f0-9]{64}$/.test(token)
      )
        throw Error();
      location.assign(`/workspace#invite=${token}`);
    } catch {
      setError(
        'Paste the complete invitation link from your agency. It should start with this website’s address.',
      );
    }
  }
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="wordmark" href="/" aria-label="Reference Room home">
          <span className="mark">rr</span>Reference Room
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#client-access">For clients</a>
          <a className="button" href="/workspace">
            Agency sign in <ArrowRight size={16} />
          </a>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div>
            <p className="eyebrow">MOOD BOARDS FOR AGENCIES & CLIENTS</p>
            <h1>
              Find the direction.
              <br />
              <em>Together.</em>
            </h1>
            <p className="landing-lead">
              Give every client one place to share inspiration, talk through
              designs, and keep the work they love.
            </p>
            <div className="landing-actions">
              <a className="button primary" href="/workspace">
                Create your agency workspace <ArrowRight size={18} />
              </a>
              <a href="#client-access">I have a client invitation</a>
            </div>
            <p className="landing-note">
              Your studio’s name, logo, and colors. Clients upload without
              creating an account.
            </p>
          </div>
          <aside
            className="landing-example"
            aria-label="What goes in your client room"
          >
            <span className="eyebrow">ONE CLIENT ROOM</span>
            <h2>
              From “something like this”
              <br />
              to “that’s the one.”
            </h2>
            <ol>
              <li>
                <Upload />
                <div>
                  <strong>References</strong>
                  <p>Images, screenshots, and Pinterest boards.</p>
                </div>
              </li>
              <li>
                <MessageCircle />
                <div>
                  <strong>Feedback</strong>
                  <p>What works, what doesn’t, and why.</p>
                </div>
              </li>
              <li>
                <Bookmark />
                <div>
                  <strong>A shared direction</strong>
                  <p>The designs your agency saves for the next step.</p>
                </div>
              </li>
            </ol>
          </aside>
        </section>
        <section className="landing-workflow" id="how-it-works">
          <header>
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>A shorter path to a shared point of view.</h2>
          </header>
          <div className="landing-steps">
            <article>
              <span>01</span>
              <h3>Make room for a client</h3>
              <p>
                Name your studio, add your branding, and create a client
                project. Send its private invitation link.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Collect and discuss</h3>
              <p>
                You and your client upload images or paste references. Reactions
                and comments keep the reasoning beside the design.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Explore and choose</h3>
              <p>
                Copy the brief into your AI agent, import its HTML designs, and
                review them together. Save the selected work to the client
                dashboard.
              </p>
            </article>
          </div>
        </section>
        <section className="client-entry" id="client-access">
          <div>
            <p className="eyebrow">INVITED BY YOUR AGENCY?</p>
            <h2>
              Your references.
              <br />
              Your point of view.
            </h2>
            <p>
              Open the invitation your agency sent you to upload images, add
              links, and leave feedback. You don’t need an account.
            </p>
            <p className="muted">
              Don’t have a link? Ask your agency for your client invitation.
            </p>
          </div>
          <form onSubmit={openInvitation}>
            <label htmlFor="invitation">Client invitation link</label>
            <input
              id="invitation"
              name="invitation"
              type="url"
              required
              placeholder="Paste your complete invitation link"
              autoComplete="off"
              onChange={() => setError('')}
            />
            <button className="primary">
              Open my client room <ArrowRight size={18} />
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </section>
        <section className="landing-faq" aria-label="Common questions">
          <h2>A few useful details</h2>
          <details>
            <summary>Who can see my client’s board?</summary>
            <p>
              The agency that created it and anyone with that client’s
              invitation. Invitations don’t grant access to other client rooms.
              The agency can revoke or replace a link.
            </p>
          </details>
          <details>
            <summary>Does this generate designs for me?</summary>
            <p>
              You use your own AI agent. Reference Room prepares a prompt with
              your brief and feedback, then lets you import and review the HTML
              designs it produces.
            </p>
          </details>
          <details>
            <summary>What can clients upload?</summary>
            <p>
              PNG, JPG, WebP, and GIF images, up to 10 MB each. Clients can also
              add web links and public Pinterest boards. Pinterest imports up to
              50 pins when its public feed is available.
            </p>
          </details>
          <details>
            <summary>Can I use my own branding?</summary>
            <p>
              Yes. Set your agency’s name, logo URL, and accent color in Studio
              settings. They appear throughout your client rooms. The source is
              also available under the MIT license.
            </p>
          </details>
        </section>
      </main>
      <footer className="landing-footer">
        <span>Reference Room</span>
        <a
          href="https://github.com/howagain/reference-room"
          target="_blank"
          rel="noreferrer"
        >
          Open-source on GitHub ↗
        </a>
        <a href="/workspace">Agency workspace</a>
      </footer>
    </div>
  );
}
