"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SediLogo from "@/components/SediLogo";
import ThemeToggle from "@/components/ThemeToggle";
import NowPlaying from "@/components/NowPlaying";

const sections = [
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Info" },
  { id: "sharing", title: "Information Sharing" },
  { id: "permissions", title: "Extension Permissions" },
  { id: "data-security", title: "Data Security" },
  { id: "your-rights", title: "Your Rights" },
  { id: "contact-us", title: "Contact Us" },
];

function SectionHeader({
  num,
  id,
  title,
}: {
  num: number;
  id: string;
  title: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 mb-6">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)]">
        0{num}
      </span>
      <h2
        className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[var(--color-text-primary)]"
        style={{ letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
    </div>
  );
}

export default function PrivacyClient() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track active section via IntersectionObserver
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href={user ? "/dashboard" : "/"}
            className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity"
            style={{ color: "var(--color-text-primary)" }}
          >
            <SediLogo size={18} className="text-[var(--color-text-primary)]" />
            <span
              className="text-lg font-normal"
              style={{ fontFamily: "var(--font-logo)" }}
            >
              sed.i
            </span>
          </Link>
          <div className="ml-6 hidden md:block">
            <NowPlaying />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle />
            <Link
              href={user ? "/dashboard" : "/"}
              className="compact-touch text-xs px-2 py-0.5 leading-none rounded-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors no-underline"
              style={{ color: "var(--color-text-primary)" }}
            >
              {user ? "Back to app" : "Home"}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 flex gap-12">
        {/* Sidebar TOC — desktop only */}
        <nav className="hidden xl:block w-40 flex-shrink-0 sticky top-20 self-start py-12">
          <ul className="space-y-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`font-mono text-[10px] uppercase tracking-wider transition-colors no-underline block py-0.5 ${
                    activeSection === s.id
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
                  }`}
                  style={{
                    color:
                      activeSection === s.id
                        ? "var(--color-text-primary)"
                        : undefined,
                  }}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 pt-16 pb-12 space-y-20">
          {/* Intro */}
          <div>
            <h1
              className="text-4xl sm:text-5xl font-normal text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-logo)",
                letterSpacing: "-0.02em",
              }}
            >
              Privacy Policy
            </h1>
            <p className="mt-4 text-[var(--color-text-secondary)] max-w-lg leading-relaxed">
              Welcome to sed.i. This Privacy Policy explains how we collect,
              use, and protect your information when you use our website and
              Chrome browser extension. Core to our ethos: we only collect what
              is absolutely necessary.
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)]">
              Last updated: February 2026
            </p>
          </div>

          <section>
            <SectionHeader
              num={1}
              id="information-we-collect"
              title="Information We Collect"
            />
            <div className="border-t border-[var(--color-border-subtle)] pt-4 text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed max-w-2xl">
              <p>
                Our core principle is to only collect what is necessary for the
                application to function.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Account Information:</strong> When you register, we
                  collect your email address and an encrypted password.
                </li>
                <li>
                  <strong>Saved Content:</strong> We only collect the content of
                  web pages (URLs, article text, titles, descriptions) that you{" "}
                  <em>explicitly</em> choose to save using our Chrome Extension
                  or website.
                </li>
                <li>
                  <strong>Session Data:</strong> We securely store
                  authentication tokens in your browser&apos;s local storage to
                  keep you logged in.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <SectionHeader
              num={2}
              id="how-we-use"
              title="How We Use Your Info"
            />
            <div className="border-t border-[var(--color-border-subtle)] pt-4 text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed max-w-2xl">
              <p>
                Your information is used exclusively to provide and improve the
                sed.i service:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To create and manage your personal reading queue.</li>
                <li>
                  To extract, summarize, and display the articles you have
                  chosen to save.
                </li>
                <li>
                  To securely authenticate your requests between the extension
                  and our backend.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <SectionHeader num={3} id="sharing" title="Information Sharing" />
            <div className="border-t border-[var(--color-border-subtle)] pt-4 text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed max-w-2xl">
              <p className="font-medium text-[var(--color-text-primary)]">
                We do not sell, rent, or trade your personal information to
                third parties.
              </p>
              <p>
                Your data is private to you. We do not use or transfer your data
                for any purposes unrelated to the core functionality of sed.i.
                We will only disclose your information if legally required to do
                so.
              </p>
            </div>
          </section>

          <section>
            <SectionHeader
              num={4}
              id="permissions"
              title="Extension Permissions"
            />
            <div className="border-t border-[var(--color-border-subtle)] pt-4 text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed max-w-2xl">
              <p>
                Our Chrome extension requests the following permissions for
                specific reasons:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <code className="font-mono text-xs text-[var(--color-text-primary)]">
                    activeTab
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-xs text-[var(--color-text-primary)]">
                    host_permissions (&lt;all_urls&gt;)
                  </code>
                  : To access the URL and content of the page you are currently
                  viewing so it can be saved to your queue.
                </li>
                <li>
                  <code className="font-mono text-xs text-[var(--color-text-primary)]">
                    scripting
                  </code>
                  : To run the text-extraction script safely within your browser
                  before saving.
                </li>
                <li>
                  <code className="font-mono text-xs text-[var(--color-text-primary)]">
                    storage
                  </code>
                  : To securely remember your login credentials.
                </li>
              </ul>
              <p className="border-l-2 border-[var(--color-border)] pl-4 italic mt-4 text-[var(--color-text-faint)]">
                Note: The extension remains entirely inactive until you click
                the extension icon to save a page. We do not track your browsing
                history.
              </p>
            </div>
          </section>

          <section>
            <SectionHeader num={5} id="data-security" title="Data Security" />
            <div className="border-t border-[var(--color-border-subtle)] pt-4 text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed max-w-2xl">
              <p>
                We implement appropriate technical and organizational security
                measures to protect your personal information from unauthorized
                access, accidental loss, or destruction. We use
                industry-standard encryption for data transmission and password
                storage.
              </p>
            </div>
          </section>

          <section>
            <SectionHeader num={6} id="your-rights" title="Your Rights" />
            <div className="border-t border-[var(--color-border-subtle)] pt-4 text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed max-w-2xl">
              <p>
                You have the right to access, update, or delete your account and
                all associated saved content at any time. If you wish to delete
                your data completely, please contact us or use the account
                deletion features provided within the application.
              </p>
            </div>
          </section>

          <section>
            <SectionHeader num={7} id="contact-us" title="Contact Us" />
            <div className="border-t border-[var(--color-border-subtle)] pt-4 text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed max-w-2xl">
              <p>
                If you have any questions or concerns about this privacy policy
                or our data practices, please reach out via email.
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-[var(--color-border-subtle)] pt-8 pb-12 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)]">
              sed.i
            </span>
            <Link
              href={user ? "/dashboard" : "/"}
              className="compact-touch font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)] hover:text-[var(--color-accent)] transition-colors no-underline"
            >
              {user ? "Back to app" : "Home"}
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
