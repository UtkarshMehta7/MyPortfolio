import { useState } from 'react';
import { setToken, updateAccount } from '../api';

const input = 'w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-[15px] focus:border-sky focus:outline-none';

export default function AccountSettings({ username, onChanged, flash }: {
  username: string; onChanged: (username: string) => void; flash: (m: string, err?: boolean) => void;
}) {
  const [current, setCurrent] = useState('');
  const [newUser, setNewUser] = useState(username);
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const userChanged = newUser.trim() !== username;
  const passChanged = newPass.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userChanged && !passChanged) { setError('Change the username, the password, or both.'); return; }
    if (userChanged && !/^[A-Za-z0-9_.-]{3,32}$/.test(newUser.trim())) { setError('Username must be 3–32 characters: letters, numbers, dot, dash or underscore.'); return; }
    if (passChanged && newPass.length < 10) { setError('New password must be at least 10 characters.'); return; }
    if (passChanged && newPass !== confirm) { setError("The new passwords don't match."); return; }
    setBusy(true);
    try {
      const r = await updateAccount(current, newUser.trim(), newPass);
      setToken(r.token);
      onChanged(r.username);
      setCurrent(''); setNewPass(''); setConfirm('');
      flash(`Login updated. Use "${r.username}" and your ${passChanged ? 'new' : 'same'} password next time. Other sessions were signed out.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-xl rounded-2xl border border-paper-line bg-white p-6">
      <h2 className="mb-1 text-3xl uppercase">Account</h2>
      <p className="mb-5 text-sm text-muted">Change your login username, password, or both. Saving signs out every other open session.</p>

      <div className="grid gap-4">
        <label htmlFor="acc-user" className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">Username</span>
          <input id="acc-user" autoComplete="username" className={input} value={newUser} onChange={(e) => setNewUser(e.target.value)} />
        </label>
        <label htmlFor="acc-new" className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">New password <span className="font-normal text-muted">(leave empty to keep the current one)</span></span>
          <input id="acc-new" type="password" autoComplete="new-password" className={input} value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <span className="text-xs text-muted">At least 10 characters. A longer passphrase with letters and numbers is much harder to guess.</span>
        </label>
        {passChanged && (
          <label htmlFor="acc-confirm" className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">Repeat new password</span>
            <input id="acc-confirm" type="password" autoComplete="new-password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
        )}
        <hr className="border-paper-line" />
        <label htmlFor="acc-current" className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">Current password <span className="text-tail">*</span></span>
          <input id="acc-current" type="password" autoComplete="current-password" required className={input} value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-tail">{error}</p>}
        <button className="btn btn-dark justify-self-start" disabled={busy || !current}>{busy ? 'Updating…' : 'Update login'}</button>
      </div>
    </form>
  );
}
