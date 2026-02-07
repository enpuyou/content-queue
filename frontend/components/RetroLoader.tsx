"use client";

import { useState, useEffect } from "react";

interface RetroLoaderProps {
  text?: string;
  className?: string;
}

export default function RetroLoader({
  text = "Loading",
  className = "",
}: RetroLoaderProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`font-mono inline-block ${className}`}>
      {text}
      {dots}
      <span className="inline-block w-2 h-4 bg-[var(--color-accent)] ml-1 animate-pulse align-middle opacity-70"></span>
    </span>
  );
}
