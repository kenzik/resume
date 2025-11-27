/**
 * Environment variable utilities for resume data
 * Uses Vite's import.meta.env for environment variables
 */

const REDACTED_LOC = "[REDACTED LOC]";
const REDACTED_TEL = "[REDACTED TEL]";

export interface ContactInfo {
  name: string;
  cityState: string;
  phone: string;
  email: string;
  linkedin: string;
}

/**
 * Get contact information from environment variables
 * Provides redacted defaults if not set
 */
export function getContactInfo(revealPII: boolean = false): ContactInfo {
  return {
    name: import.meta.env.VITE_RESUME_NAME || "Your Name",
    cityState: revealPII 
      ? (import.meta.env.VITE_RESUME_CITY_STATE || "City, State")
      : REDACTED_LOC,
    phone: revealPII
      ? (import.meta.env.VITE_RESUME_PHONE || "555-555-5555")
      : REDACTED_TEL,
    email: import.meta.env.VITE_RESUME_EMAIL || "email@example.com",
    linkedin: import.meta.env.VITE_RESUME_LINKEDIN || "linkedin.com/in/user",
  };
}

/**
 * Format contact info as a single string
 */
export function formatContactString(revealPII: boolean = false): string {
  const contact = getContactInfo(revealPII);
  const parts = [contact.cityState, contact.phone, contact.email, contact.linkedin];
  return parts.join(" | ");
}

