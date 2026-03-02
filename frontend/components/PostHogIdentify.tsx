"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { initPostHog, isPostHogReady } from "@/lib/posthog";

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PostHogIdentify() {
  const { user } = useAuth();

  useEffect(() => {
    const ph = initPostHog();
    if (!isPostHogReady()) return;

    async function identify() {
      if (user) {
        const emailHash = await hashString(user.email);
        const usernameHash = await hashString(user.username);
        ph.identify(String(user.id), {
          email_hash: emailHash,
          username_hash: usernameHash,
        });
      } else {
        ph.reset();
      }
    }

    identify().catch(() => {});
  }, [user]);

  return null;
}
