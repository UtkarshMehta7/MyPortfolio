import { useState } from 'react';
import { importCredly, importGithub, importLinkedin } from '../api';
import type { Certification, Content, LogEntry, Project } from '../types';

type Picked<T> = { item: T; on: boolean; note?: string };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-paper-line bg-white p-5">
      <h3 className="mb-3 text-2xl uppercase">{title}</h3>
      {children}
    </section>
  );
}

function PickList<T>({ rows, setRows, label, empty }: { rows: Picked<T>[]; setRows: (r: Picked<T>[]) => void; label: (t: T) => string; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-3 flex max-h-72 flex-col gap-1 overflow-auto rounded-lg border border-paper-line p-2">
      {rows.map((r, i) => (
        <li key={i}>
          <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-paper-2">
            <input type="checkbox" className="mt-1" checked={r.on} onChange={() => setRows(rows.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
            <span className="min-w-0 text-sm"><span className="font-semibold">{label(r.item)}</span>{r.note && <span className="block text-xs text-muted">{r.note}</span>}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export default function Importers({ content, onChange, flash }: { content: Content; onChange: (c: Content) => void; flash: (m: string, err?: boolean) => void }) {
  const [ghUser, setGhUser] = useState(() => content.contact.github_url?.split('/').filter(Boolean).pop() || '');
  const [repos, setRepos] = useState<Picked<Project>[]>([]);
  const [credlyUser, setCredlyUser] = useState('');
  const [badges, setBadges] = useState<Picked<Certification>[]>([]);
  const [li, setLi] = useState<{ logbook: Picked<LogEntry>[]; certs: Picked<Certification>[]; projects: Picked<Project>[]; skills: string[] } | null>(null);
  const [busy, setBusy] = useState('');

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { flash((e as Error).message, true); } finally { setBusy(''); }
  };

  const existingUrls = new Set(content.projects.flatMap((p) => [p.source_url, p.live_url]).filter(Boolean));
  const existingCerts = new Set(content.certifications.map((c) => c.name.toLowerCase()));

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted">Imported items are added as drafts. Review them in their tabs, then press <strong>Save</strong> to publish.</p>

      <Card title="GitHub">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run('gh', async () => {
          const r = await importGithub(ghUser.trim());
          setRepos(r.projects.map((p) => ({ item: p, on: false, note: `${p.stack || 'No language'} · ★ ${p.stars} · ${existingUrls.has(p.source_url) ? 'already on site' : 'new'}` })));
        }); }}>
          <input aria-label="GitHub username" className="min-w-0 flex-1 rounded-lg border border-paper-line px-3 py-2" value={ghUser} onChange={(e) => setGhUser(e.target.value)} placeholder="GitHub username" />
          <button className="btn" disabled={!ghUser.trim() || busy === 'gh'}>{busy === 'gh' ? 'Pulling…' : 'Pull repositories'}</button>
        </form>
        <PickList rows={repos} setRows={setRepos} label={(p) => p.title} empty="Pull your public repositories, then tick the ones to add as projects." />
        {repos.some((r) => r.on) && (
          <button className="btn btn-dark mt-3" onClick={() => {
            const add = repos.filter((r) => r.on).map((r) => r.item);
            onChange({ ...content, projects: [...content.projects, ...add.map(({ date, code, board_name, status, stack, title, description, live_url, source_url }) => ({ date, code, board_name, status, stack, title, description, live_url, source_url }))] });
            setRepos(repos.map((r) => ({ ...r, on: false })));
            flash(`Added ${add.length} project(s). Edit their board name and description in Projects, then Save.`);
          }}>Add selected to Projects</button>
        )}
      </Card>

      <Card title="Credly (certifications)">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run('cr', async () => {
          const r = await importCredly(credlyUser.trim());
          setBadges(r.certifications.map((c) => ({ item: c, on: !existingCerts.has(c.name.toLowerCase()), note: `${c.issuer} · ${c.date}${existingCerts.has(c.name.toLowerCase()) ? ' · already on site' : ''}` })));
        }); }}>
          <input aria-label="Credly username" className="min-w-0 flex-1 rounded-lg border border-paper-line px-3 py-2" value={credlyUser} onChange={(e) => setCredlyUser(e.target.value)} placeholder="Credly profile name (from credly.com/users/…)" />
          <button className="btn" disabled={!credlyUser.trim() || busy === 'cr'}>{busy === 'cr' ? 'Pulling…' : 'Pull badges'}</button>
        </form>
        <PickList rows={badges} setRows={setBadges} label={(c) => c.name} empty="Your Credly profile must be public. Oracle badges aren't on Credly; add those by hand." />
        {badges.some((b) => b.on) && (
          <button className="btn btn-dark mt-3" onClick={() => {
            const add = badges.filter((b) => b.on).map((b) => b.item);
            onChange({ ...content, certifications: [...content.certifications, ...add] });
            setBadges(badges.map((b) => ({ ...b, on: false })));
            flash(`Added ${add.length} certification(s). Press Save to publish.`);
          }}>Add selected to Certifications</button>
        )}
      </Card>

      <Card title="LinkedIn (data export)">
        <p className="text-sm text-muted">LinkedIn doesn't allow apps to read your profile directly. Instead: LinkedIn → Settings → Data privacy → <em>Get a copy of your data</em> → download the ZIP, then upload it here. Positions, Education, Certifications, Projects and Skills are read from it.</p>
        <input type="file" accept=".zip,.csv" aria-label="LinkedIn export file" className="mt-3 block text-sm" disabled={busy === 'li'} onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          run('li', async () => {
            const r = await importLinkedin(f);
            setLi({
              logbook: r.logbook.map((x) => ({ item: x, on: false, note: `${x.type} · ${x.date_top} ${x.date_bottom}` })),
              certs: r.certifications.map((x) => ({ item: x, on: !existingCerts.has(x.name.toLowerCase()), note: `${x.issuer} · ${x.date}` })),
              projects: r.projects.map((x) => ({ item: x, on: false, note: x.date })),
              skills: r.skills,
            });
          });
          e.target.value = '';
        }} />
        {busy === 'li' && <p className="mt-2 text-sm">Reading export…</p>}
        {li && (
          <div className="mt-4 grid gap-4">
            <div><h4 className="font-semibold">Experience &amp; education → Logbook</h4><PickList rows={li.logbook} setRows={(r) => setLi({ ...li, logbook: r })} label={(x) => x.title} empty="Nothing found." /></div>
            <div><h4 className="font-semibold">Certifications</h4><PickList rows={li.certs} setRows={(r) => setLi({ ...li, certs: r })} label={(x) => x.name} empty="Nothing found." /></div>
            <div><h4 className="font-semibold">Projects</h4><PickList rows={li.projects} setRows={(r) => setLi({ ...li, projects: r })} label={(x) => x.title} empty="Nothing found." /></div>
            {li.skills.length > 0 && <p className="text-sm"><strong>Skills found:</strong> {li.skills.join(' · ')}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-dark" onClick={() => {
                const next = {
                  ...content,
                  logbook: [...content.logbook, ...li.logbook.filter((x) => x.on).map((x) => x.item)],
                  certifications: [...content.certifications, ...li.certs.filter((x) => x.on).map((x) => x.item)],
                  projects: [...content.projects, ...li.projects.filter((x) => x.on).map((x) => x.item)],
                };
                onChange(next);
                flash('Added selected LinkedIn items. Review them, then Save.');
                setLi({ ...li, logbook: li.logbook.map((x) => ({ ...x, on: false })), certs: li.certs.map((x) => ({ ...x, on: false })), projects: li.projects.map((x) => ({ ...x, on: false })) });
              }}>Add selected</button>
              {li.skills.length > 0 && (
                <button className="btn btn-ghost !text-sky !border-sky" onClick={() => {
                  onChange({ ...content, skills: [...content.skills, { title: 'From LinkedIn', items: li.skills.join(' · ') }] });
                  flash('Added a "From LinkedIn" skills group. Tidy it in Skills, then Save.');
                }}>Add skills as a new group</button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
