// import { v4 as uuidv4 } from 'uuid';

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "list"
  | "image"
  | "raw";

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string; // The innerHTML or text content
  originalTag: string;
  attributes?: Record<string, string>;
}

/**
 * Parses an HTML string into a list of editable blocks.
 * This effectively "hydrates" static HTML into a block-based structure
 * similar to Notion or Medium, but derived from standard HTML tags.
 */
export function parseHtmlToBlocks(html: string): ContentBlock[] {
  if (typeof window === "undefined") return []; // Server-side safety

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: ContentBlock[] = [];

  // We primarily look at top-level children of the body
  // If the HTML is wrapped in a single <div>, we might want to unwrap it,
  // but for now let's assume standard extracted content structure.

  // Helper to process a node
  const processNode = (node: Element): void => {
    const tagName = node.tagName.toLowerCase();

    // Skip empty text nodes or irrelevant script/style tags if they somehow got here
    if (tagName === "script" || tagName === "style") return;

    let type: BlockType = "paragraph";
    const attributes: Record<string, string> = {};

    // Map tags to block types
    switch (tagName) {
      case "h1":
        type = "heading1";
        break;
      case "h2":
        type = "heading2";
        break;
      case "h3":
        type = "heading3";
        break;
      case "h4":
      case "h5":
      case "h6":
        type = "heading3";
        break; // normalize smaller headings
      case "p":
        type = "paragraph";
        break;
      case "ul":
      case "ol":
        type = "list";
        break; // Treat whole list as one block for now to preserve structure
      case "img":
        type = "image";
        attributes.src = node.getAttribute("src") || "";
        attributes.alt = node.getAttribute("alt") || "";
        break;
      case "figure":
        type = "image"; // Treat figure as image block for UI purposes
        break;
      case "div":
      case "section":
      case "article":
        // If it's a structural wrapper, recursively process children
        // But usually for simple extraction we treat div as paragraph or raw
        if (node.children.length > 0) {
          Array.from(node.children).forEach((child) => processNode(child));
          return;
        }
        type = "raw";
        break;
      default:
        type = "raw";
    }

    // Extract content
    // For lists, we keep the outerHTML to preserve <li> structure for the editor
    // For images, content might be empty or caption
    let content = node.innerHTML;
    if (type === "list" || type === "image") {
      content = node.outerHTML;
    }

    // Preserve relevant classes
    if (node.className) {
      attributes.className = node.className;
    }

    blocks.push({
      id: self.crypto.randomUUID(),
      type,
      content,
      originalTag: tagName,
      attributes,
    });
  };

  Array.from(doc.body.children).forEach((child) => processNode(child));

  // Fallback: If no blocks found (maybe it was just text?), wrap body innerHTML
  if (blocks.length === 0 && doc.body.innerHTML.trim().length > 0) {
    blocks.push({
      id: self.crypto.randomUUID(),
      type: "raw",
      content: doc.body.innerHTML,
      originalTag: "div",
    });
  }

  return blocks;
}

/**
 * Re-serializes blocks back into a single HTML string for saving.
 */
export function serializeBlocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      // Validation: Ensure content isn't wrapped weirdly if we edited it
      // For simple MVP we just concatenate the content wrapped in original tags?
      // Actually, 'content' for paragraph is innerHTML. We need to wrap it.

      const attrs = Object.entries(block.attributes || {})
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");

      const attrStr = attrs.length > 0 ? ` ${attrs}` : "";

      switch (block.type) {
        case "paragraph":
          return `<p${attrStr}>${block.content}</p>`;
        case "heading1":
          return `<h1${attrStr}>${block.content}</h1>`;
        case "heading2":
          return `<h2${attrStr}>${block.content}</h2>`;
        case "heading3":
          return `<h3${attrStr}>${block.content}</h3>`;
        case "list":
          return block.content; // Content is outerHTML for lists
        case "image":
          return block.content; // Content is outerHTML
        case "raw":
          return `<${block.originalTag}${attrStr}>${block.content}</${block.originalTag}>`;
        default:
          return `<${block.originalTag || "div"}${attrStr}>${block.content}</${block.originalTag || "div"}>`;
      }
    })
    .join("\n");
}
