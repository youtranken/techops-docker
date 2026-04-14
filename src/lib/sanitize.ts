/**
 * XSS Sanitization utility
 * 
 * Uses ALLOWLIST approach (safer than blocklist).
 * Only allows known-safe tags and attributes.
 */

// Allowed tags - only safe formatting tags
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 's', 'strong', 'em',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'span', 'div',
]);

// Allowed attributes per tag
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  '*': new Set(['class', 'id']), // Global attrs
};

/**
 * Sanitize HTML content using ALLOWLIST approach.
 * 
 * @param dirty - HTML string to sanitize
 * @param allowImages - Allow img tags (default: false)
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string, allowImages = false): string {
  if (!dirty) return '';

  let clean = dirty;

  // Add img to allowed tags if enabled
  const allowedTags = new Set(ALLOWED_TAGS);
  if (allowImages) {
    allowedTags.add('img');
  }

  // Remove all tags not in allowlist
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const tag = tagName.toLowerCase();
    if (!allowedTags.has(tag)) {
      return ''; // Remove disallowed tag entirely
    }
    return match;
  });

  // Remove ALL event handlers (on*)
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/vbscript\s*:/gi, '');
  clean = clean.replace(/data\s*:/gi, '');

  // Sanitize href attributes - only allow http, https, mailto
  clean = clean.replace(
    /(<a[^>]*\s+href\s*=\s*["'])([^"']*)["']/gi,
    (match, prefix, url) => {
      const lowerUrl = url.toLowerCase().trim();
      if (
        lowerUrl.startsWith('http://') ||
        lowerUrl.startsWith('https://') ||
        lowerUrl.startsWith('mailto:') ||
        lowerUrl.startsWith('/')
      ) {
        return match;
      }
      return `${prefix}#"`; // Replace unsafe URL with #
    }
  );

  // Remove img onerror/onload even if images allowed
  if (allowImages) {
    clean = clean.replace(/(<img[^>]*)\s+(onerror|onload)\s*=\s*["'][^"']*["']([^>]*>)/gi, '$1$3');
  }

  return clean;
}
