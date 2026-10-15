import { useState } from 'react';
import type { Field } from './schema';
import { FLEET } from '../components/Aircraft';

type Rec = Record<string, unknown>;

const inputCls = 'w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-[15px] focus:border-sky focus:outline-none';

export function FieldInput({ field, value, onChange, idPrefix }: { field: Field; value: unknown; onChange: (v: unknown) => void; idPrefix: string }) {
  const id = `${idPrefix}-${field.key}`;
  let control: React.ReactNode;
  if (field.type === 'textarea') {
    control = <textarea id={id} rows={4} className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  } else if (field.type === 'lines') {
    control = (
      <textarea id={id} rows={4} className={inputCls} value={((value as string[]) ?? []).join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
        onBlur={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
    );
  } else if (field.type === 'color') {
    control = (
      <select id={id} className={inputCls} value={(value as string) || 'other'} onChange={(e) => onChange(e.target.value)}>
        <option value="aws">AWS orange</option>
        <option value="gcp">Google blue</option>
        <option value="oci">Oracle red</option>
        <option value="other">Ink (other)</option>
      </select>
    );
  } else if (field.type === 'aircraft') {
    control = (
      <select id={id} className={inputCls} value={(value as string) || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Automatic</option>
        {FLEET.map((f) => <option key={f.model} value={f.model}>{f.name}</option>)}
      </select>
    );
  } else {
    control = <input id={id} type={field.type === 'url' ? 'url' : 'text'} className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label htmlFor={id} className={`flex flex-col gap-1 ${field.type === 'textarea' || field.type === 'lines' ? 'sm:col-span-2' : ''}`}>
      <span className="text-[13px] font-semibold text-[#2a3138]">{field.label}</span>
      {control}
      {field.hint && <span className="text-xs text-muted">{field.hint}</span>}
    </label>
  );
}

export function ObjectEditor({ fields, value, onChange, idPrefix }: { fields: Field[]; value: Rec; onChange: (v: Rec) => void; idPrefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <FieldInput key={f.key} field={f} idPrefix={idPrefix} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
      ))}
    </div>
  );
}

export function ListEditor<T extends Rec>({ items, fields, empty, itemTitle, onChange, idPrefix }: {
  items: T[]; fields: Field[]; empty: T; itemTitle: (i: T) => string; onChange: (items: T[]) => void; idPrefix: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const update = (i: number, v: T) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(open === i ? j : open);
  };
  const remove = (i: number) => {
    if (!window.confirm(`Delete "${itemTitle(items[i])}"? It is removed for good once you press Save.`)) return;
    onChange(items.filter((_, j) => j !== i));
    setOpen(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-paper-line bg-white">
          <div className="flex items-center gap-2 px-4 py-3">
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="min-w-0 flex-1 truncate text-left font-semibold" aria-expanded={open === i}>
              <span className="mr-2 font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>{itemTitle(item) || '(empty)'}
            </button>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-sm hover:bg-paper-2 disabled:opacity-30" aria-label="Move up">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded px-2 py-1 text-sm hover:bg-paper-2 disabled:opacity-30" aria-label="Move down">↓</button>
            <button type="button" onClick={() => remove(i)} className="rounded px-2 py-1 text-sm text-tail hover:bg-red-50" aria-label="Delete">Delete</button>
          </div>
          {open === i && (
            <div className="border-t border-paper-line p-4">
              <ObjectEditor fields={fields} value={item} idPrefix={`${idPrefix}-${i}`} onChange={(v) => update(i, v as T)} />
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={() => { onChange([...items, { ...empty }]); setOpen(items.length); }}
        className="self-start rounded-full border-2 border-dashed border-sky px-4 py-2 font-semibold text-sky hover:bg-sky/5">
        + Add new
      </button>
    </div>
  );
}
