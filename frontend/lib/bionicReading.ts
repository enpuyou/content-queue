/**
 * Convert text to bionic reading format.
 * Bolds the first ~50% of each word to create fixation points for faster reading.
 *
 * Example: "The quick brown fox" becomes "Th**e qu**ick br**own f**ox"
 * (where ** represents bold tags)
 */
export function toBionic(html: string): string {
  // Only process text nodes, not HTML tags
  return html.replace(/>([^<]+)</g, (_match, text) => {
    const bionicText = text.replace(/\b(\w+)\b/g, (word: string) => {
      if (word.length <= 1) return word;
      const boldLen = Math.ceil(word.length * 0.5);
      return `<strong>${word.slice(0, boldLen)}</strong>${word.slice(boldLen)}`;
    });
    return `>${bionicText}<`;
  });
}

/**
 * Add anchor IDs and hover links to headings in HTML.
 * Converts:
 *   <h2>My Section Title</h2>
 * To:
 *   <h2 id="my-section-title">
 *     <a href="#my-section-title" class="heading-anchor">#</a>
 *     My Section Title
 *   </h2>
 */
export function addHeadingAnchors(html: string): string {
  if (typeof document === "undefined") return html; // SSR safety

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("h1, h2, h3, h4").forEach((heading) => {
    // Generate ID from heading text
    const id =
      heading.textContent
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "";

    if (!id) return; // Skip if no text content

    heading.id = id;

    // Create anchor link
    const anchor = doc.createElement("a");
    anchor.href = `#${id}`;
    anchor.className = "heading-anchor";
    anchor.textContent = "#";
    anchor.setAttribute("aria-label", `Link to ${heading.textContent}`);

    // Prepend anchor to heading
    heading.prepend(anchor);
  });

  return doc.body.innerHTML;
}

/**
 * Sanitize HTML content before saving.
 * Removes:
 * 1. Heading anchors (# links)
 * 2. Ephemeral UI elements (highlight editors, indicators)
 */
export function sanitizeContentHtml(html: string): string {
  if (typeof document === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove heading anchors
  doc.querySelectorAll(".heading-anchor").forEach((anchor) => {
    anchor.remove();
  });

  // Remove ephemeral UI (editors, indicators)
  // These are temporarily removed before formatting and restored after,
  // but we still need to clean them before saving
  doc.querySelectorAll('[data-ephemeral="true"]').forEach((el) => {
    el.remove();
  });

  return doc.body.innerHTML;
}
