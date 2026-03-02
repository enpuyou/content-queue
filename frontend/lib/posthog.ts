import posthog from "posthog-js";

let _initialized = false;

export function initPostHog() {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    _initialized
  ) {
    return posthog;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });

  _initialized = true;
  return posthog;
}

export function isPostHogReady() {
  return _initialized;
}

export default posthog;
