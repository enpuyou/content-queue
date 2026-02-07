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
  onHighlightClick?: (
    highlight: Highlight,
    clickedElement?: HTMLElement,
  ) => void;
  onImageClick?: (src: string) => void;
}

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

import parse, {
  DOMNode,
  Element,
  domToReact,
  attributesToProps,
} from "html-react-parser";
import InlineHighlight from "./InlineHighlight";

const HighlightRenderer = ({
  html,
  highlights,
  onHighlightClick,
  onImageClick,
  onDeleteHighlight,
  onUpdateHighlight,
  newlyCreatedHighlightId, // to trigger auto-open
}: HighlightRendererProps & {
  onDeleteHighlight?: (id: string) => void;
  onUpdateHighlight?: () => void;
  newlyCreatedHighlightId?: string | null;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>(html);
  const { settings } = useReadingSettings();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile(); // Check on mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // ... (Existing logic to process HTML with bionic reading and segments) ...
    // BUT instead of manipulating DOM directly and replacing nodes,
    // we should process the HTML string fully first, then parse it.

    // Actually, the existing logic builds an HTML string via DOM manipulation on fragments
    // but ultimately returns a String or modified DOM to dangerouslySetInnerHTML.

    // The previous implementation utilized `originalDoc` and `textNodes` to inject spans into a DOM structure,
    // then applied heading anchors, and finally set `renderedHtml` as a string.

    // We can keep the logic "as is" to generate the string with <span data-highlight-id="...">
    // and THEN use html-react-parser on THAT string.

    const activeHighlights = [...highlights];
    const parser = new DOMParser();

    // IMPORTANT: Count character positions on the ORIGINAL html first
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
          // NOTE: We don't need colorClasses here if InlineHighlight handles it contextually,
          // but we need to mark it for parser replacement.
          // We apply the ID so logic later can find it.
          span.dataset.highlightId = segment.highlight.id;
          span.dataset.highlightColor = segment.highlight.color; // Pass color via dataset
          span.dataset.highlightNote = segment.highlight.note || ""; // Pass note
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

  // ... (transform function)
  const transform = (node: DOMNode, _index: number) => {
    if (
      node instanceof Element &&
      node.name === "span" &&
      node.attribs["data-highlight-id"]
    ) {
      const id = node.attribs["data-highlight-id"];
      const color = node.attribs["data-highlight-color"];
      const note = node.attribs["data-highlight-note"];

      const highlight = highlights.find((h) => h.id === id);
      // Fallback if highlight not found in props (should match)
      const currentNote = highlight ? highlight.note : note;

      return (
        <InlineHighlight
          key={id}
          id={id}
          color={color}
          initialNote={currentNote}
          initialOpen={newlyCreatedHighlightId === id}
          onDelete={onDeleteHighlight}
          onUpdate={onUpdateHighlight}
          onHighlightClick={
            onHighlightClick
              ? () =>
                  onHighlightClick(
                    highlight || {
                      id,
                      color,
                      text: "",
                      start_offset: 0,
                      end_offset: 0,
                    },
                  )
              : undefined
          } // Mock highlight object if missing, but should be found. Actually standard behavior is fine.
          isMobile={isMobile}
        >
          {domToReact(node.children as DOMNode[], { replace: transform })}
        </InlineHighlight>
      );
    }
    // ...

    // Handle Images
    if (node instanceof Element && node.name === "img" && onImageClick) {
      const src = node.attribs.src;
      if (src) {
        const props = attributesToProps(node.attribs);
        // Return props but add onClick
        // Ensure alt is a string (props.alt could be boolean or undefined)
        const altText =
          typeof props.alt === "string" ? props.alt : "Article image";
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...props}
            alt={altText}
            onClick={(e) => {
              e.preventDefault();
              onImageClick(src);
            }}
            className={`cursor-zoom-in ${props.className || ""}`}
          />
        );
      }
    }
  };

  return (
    <div
      id="article-content"
      ref={containerRef}
      className={`cursor-text select-text ${settings.bionicReading ? "" : ""}`} // Removed [&_img] since handled in parser
    >
      {parse(renderedHtml, { replace: transform })}
    </div>
  );
};

export default React.memo(HighlightRenderer);
