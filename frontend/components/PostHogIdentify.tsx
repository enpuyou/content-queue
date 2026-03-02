"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { initPostHog } from "@/lib/posthog";

export default function PostHogIdentify() {
  const { user } = useAuth();

  useEffect(() => {
    const ph = initPostHog();
    if (!ph.__loaded) return;

    if (user) {
      ph.identify(String(user.id), {
        email: user.email,
        username: user.username,
      });
    } else {
      ph.reset();
    }
  }, [user]);

  return null;
}
