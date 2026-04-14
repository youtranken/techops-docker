import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../sanitize';

describe('sanitizeHtml', () => {
  describe('XSS Prevention', () => {
    it('should remove script tags', () => {
      const dirty = '<p>Hello</p><script>alert("xss")</script>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('<p>Hello</p>');
    });

    it('should remove onerror attributes from img tags', () => {
      const dirty = '<img src="x" onerror="alert(1)">';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onerror');
    });

    it('should remove onclick attributes', () => {
      const dirty = '<button onclick="alert(1)">Click</button>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onclick');
    });

    it('should remove javascript: URLs', () => {
      const dirty = '<a href="javascript:alert(1)">Link</a>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const dirty = '<div onmouseover="alert(1)">Hover</div>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onmouseover');
    });

    it('should remove inline SVG with scripts', () => {
      const dirty = '<svg onload="alert(1)"><circle r="50"/></svg>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onload');
    });
  });

  describe('Safe HTML Preservation', () => {
    it('should preserve basic formatting tags', () => {
      const safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const clean = sanitizeHtml(safe);
      expect(clean).toContain('<strong>');
      expect(clean).toContain('<em>');
      expect(clean).toContain('<p>');
    });

    it('should preserve lists', () => {
      const safe = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const clean = sanitizeHtml(safe);
      expect(clean).toContain('<ul>');
      expect(clean).toContain('<li>');
    });

    it('should preserve headings', () => {
      const safe = '<h1>Title</h1><h2>Subtitle</h2>';
      const clean = sanitizeHtml(safe);
      expect(clean).toContain('<h1>');
      expect(clean).toContain('<h2>');
    });

    it('should preserve safe links', () => {
      const safe = '<a href="https://example.com">Link</a>';
      const clean = sanitizeHtml(safe);
      expect(clean).toContain('href="https://example.com"');
    });

    it('should preserve tables', () => {
      const safe = '<table><tr><td>Cell</td></tr></table>';
      const clean = sanitizeHtml(safe);
      expect(clean).toContain('<table>');
      expect(clean).toContain('<td>');
    });
  });

  describe('Image Handling', () => {
    it('should strip img tags by default', () => {
      const html = '<p>Text</p><img src="image.jpg">';
      const clean = sanitizeHtml(html);
      expect(clean).not.toContain('<img');
    });

    it('should allow img tags when allowImages is true', () => {
      const html = '<p>Text</p><img src="image.jpg" alt="Test">';
      const clean = sanitizeHtml(html, true);
      expect(clean).toContain('<img');
      expect(clean).toContain('src="image.jpg"');
    });

    it('should still remove img onerror when images allowed', () => {
      const html = '<img src="x" onerror="alert(1)" alt="Test">';
      const clean = sanitizeHtml(html, true);
      expect(clean).not.toContain('onerror');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle plain text without HTML', () => {
      const text = 'Just plain text';
      expect(sanitizeHtml(text)).toBe('Just plain text');
    });

    it('should handle malformed HTML', () => {
      const malformed = '<p>Unclosed paragraph';
      const clean = sanitizeHtml(malformed);
      expect(clean).toContain('Unclosed paragraph');
    });

    it('should handle nested dangerous content', () => {
      const nested = '<div><p><script>alert(1)</script></p></div>';
      const clean = sanitizeHtml(nested);
      expect(clean).not.toContain('<script>');
    });
  });
});
