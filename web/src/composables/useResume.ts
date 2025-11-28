/**
 * Resume data composable
 * Loads and formats resume data from YAML
 */

import { ref, computed } from 'vue';
import { loadResumeYaml } from '../utils/yamlLoader';
import { formatContactString } from '../utils/env';
import {
  formatSectionHeader,
  formatSkills,
  formatExperienceEntry,
  formatEarlierRoles,
  formatCertsAndEducation,
} from '../utils/resumeFormatter';
import type { ResumeData, Experience } from '../types/resume';

// Section titles
const SECTION_PROFILE = "## PROFILE";
const SECTION_COMPETENCIES = "## CORE COMPETENCIES";
const SECTION_EXPERIENCE = "## PROFESSIONAL EXPERIENCE";
const SECTION_EARLIER = "## EARLIER ROLES";
const SECTION_CERTS_EDU = "## CERTIFICATIONS & EDUCATION";

// Reactive state
const resumeData = ref<ResumeData | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

/**
 * Load resume data from YAML
 */
export async function loadResume(): Promise<void> {
  if (resumeData.value) {
    return; // Already loaded
  }
  
  isLoading.value = true;
  error.value = null;
  
  try {
    const data = await loadResumeYaml();
    
    // Inject header from environment
    data.header = {
      name: import.meta.env.VITE_RESUME_NAME || "Your Name",
      contact: formatContactString(), 
    };
    
    resumeData.value = data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load resume data';
    console.error('Error loading resume:', err);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Get profile text
 */
export function getProfile(): string {
  if (!resumeData.value) return '';
  return resumeData.value.profile;
}

/**
 * Get formatted skills
 */
export function getSkills(): string {
  if (!resumeData.value) return '';
  
  const header = formatSectionHeader(SECTION_COMPETENCIES);
  const skills = formatSkills(resumeData.value.skills);
  return `${header}${skills}\n`;
}

/**
 * Get formatted experience
 * @param filter - Optional regex pattern or company name to filter by
 * @param showOnlyRelevant - If true, only show relevant sections (default: true when no filter)
 */
export function getExperience(filter?: string, showOnlyRelevant?: boolean): string {
  if (!resumeData.value) return '';
  
  const header = formatSectionHeader(SECTION_EXPERIENCE);
  let experiences = resumeData.value.experience;
  
  // Default: show only relevant sections when no filter is provided
  const shouldShowOnlyRelevant = showOnlyRelevant !== undefined 
    ? showOnlyRelevant 
    : !filter; // Show relevant by default when no filter
  
  // Apply filter if provided
  if (filter) {
    // Check if filter is a regex pattern (starts with /)
    let pattern: RegExp;
    if (filter.startsWith('/') && filter.includes('/')) {
      // Extract pattern and flags: /pattern/flags or /pattern/
      const match = filter.match(/^\/(.+)\/([gimuy]*)$/);
      if (match) {
        const [, patternStr, flags] = match;
        pattern = new RegExp(patternStr, flags || 'i');
      } else {
        // Invalid regex format, treat as literal string
        pattern = new RegExp(filter.replace(/^\/|\/$/g, ''), 'i');
      }
    } else {
      // Plain string, case-insensitive match
      pattern = new RegExp(filter, 'i');
    }
    
    experiences = experiences.filter(job => 
      pattern.test(job.company)
    );
    
    if (experiences.length === 0) {
      return `${header}No experience found matching "${filter}"\n`;
    }
  }
  
  const formatted = experiences.map(job => formatExperienceEntry(job, shouldShowOnlyRelevant)).join('\n');
  return `${header}${formatted}`;
}

/**
 * Get formatted contact information
 */
export function getContact(): string {
  if (!resumeData.value?.header) return '';
  
  const { name, contact } = resumeData.value.header;
  return `${name}\n${contact}\n`;
}

/**
 * Get formatted earlier roles
 */
export function getEarlierRoles(): string {
  if (!resumeData.value) return '';
  
  const header = formatSectionHeader(SECTION_EARLIER);
  const roles = formatEarlierRoles(resumeData.value.earlier);
  return `${header}---\n${roles}\n`;
}

/**
 * Get formatted certifications and education
 */
export function getCertsAndEducation(): string {
  if (!resumeData.value) return '';
  
  const header = formatSectionHeader(SECTION_CERTS_EDU);
  const content = formatCertsAndEducation(
    resumeData.value.certs,
    resumeData.value.education
  );
  return `${header}---\n${content}\n`;
}

/**
 * Get full formatted resume
 */
export function getFullResume(): string {
  if (!resumeData.value) return '';
  
  const lines: string[] = [];
  
  // Header
  if (resumeData.value.header) {
    lines.push(resumeData.value.header.name);
    lines.push(resumeData.value.header.contact);
    lines.push('');
  }
  
  // Profile
  lines.push(formatSectionHeader(SECTION_PROFILE));
  lines.push(resumeData.value.profile);
  lines.push('');
  
  // Skills
  lines.push(getSkills());
  
  // Experience (show all sections in full resume)
  lines.push(getExperience(undefined, false));
  
  // Earlier roles
  if (resumeData.value.earlier.length > 0) {
    lines.push(getEarlierRoles());
  }
  
  // Certs and Education
  lines.push(getCertsAndEducation());
  
  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Composable export
 */
export function useResume() {
  return {
    resumeData: computed(() => resumeData.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    loadResume,
    getProfile,
    getSkills,
    getExperience,
    getContact,
    getEarlierRoles,
    getCertsAndEducation,
    getFullResume,
  };
}

