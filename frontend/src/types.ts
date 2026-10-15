export interface Profile {
  eyebrow: string;
  headline: string;
  headline_emphasis: string;
  lede: string;
  photo_url: string;
  from_code: string;
  from_city: string;
  to_code: string;
  to_city: string;
  passenger: string;
  flight: string;
  gate: string;
  seat: string;
  class_of: string;
  status: string;
  boarding_group: string;
}

export interface Stat { value: string; label: string }

export interface Project {
  date: string;
  code: string;
  board_name: string;
  status: string;
  stack: string;
  title: string;
  description: string;
  live_url: string;
  source_url: string;
}

export interface LogEntry {
  date_top: string;
  date_bottom: string;
  type: string;
  title: string;
  bullets: string[];
  text: string;
  link_label: string;
  link_url: string;
}

export interface Certification {
  issuer: string;
  name: string;
  date: string;
  color: 'aws' | 'gcp' | 'oci' | 'other' | string;
  url: string;
}

export interface SkillGroup { title: string; items: string; aircraft?: string; photo_url?: string }

export interface Contact {
  heading: string;
  text: string;
  email: string;
  linkedin_url: string;
  linkedin_label: string;
  github_url: string;
  github_label: string;
}

export interface Content {
  profile: Profile;
  stats: Stat[];
  projects: Project[];
  logbook: LogEntry[];
  certifications: Certification[];
  skills: SkillGroup[];
  contact: Contact;
}

export type ListKey = 'stats' | 'projects' | 'logbook' | 'certifications' | 'skills';
