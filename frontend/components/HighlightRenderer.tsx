"use client";

import React, { useRef, useEffect, useState } from "react";

interface Highlight {
  id: string;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  note?: string;
}

interface HighlightRendererProps {
  html: string;
  highlights: Highlight[];
  onHighlightClick?: (highlight: Highlight) => void;
}

const colorClasses: Record<string, string> = {
  yellow:
    "hover:opacity-80 transition-opacity cursor-pointer transition-colors",
  green: "hover:opacity-80 transition-opacity cursor-pointer transition-colors",
  blue: "hover:opacity-80 transition-opacity cursor-pointer transition-colors",
  pink: "hover:opacity-80 transition-opacity cursor-pointer transition-colors",
  purple:
    "hover:opacity-80 transition-opacity cursor-pointer transition-colors",
};

const HighlightRenderer = ({
  html,
  highlights,
  onHighlightClick,
}: HighlightRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>(html);

  useEffect(() => {
    // Combine existing highlights with temporary selection if present
    const activeHighlights = [...highlights];

    if (activeHighlights.length === 0) {
      setRenderedHtml(html);
      return;
    }

    // Parse HTML fresh every time
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Get all text nodes from the parsed DOM
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);

    let charIndex = 0;
    const textNodes: Array<{ node: Text; startChar: number; endChar: number }> =
      [];

    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      const nodeLength = textNode.textContent?.length || 0;
      textNodes.push({
        node: textNode,
        startChar: charIndex,
        endChar: charIndex + nodeLength,
      });
      charIndex += nodeLength;
    }

    // Process each text node once, applying all overlapping highlights
    textNodes.forEach(({ node, startChar, endChar }) => {
      const parent = node.parentNode;
      if (!parent) return;

      const nodeText = node.textContent || "";

      // Find all highlights that overlap with this text node
      const overlappingHighlights = activeHighlights
        .filter((h) => h.start_offset < endChar && h.end_offset > startChar)
        .sort((a, b) => a.start_offset - b.start_offset); // Sort by start position

      if (overlappingHighlights.length === 0) return;

      // Create segments with highlight information
      interface Segment {
        start: number; // relative to node start
        end: number;
        highlight?: Highlight;
      }

      const segments: Segment[] = [];
      let currentPos = 0;

      overlappingHighlights.forEach((highlight) => {
        const highlightStart = Math.max(0, highlight.start_offset - startChar);
        const highlightEnd = Math.min(
          nodeText.length,
          highlight.end_offset - startChar,
        );

        // Skip this highlight if it's completely before our current position
        // (this happens when highlights overlap - we already processed this range)
        if (highlightEnd <= currentPos) {
          return;
        }

        // Add non-highlighted segment before this highlight if needed
        if (currentPos < highlightStart) {
          segments.push({ start: currentPos, end: highlightStart });
          currentPos = highlightStart;
        }

        // If this highlight overlaps with where we are, only add the non-overlapping part
        const segmentStart = Math.max(currentPos, highlightStart);
        const segmentEnd = highlightEnd;

        if (segmentStart < segmentEnd) {
          segments.push({
            start: segmentStart,
            end: segmentEnd,
            highlight,
          });
          currentPos = segmentEnd;
        }
      });

      // Add remaining non-highlighted text after all highlights
      if (currentPos < nodeText.length) {
        segments.push({ start: currentPos, end: nodeText.length });
      }

      // Build DOM nodes from segments
      const fragment = document.createDocumentFragment();
      segments.forEach((segment) => {
        const text = nodeText.substring(segment.start, segment.end);

        if (segment.highlight) {
          const span = document.createElement("span");
          span.className = colorClasses[segment.highlight.color];
          if (segment.highlight.color !== "temp-selection") {
            span.style.backgroundColor = `var(--highlight-${segment.highlight.color})`;
            span.dataset.highlightId = segment.highlight.id; // Only add ID for real highlights
          }
          span.textContent = text;
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(text));
        }
      });

      // Replace the original text node with our fragment
      parent.replaceChild(fragment, node);
    });

    // Update the rendered HTML
    setRenderedHtml(doc.body.innerHTML);
  }, [html, highlights]);

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.highlightId) {
          const highlight = highlights.find(
            (h) => h.id === target.dataset.highlightId,
          );
          if (highlight && onHighlightClick) {
            onHighlightClick(highlight);
          }
        }
      }}
    />
  );
};

// Use memo to prevent re-renders when parent state changes but props are stable
export default React.memo(HighlightRenderer);
