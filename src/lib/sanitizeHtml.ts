import DOMPurify from "dompurify";

// Allow only basic inline + list formatting. No images, scripts, links, styles.
const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li"];
const ALLOWED_ATTR: string[] = [];

export function sanitizeRichText(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
  });
}

export function isRichTextEmpty(html: string): boolean {
  const clean = sanitizeRichText(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, "")
    .trim();
  return clean.length === 0;
}
