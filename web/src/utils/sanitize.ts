/**
 * HTML Sanitization Utility
 *
 * Provides DOMPurify-based sanitization for HTML content to prevent XSS attacks.
 * Used to sanitize marked.js output before rendering with v-html.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 *
 * Allows safe HTML elements commonly used in terminal output while
 * stripping potentially dangerous content like scripts, event handlers, etc.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    // Allow common formatting elements used in terminal output
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'span', 'div',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'code', 'pre', 'kbd', 'samp', 'var',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      // Other
      'hr', 'blockquote', 'a',
      // Tables (for formatted output)
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      'class', 'id', 'style',
      'href', 'target', 'rel',
      // Table attributes
      'colspan', 'rowspan',
    ],
    // Require rel="noopener" on links for security
    ADD_ATTR: ['rel'],
    // Force all links to open in new tab safely
    ALLOW_DATA_ATTR: false,
    // Don't allow javascript: URLs
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}
