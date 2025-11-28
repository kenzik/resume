/**
 * Environment variable utilities for resume data
 * Uses Vite's import.meta.env for environment variables
 */

export interface ContactInfo {
  cityState: string;
  linkedin: string;
  github: string;
}

/**
 * Get contact information from environment variables
 * Provides redacted defaults if not set
 */
export function getContactInfo(): ContactInfo {
  return {
    cityState: import.meta.env.VITE_RESUME_CITY_STATE || "City, State",
    linkedin: import.meta.env.VITE_RESUME_LINKEDIN || "linkedin.com/in/user",
    github: import.meta.env.VITE_RESUME_GITHUB || "github.com/user",
  };
}

/**
 * Format contact info as a single string
 */
export function formatContactString(): string {
  const contact = getContactInfo();
  const parts = [contact.cityState, contact.linkedin, contact.github];
  return parts.join(" | ");
}

