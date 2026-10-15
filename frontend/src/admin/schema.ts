import type { Content, ListKey } from '../types';

export type FieldType = 'text' | 'textarea' | 'url' | 'lines' | 'color' | 'aircraft';
export interface Field { key: string; label: string; type: FieldType; hint?: string }

export const PROFILE_FIELDS: Field[] = [
  { key: 'eyebrow', label: 'Eyebrow (small red line above headline)', type: 'text' },
  { key: 'headline', label: 'Headline', type: 'text' },
  { key: 'headline_emphasis', label: 'Headline highlighted word', type: 'text' },
  { key: 'lede', label: 'Intro paragraph', type: 'textarea' },
  { key: 'photo_url', label: 'Photo URL', type: 'url', hint: 'e.g. /assets/utkarsh.webp or a full https:// link' },
  { key: 'from_code', label: 'From code', type: 'text' },
  { key: 'from_city', label: 'From city', type: 'text' },
  { key: 'to_code', label: 'To code', type: 'text' },
  { key: 'to_city', label: 'To city', type: 'text' },
  { key: 'passenger', label: 'Passenger', type: 'text' },
  { key: 'flight', label: 'Flight', type: 'text' },
  { key: 'gate', label: 'Gate', type: 'text' },
  { key: 'seat', label: 'Seat', type: 'text' },
  { key: 'class_of', label: 'Class of', type: 'text' },
  { key: 'status', label: 'Status (green)', type: 'text' },
  { key: 'boarding_group', label: 'Boarding group', type: 'text' },
];

export const CONTACT_FIELDS: Field[] = [
  { key: 'heading', label: 'Heading', type: 'text' },
  { key: 'text', label: 'Text', type: 'textarea' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url' },
  { key: 'linkedin_label', label: 'LinkedIn label', type: 'text' },
  { key: 'github_url', label: 'GitHub URL', type: 'url' },
  { key: 'github_label', label: 'GitHub label', type: 'text' },
];

interface ListSchema<K extends ListKey> {
  key: K;
  title: string;
  itemTitle: (item: Content[K][number]) => string;
  fields: Field[];
  empty: Content[K][number];
}

export const LISTS: { [K in ListKey]: ListSchema<K> } = {
  stats: {
    key: 'stats', title: 'Stats', itemTitle: (s) => `${s.value} ${s.label}`,
    fields: [{ key: 'value', label: 'Value', type: 'text' }, { key: 'label', label: 'Label', type: 'text' }],
    empty: { value: '', label: '' },
  },
  projects: {
    key: 'projects', title: 'Projects (departures)', itemTitle: (p) => p.title || p.board_name || 'New project',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'board_name', label: 'Board name (short, CAPS)', type: 'text', hint: 'Shown on the split-flap board, keep it under ~14 characters' },
      { key: 'code', label: 'Flight code', type: 'text', hint: 'e.g. AIR 777' },
      { key: 'date', label: 'Time (e.g. OCT 26)', type: 'text' },
      { key: 'status', label: 'Status', type: 'text', hint: 'e.g. BOARDING, LANDED, DELAYED' },
      { key: 'stack', label: 'Stack', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'live_url', label: 'Live URL', type: 'url' },
      { key: 'source_url', label: 'Source URL', type: 'url' },
    ],
    empty: { date: '', code: '', board_name: '', status: 'BOARDING', stack: '', title: '', description: '', live_url: '', source_url: '' },
  },
  logbook: {
    key: 'logbook', title: 'Logbook (experience, training, education)', itemTitle: (e) => e.title || 'New entry',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'type', label: 'Type line (e.g. Internship · City)', type: 'text' },
      { key: 'date_top', label: 'Date line 1 (e.g. JUN–JUL)', type: 'text' },
      { key: 'date_bottom', label: 'Date line 2 (e.g. 2026)', type: 'text' },
      { key: 'bullets', label: 'Bullet points', type: 'lines', hint: 'One bullet per line' },
      { key: 'text', label: 'Plain text (optional)', type: 'textarea' },
      { key: 'link_label', label: 'Link label (optional)', type: 'text' },
      { key: 'link_url', label: 'Link URL (optional)', type: 'url' },
    ],
    empty: { date_top: '', date_bottom: '', type: '', title: '', bullets: [], text: '', link_label: '', link_url: '' },
  },
  certifications: {
    key: 'certifications', title: 'Certifications (ratings)', itemTitle: (c) => `${c.issuer} · ${c.name}`,
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'issuer', label: 'Issuer', type: 'text' },
      { key: 'date', label: 'Date (e.g. JUL 2026)', type: 'text' },
      { key: 'color', label: 'Stamp colour', type: 'color' },
      { key: 'url', label: 'Verify URL', type: 'url' },
    ],
    empty: { issuer: '', name: '', date: '', color: 'other', url: '' },
  },
  skills: {
    key: 'skills', title: 'Skills (the fleet)', itemTitle: (s) => `${s.title || 'New group'}${s.aircraft ? ` · ${s.aircraft}` : ''}`,
    fields: [
      { key: 'title', label: 'Group title', type: 'text' },
      { key: 'aircraft', label: 'Aircraft', type: 'aircraft', hint: 'Which airliner represents this skill group' },
      { key: 'photo_url', label: 'Photo URL (optional)', type: 'url', hint: 'Leave empty to use the built-in photo of this aircraft' },
      { key: 'items', label: 'Items (separate with ·)', type: 'textarea' },
    ],
    empty: { title: '', items: '', aircraft: '', photo_url: '' },
  },
};
