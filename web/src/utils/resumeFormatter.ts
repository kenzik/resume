/**
 * Text formatting utilities for resume display
 * Matches Python CLI output style (plain text, proper indentation)
 */

import type { Experience, ResumeSection } from '../types/resume';

// Section titles that should not be displayed as headers
const SKIP_SECTION_TITLES = new Set(["Highlights", "Key Projects"]);

// Separators
const SEPARATOR_JOB = " | ";
const SEPARATOR_SKILLS = " • ";
const SEPARATOR_LINE = "─────────────────────────────────────────────────────────────────────────────";

/**
 * Format section header with separator line
 */
export function formatSectionHeader(title: string): string {
  return `${title}\n${SEPARATOR_LINE}\n`;
}

/**
 * Format skills list
 */
export function formatSkills(skills: string[]): string {
  return skills.join(SEPARATOR_SKILLS);
}

/**
 * Format a single experience entry
 */
export function formatExperienceEntry(job: Experience): string {
  const lines: string[] = [];
  
  // Company | Title (bold-like, but plain text)
  lines.push(`${job.company}${SEPARATOR_JOB}${job.title}`);
  
  // Date
  lines.push(job.date);
  lines.push(''); // Blank line
  
  // Summary if present
  if (job.summary) {
    lines.push(job.summary);
    lines.push('');
  }
  
  // Sections with bullets
  if (job.sections) {
    for (const section of job.sections) {
      // Only show section title if it's not in skip list
      if (section.title && !SKIP_SECTION_TITLES.has(section.title)) {
        lines.push(section.title);
      }
      
      // Bullets (indented with 2 spaces and dash)
      for (const bullet of section.bullets) {
        lines.push(`  - ${bullet}`);
      }
      lines.push(''); // Blank line after section
    }
  }
  
  // Tech stack if present (indented, italic-like)
  if (job.tech) {
    lines.push(`  ${job.tech}`);
    lines.push(''); // Blank line
  }
  
  return lines.join('\n');
}

/**
 * Format earlier roles
 */
export function formatEarlierRoles(roles: string[]): string {
  return roles.map(role => `  - ${role}`).join('\n');
}

/**
 * Format certifications and education
 */
export function formatCertsAndEducation(certs: string[], education: string[]): string {
  const lines: string[] = [];
  
  // Certifications
  for (const cert of certs) {
    const isInProgress = cert.includes("In Progress");
    if (isInProgress) {
      lines.push(`  - ${cert}`);
    } else {
      lines.push(`  - ${cert}`);
    }
  }
  
  // Education
  for (const edu of education) {
    const isUniversity = edu.includes("University");
    if (isUniversity) {
      lines.push(`  - ${edu}`);
    } else {
      lines.push(`  - ${edu}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Check if a section title should be displayed
 */
export function shouldShowSectionTitle(title?: string): boolean {
  return title !== undefined && !SKIP_SECTION_TITLES.has(title);
}

