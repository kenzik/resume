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

/**
 * Format section header (markdown h2)
 */
export function formatSectionHeader(title: string): string {
  return `\n${title}\n\n`;
}

/**
 * Format skills list
 */
export function formatSkills(skills: string[]): string {
  return skills.join(SEPARATOR_SKILLS);
}

/**
 * Check if a section is relevant based on keywords/patterns
 * Uses fuzzy matching to find sections with relevant content
 */
function isRelevantSection(section: ResumeSection, job: Experience): boolean {
  // Keywords that indicate relevance (case-insensitive)
  const relevanceKeywords = [
    /architect|design|build|deliver|lead|create|develop|implement|optimize|scale/i,
    /ai|ml|llm|rag|gcp|cloud|infrastructure|platform|real-time|data/i,
    /enterprise|production|mvp|solution|system|service|api|microservice/i,
  ];
  
  // Check section title
  if (section.title) {
    const titleText = section.title.toLowerCase();
    if (relevanceKeywords.some(pattern => pattern.test(titleText))) {
      return true;
    }
  }
  
  // Check bullets for relevance
  const allBulletText = section.bullets.join(' ').toLowerCase();
  if (relevanceKeywords.some(pattern => pattern.test(allBulletText))) {
    return true;
  }
  
  // Check tech stack if available
  if (job.tech) {
    const techText = job.tech.toLowerCase();
    if (relevanceKeywords.some(pattern => pattern.test(techText))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Format a single experience entry
 * @param showOnlyRelevant - If true, only show sections that match relevance criteria
 */
export function formatExperienceEntry(job: Experience, showOnlyRelevant: boolean = false): string {
  const lines: string[] = [];
  
  // Company | Title (markdown bold)
  lines.push(`___`);
  lines.push(`**${job.company}**${SEPARATOR_JOB}**${job.title}**`);
  lines.push('');
  
  // Date (markdown italic)
  lines.push(`*${job.date}*`);
  lines.push('');
  
  // Summary if present
  if (job.summary) {
    lines.push(job.summary);
    lines.push('');
  }
  
  // Sections with bullets
  if (job.sections) {
    const sectionsToShow = showOnlyRelevant
      ? job.sections.filter(section => isRelevantSection(section, job))
      : job.sections;
    
    if (sectionsToShow.length === 0 && showOnlyRelevant) {
      // If filtering but no relevant sections found, show all sections
      for (const section of job.sections) {
        if (section.title && !SKIP_SECTION_TITLES.has(section.title)) {
          lines.push(`**${section.title}**`);
          lines.push('');
        }
        for (const bullet of section.bullets) {
          lines.push(`- ${bullet}`);
        }
        lines.push('');
      }
    } else {
      for (const section of sectionsToShow) {
        // Only show section title if it's not in skip list (markdown bold)
        if (section.title && !SKIP_SECTION_TITLES.has(section.title)) {
          lines.push(`**${section.title}**`);
          lines.push('');
        }
        
        // Bullets (markdown list)
        for (const bullet of section.bullets) {
          lines.push(`- ${bullet}`);
        }
        lines.push('');
      }
    }
  }
  
  // Tech stack if present (markdown italic)
  if (job.tech) {
    lines.push(`*Tech: ${job.tech}*`);
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Format earlier roles (markdown list)
 */
export function formatEarlierRoles(roles: string[]): string {
  return roles.map(role => `- ${role}`).join('\n');
}

/**
 * Format certifications and education (markdown list)
 */
export function formatCertsAndEducation(certs: string[], education: string[]): string {
  const lines: string[] = [];
  
  // Certifications
  for (const cert of certs) {
    lines.push(`- ${cert}`);
  }
  
  // Education
  for (const edu of education) {
    lines.push(`- ${edu}`);
  }
  
  return lines.join('\n');
}

/**
 * Check if a section title should be displayed
 */
export function shouldShowSectionTitle(title?: string): boolean {
  return title !== undefined && !SKIP_SECTION_TITLES.has(title);
}

