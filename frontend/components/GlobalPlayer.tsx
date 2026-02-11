"use client";

import { usePathname } from "next/navigation";
import NowPlaying from "./NowPlaying";

export default function GlobalPlayer() {
  const pathname = usePathname();

  const isLanding = pathname === "/";
  const isAuthPage = ["/login", "/register"].includes(pathname);

  if (!isLanding && !isAuthPage) return null;

  if (isAuthPage) {
    // On auth pages: mobile-only bottom-left player (desktop handled in page top bar)
    return (
      <div className="fixed bottom-4 left-4 z-50 md:hidden">
        <NowPlaying />
      </div>
    );
  }

  // Landing page: top-left aligned with ThemeToggle bar
  return (
    <div
      className="fixed top-0 left-0 z-50 animate-reveal-fade px-6 h-14 flex items-center"
      style={{ animationDelay: "0.5s" }}
    >
      <NowPlaying />
    </div>
  );
}
