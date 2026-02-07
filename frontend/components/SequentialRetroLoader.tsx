"use client";

import { useState, useEffect } from "react";

interface SequentialRetroLoaderProps {
  messages: string[];
  interval?: number; // Time between message changes in ms
  className?: string;
  onComplete?: () => void;
}

export default function SequentialRetroLoader({
  messages,
  interval = 2000,
  className = "",
  onComplete,
}: SequentialRetroLoaderProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  // Cycle messages
  useEffect(() => {
    if (currentMessageIndex >= messages.length - 1) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCurrentMessageIndex((prev) => prev + 1);
    }, interval);

    return () => clearTimeout(timer);
  }, [currentMessageIndex, messages.length, interval, onComplete]);

  // Cycle dots
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(dotInterval);
  }, []);

  return (
    <span
      className={`font-mono flex items-center justify-center gap-2 ${className}`}
    >
      <span>
        {messages[currentMessageIndex]}
        {dots}
      </span>
      <span className="inline-block w-2 h-4 bg-current animate-pulse align-middle opacity-70"></span>
    </span>
  );
}
