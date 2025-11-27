/**
 * TypeScript interfaces for resume data structure
 * Matches the YAML structure in kenzik.yml
 */

export interface ResumeSection {
  title: string;
  bullets: string[];
}

export interface Experience {
  company: string;
  title: string;
  date: string;
  summary?: string;
  sections?: ResumeSection[];
  tech?: string;
}

export interface ResumeHeader {
  name: string;
  contact: string;
}

export interface WebConfig {
  motd: string;
}

export interface ResumeData {
  profile: string;
  skills: string[];
  experience: Experience[];
  earlier: string[];
  certs: string[];
  education: string[];
  header?: ResumeHeader; // Injected from env vars
}

export interface ResumeYamlData {
  profile: string;
  skills: string[];
  experience: Experience[];
  earlier?: string[];
  certs?: string[];
  education?: string[];
}

export interface YamlData {
  web?: WebConfig;
  resume: ResumeYamlData;
}

