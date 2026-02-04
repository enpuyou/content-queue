"use client";

import React, { useRef, useEffect, useState } from "react";
import { addHeadingAnchors } from "@/lib/bionicReading";
import { useReadingSettings } from "@/contexts/ReadingSettingsContext";

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
  selection: "native-selection", // Uses system highlight colors
};

/**
 * Helper to wrap start of words in strong tags for Bionic Reading
 */
const applyBionicInfoToText = (text: string): string => {
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part.length <= 1) return part;
      const splitIndex = Math.ceil(part.length * 0.4);
      return `<strong>${part.slice(0, splitIndex)}</strong>${part.slice(splitIndex)}`;
    })
    .join("");
};

const HighlightRenderer = ({
  html,
  highlights,
  onHighlightClick,
}: HighlightRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>(html);
  const { settings } = useReadingSettings();

  useEffect(() => {
    const activeHighlights = [...highlights];

    const parser = new DOMParser();

    // IMPORTANT: Count character positions on the ORIGINAL html first
    // This matches how Reader.tsx calculates offsets from content.full_text
    const originalDoc = parser.parseFromString(html, "text/html");
    const walker = document.createTreeWalker(
      originalDoc.body,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let charIndex = 0;
    const textNodes: Array<{ node: Text; startChar: number; endChar: number }> =
      [];

    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      const nodeText = textNode.textContent || "";
      if (nodeText.length === 0) continue;

      textNodes.push({
        node: textNode,
        startChar: charIndex,
        endChar: charIndex + nodeText.length,
      });
      charIndex += nodeText.length;
    }

    textNodes.forEach(({ node, startChar, endChar }) => {
      const parent = node.parentNode;
      if (!parent) return;

      const nodeText = node.textContent || "";
      const overlappingHighlights = activeHighlights
        .filter((h) => h.start_offset < endChar && h.end_offset > startChar)
        .sort((a, b) => a.start_offset - b.start_offset);

      interface Segment {
        start: number;
        end: number;
        highlight?: Highlight;
      }

      const segments: Segment[] = [];
      let currentPos = 0;

      if (overlappingHighlights.length > 0) {
        overlappingHighlights.forEach((highlight) => {
          const highlightStart = Math.max(
            0,
            highlight.start_offset - startChar,
          );
          const highlightEnd = Math.min(
            nodeText.length,
            highlight.end_offset - startChar,
          );

          if (highlightEnd <= currentPos) return;

          if (currentPos < highlightStart) {
            segments.push({ start: currentPos, end: highlightStart });
            currentPos = highlightStart;
          }

          const segmentStart = Math.max(currentPos, highlightStart);
          const segmentEnd = highlightEnd;

          if (segmentStart < segmentEnd) {
            segments.push({ start: segmentStart, end: segmentEnd, highlight });
            currentPos = segmentEnd;
          }
        });
      }

      if (currentPos < nodeText.length) {
        segments.push({ start: currentPos, end: nodeText.length });
      }

      const fragment = document.createDocumentFragment();
      segments.forEach((segment) => {
        const rawText = nodeText.substring(segment.start, segment.end);

        // Apply Bionic Reading transformation if enabled
        const contentHtml = settings.bionicReading
          ? applyBionicInfoToText(rawText)
          : rawText;

        if (segment.highlight) {
          const span = document.createElement("span");
          span.className = colorClasses[segment.highlight.color];
          if (segment.highlight.color !== "selection") {
            span.style.backgroundColor = `var(--highlight-${segment.highlight.color})`;
          }
          span.dataset.highlightId = segment.highlight.id;
          // Use innerHTML because contentHtml might contain <strong> tags
          span.innerHTML = contentHtml;
          fragment.appendChild(span);
        } else {
          if (settings.bionicReading) {
            const span = document.createElement("span");
            span.innerHTML = contentHtml;
            fragment.appendChild(span);
          } else {
            fragment.appendChild(document.createTextNode(rawText));
          }
        }
      });

      parent.replaceChild(fragment, node);
    });

    // Apply heading anchors to the final processed HTML
    setRenderedHtml(addHeadingAnchors(originalDoc.body.innerHTML));
  }, [html, highlights, settings.bionicReading]);

  return (
    <div
      id="article-content"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        // Check closest because click might be on a <strong> tag inside the span
        const highlightElement = target.closest(
          "[data-highlight-id]",
        ) as HTMLElement;
        if (highlightElement && highlightElement.dataset.highlightId) {
          const highlight = highlights.find(
            (h) => h.id === highlightElement.dataset.highlightId,
          );
          if (highlight && onHighlightClick) {
            onHighlightClick(highlight, highlightElement);
          }
        }
      }}
    />
  );
};

export default React.memo(HighlightRenderer);
