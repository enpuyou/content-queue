"use client";

import React, { useMemo } from "react";

/**
 * Transforms text to apply "Bionic Reading" formatting.
 * Bolds the first part of each word to guide the eye.
 */
export function BionicText({ text }: { text: string }) {
  const processedText = useMemo(() => {
    if (!text) return null;

    return text.split(/(\s+)/).map((part, i) => {
      // Preserve whitespace
      if (/^\s+$/.test(part)) return part;

      // Process word
      const len = part.length;
      if (len <= 1) return <span key={i}>{part}</span>;

      // Calculate bold length (usually first 40-50%)
      const boldLen = Math.ceil(len * 0.4);
      const boldPart = part.slice(0, boldLen);
      const normalPart = part.slice(boldLen);

      return (
        <React.Fragment key={i}>
          <strong className="font-bold text-[var(--color-text-primary)]">
            {boldPart}
          </strong>
          {normalPart}
        </React.Fragment>
      );
    });
  }, [text]);

  return <>{processedText}</>;
}
