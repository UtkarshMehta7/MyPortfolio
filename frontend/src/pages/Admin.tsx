import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, fetchContent, getToken, login, saveContent, setToken, verifySession } from '../api';
import { ListEditor, ObjectEditor } from '../admin/Editors';
import Importers from '../admin/Importers';
import AccountSettings from '../admin/AccountSettings';
import { CONTACT_FIELDS, LISTS, PROFILE_FIELDS } from '../admin/schema';
import type { Content, ListKey } from '../types';

type Tab = 'profile' | ListKey | 'contact' | 'import' | 'account';
const TABS: [Tab, string][] = [
  ['profile', 'Boarding pass'], ['stats', 'Stats'], ['projects', 'Projects'], ['logbook', 'Logbook'],
  ['certifications', 'Certifications'], ['skills', 'Skills'], ['contact', 'Contact'], ['import', 'Import'], ['account', 'Account'],
];

function Login({ onDone }: { onDone: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form className="w-full max-w-sm rounded-[22px] bg-white p-7 shadow-2xl" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try { const r = await login(username, password); setToken(r.token); onDone(r.username); }
        catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
      }}>
        <p className="eyebrow">Crew only</p>
        <h1 className="mb-6 text-5xl font-black uppercase">Flight deck</h1>
        {!API_URL && <p className="mb-4 rounded-lg bg-amber/20 p-3 text-sm">VITE_API_URL is not set, so login is unavailable.</p>}
        <label htmlFor="u" className="label mb-1">Username</label>
        <input id="u" autoComplete="username" className="mb-4 w-full rounded-lg border border-paper-line px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label htmlFor="p" className="label mb-1">Password</label>
        <input id="p" type="password" autoComplete="current-password" className="mb-4 w-full rounded-lg border border-paper-line px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="mb-3 text-sm text-tail">{error}</p>}
        <button className="btn btn-dark w-full justify-center" disabled={busy}>{busy ? 'Checking…' : 'Log in'}</button>
        <Link to="/" className="mt-4 block text-center text-sm text-muted">← Back to the site</Link>
      </form>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [me, setMe] = useState('');
  const [content, setContent] = useState<Content | null>(null);
  const [saved, setSaved] = useState('');
  const [tab, setTab] = useState<Tab>('profile');
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // The flight deck is styled for day mode only; lift any night theme while it's open.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }, []);

  const flash = useCallback((text: string, err = false) => { setMsg({ text, err }); window.setTimeout(() => setMsg(null), 6000); }, []);

  useEffect(() => {
    if (!getToken()) { setAuthed(false); return; }
    verifySession().then((r) => { setMe(r.username); setAuthed(true); }).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchContent().then((d) => { setContent(d.content); setSaved(JSON.stringify(d.content)); }).catch((e) => flash((e as Error).message, true));
  }, [authed, flash]);

  const dirty = content !== null && JSON.stringify(content) !== saved;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (authed === null) return <div className="grid min-h-screen place-items-center bg-ink font-mono text-amber">Checking clearance…</div>;
  if (!authed) return <Login onDone={(u) => { setMe(u); setAuthed(true); }} />;
  if (!content) return <div className="grid min-h-screen place-items-center bg-paper font-mono">Loading content… (the server may take ~40 s to wake up)</div>;

  const save = async () => {
    setSaving(true);
    try {
      const r = await saveContent(content);
      setSaved(JSON.stringify(content));
      flash(r.site_rebuild
        ? 'Saved. Live now, and the always-on public copy finishes updating in about a minute.'
        : 'Saved. The live site now shows these changes.');
    }
    catch (e) { flash((e as Error).message, true); if (!getToken()) setAuthed(false); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b-[3px] border-amber bg-ink px-4 py-3 text-white sm:px-8">
        <span className="font-display text-2xl font-black text-amber">UTK</span>
        <span className="font-display text-lg font-semibold uppercase tracking-[.08em]">Flight deck</span>
        {me && <span className="font-mono text-xs text-steel">Captain {me}</span>}
        <span className={`ml-2 rounded px-2 py-0.5 font-mono text-xs ${dirty ? 'bg-amber text-ink' : 'bg-go/20 text-go'}`}>{dirty ? 'Unsaved changes' : 'All saved'}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link to="/" target="_blank" className="btn btn-ghost">View site ↗</Link>
          <button className="btn" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn btn-ghost" onClick={() => { if (!dirty || window.confirm('Discard unsaved changes and log out?')) { setToken(null); setAuthed(false); } }}>Log out</button>
        </div>
      </header>

      {msg && <div role="status" className={`mx-auto mt-4 max-w-4xl rounded-lg px-4 py-3 text-sm ${msg.err ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-900'}`}>{msg.text}</div>}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-8 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Sections">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-left font-display text-lg font-semibold uppercase tracking-wide ${tab === key ? 'bg-ink text-amber' : 'hover:bg-paper-2'}`}>
              {label}
            </button>
          ))}
        </nav>

        <main className="min-w-0">
          {tab === 'profile' && (
            <ObjectEditor fields={PROFILE_FIELDS} idPrefix="profile" value={content.profile as unknown as Record<string, unknown>}
              onChange={(v) => setContent({ ...content, profile: v as unknown as Content['profile'] })} />
          )}
          {tab === 'contact' && (
            <ObjectEditor fields={CONTACT_FIELDS} idPrefix="contact" value={content.contact as unknown as Record<string, unknown>}
              onChange={(v) => setContent({ ...content, contact: v as unknown as Content['contact'] })} />
          )}
          {tab === 'import' && <Importers content={content} onChange={setContent} flash={flash} />}
          {tab === 'account' && <AccountSettings username={me} onChanged={setMe} flash={flash} />}
          {(['stats', 'projects', 'logbook', 'certifications', 'skills'] as ListKey[]).includes(tab as ListKey) && (() => {
            const s = LISTS[tab as ListKey];
            return (
              <>
                <h2 className="mb-4 text-3xl uppercase">{s.title}</h2>
                <ListEditor
                  key={tab}
                  idPrefix={tab}
                  items={content[s.key] as unknown as Record<string, unknown>[]}
                  fields={s.fields}
                  empty={s.empty as unknown as Record<string, unknown>}
                  itemTitle={(i) => (s.itemTitle as (x: unknown) => string)(i)}
                  onChange={(items) => setContent({ ...content, [s.key]: items } as Content)}
                />
              </>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
