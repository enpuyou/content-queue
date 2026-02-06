/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentItem } from "@/types";
import { searchAPI, highlightsAPI, contentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { useReadingSettings } from "@/contexts/ReadingSettingsContext";
import { useTTS } from "@/hooks/useTTS";
import { useHotkeys } from "@/hooks/useHotkeys";
import HighlightToolbar from "./HighlightToolbar";
import HighlightRenderer from "./HighlightRenderer";
import HighlightsPanel from "./HighlightsPanel";
import ThemeToggle from "./ThemeToggle";

interface ExtendedSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  position: { x: number; y: number };
  existingHighlightId?: string;
  existingColor?: string;
  existingNote?: string;
}

interface ReaderProps {
  content: ContentItem;
  onStatusChange: (updates: {
    is_read?: boolean;
    is_archived?: boolean;
    read_position?: number;
  }) => void;
}

export default function Reader({ content, onStatusChange }: ReaderProps) {
  // Use global theme context (no local theme state needed)
  useTheme();

  // Use reading settings from context
  const { settings, updateSetting } = useReadingSettings();

  // Focus mode state
  const [focusMode, setFocusMode] = useState(false);

  // Reading progress state
  const [readProgress, setReadProgress] = useState(0);

  // Similar articles state
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarArticles, setSimilarArticles] = useState<
    Array<{
      item: ContentItem;
      similarity_score: number;
    }>
  >([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Summary State
  const [summary, setSummary] = useState<string | null>(
    content.summary || null,
  );
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(!!content.summary);

  // TTS State (for future implementation)
  const { pause, resume, isPlaying } = useTTS();

  // Router for shortcuts (Esc)
  const router = useRouter();

  // Keyboard Shortcuts
  useHotkeys({
    esc: () => router.push("/dashboard"),
    h: () => setShowHighlightsPanel((prev) => !prev),
    t: () => (isPlaying ? pause() : resume()), // Simple toggle, ideally smarter
  });

  const [selection, setSelection] = useState<ExtendedSelection | null>(null);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Reset note state when selection changes (e.g. clicking a new highlight or clearing)
  useEffect(() => {
    setIsNoteOpen(false);
  }, [selection]);

  const [_isCreatingHighlight, _setIsCreatingHighlight] = useState(false);

  // Highlights state
  const [highlights, setHighlights] = useState<
    Array<{
      id: string;
      text: string;
      start_offset: number;
      end_offset: number;
      color: string;
      note?: string;
    }>
  >([]);
  const [_loadingHighlights, setLoadingHighlights] = useState(false);

  // Highlights panel visibility
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleImageZoom = useCallback((src: string) => {
    setZoomedImage(src);
  }, []);

  // Gesture: Two-finger swipe to toggle highlights panel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Threshold for horizontal swipe vs vertical scroll
      if (Math.abs(e.deltaX) > 30 && Math.abs(e.deltaY) < 30) {
        setShowHighlightsPanel((prev) => {
          if (e.deltaX > 0 && !prev) {
            // Swipe Left (Pan Right visualization) -> Show Panel
            return true;
          }
          if (e.deltaX < 0 && prev) {
            // Swipe Right (Pan Left visualization) -> Hide Panel
            return false;
          }
          return prev;
        });
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  // Navbar auto-hide state
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // TOC State
  const [tocHeadings, setTocHeadings] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);
  const [activeId, setActiveId] = useState<string>("");

  // Scroll Spy for TOC with toggleable active state based on position
  const isManualScrolling = useRef(false);
  const tocNavRef = useRef<HTMLDivElement>(null);
  const similarArticlesRef = useRef<HTMLDivElement>(null);
  const scrollPositionBeforeSimilar = useRef<number>(0);

  // Unified TOC logic (Auto-scroll + Highlight)
  const isUserInteracting = useRef(false);
  const isAutoScrolling = useRef(false);
  const interactionTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const updateToc = useCallback(() => {
    if (tocHeadings.length === 0) return;

    const scrollY = window.scrollY;
    const offset = window.innerHeight * 0.3; // Match reading preference (30% down)
    const documentScroll = scrollY + offset;

    // 1. Find the current active heading
    let activeIndex = -1;
    for (let i = 0; i < tocHeadings.length; i++) {
      const heading = tocHeadings[i];
      const element = document.getElementById(heading.id);
      if (!element) continue;

      // Get absolute position relative to document
      // (getBoundingClientRect + scrollY calculation)
      const rect = element.getBoundingClientRect();
      const top = rect.top + scrollY;

      if (top <= documentScroll + 20) {
        // Slight buffer
        activeIndex = i;
      } else {
        break;
      }
    }

    if (activeIndex !== -1) {
      const activeHeading = tocHeadings[activeIndex];

      // Update highlight state (only triggers render if changed)
      setActiveId((prev) =>
        prev !== activeHeading.id ? activeHeading.id : prev,
      );

      // 2. Continuous Scroll Logic
      // Only scroll if user is NOT interacting manually
      if (tocNavRef.current && !isUserInteracting.current) {
        const activeEl = document.getElementById(activeHeading.id);
        const nextHeading = tocHeadings[activeIndex + 1];
        const nextEl = nextHeading
          ? document.getElementById(nextHeading.id)
          : null;

        let progress = 0;

        // Calculate progress between current and next header (0 to 1)
        if (activeEl && nextEl) {
          const activeTop = activeEl.getBoundingClientRect().top + scrollY;
          const nextTop = nextEl.getBoundingClientRect().top + scrollY;
          const sectionHeight = nextTop - activeTop;
          const distanceTraveled = documentScroll - activeTop;

          if (sectionHeight > 0) {
            progress = Math.max(
              0,
              Math.min(1, distanceTraveled / sectionHeight),
            );
          }
        }

        // Map progress to TOC sidebar links
        const tocActiveLink = tocNavRef.current.querySelector(
          `a[href="#${activeHeading.id}"]`,
        ) as HTMLElement;

        const tocNextLink = nextHeading
          ? (tocNavRef.current.querySelector(
              `a[href="#${nextHeading.id}"]`,
            ) as HTMLElement)
          : null;

        if (tocActiveLink) {
          // Calculate center point of the active link
          let targetCenter =
            tocActiveLink.offsetTop + tocActiveLink.offsetHeight / 2;

          // Interpolate towards the next link based on reading progress
          // This creates the "smoothly scrolls before we reach next header" effect
          if (tocNextLink) {
            const nextCenter =
              tocNextLink.offsetTop + tocNextLink.offsetHeight / 2;
            targetCenter += (nextCenter - targetCenter) * progress;
          }

          // Center this target point in the sidebar container
          const containerHeight = tocNavRef.current.clientHeight;
          const targetScroll = targetCenter - containerHeight / 2;

          // Apply scroll directly (bypassing React render for smoothness)
          isAutoScrolling.current = true;
          tocNavRef.current.scrollTop = targetScroll;
        }
      }
    }
  }, [tocHeadings]);

  // Main Scroll Listener
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateToc();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Check initially
    setTimeout(updateToc, 100);

    return () => window.removeEventListener("scroll", onScroll);
  }, [updateToc]);

  // Sidebar Interaction Handler (Pause auto-scroll)
  const handleTocScrollInteraction = useCallback(() => {
    if (isAutoScrolling.current) {
      isAutoScrolling.current = false;
      return;
    }

    isUserInteracting.current = true;
    clearTimeout(interactionTimeout.current);

    interactionTimeout.current = setTimeout(() => {
      isUserInteracting.current = false;
      // Smoothly scroll back to sync position
      if (tocNavRef.current) {
        // Enable smooth scrolling temporarily
        tocNavRef.current.style.scrollBehavior = "smooth";
        updateToc();
        // Reset to auto after animation completes
        setTimeout(() => {
          if (tocNavRef.current) {
            tocNavRef.current.style.scrollBehavior = "auto";
          }
        }, 300);
      } else {
        updateToc();
      }
    }, 3000);
  }, [updateToc]);

  // Idle Timer for TOC
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsIdle(true);
      }, 5000); // 5 seconds
    };

    // Events that wake up the interface
    window.addEventListener("scroll", resetIdleTimer, { passive: true });
    window.addEventListener("mousemove", resetIdleTimer, { passive: true });
    // window.addEventListener("keydown", resetIdleTimer, { passive: true }); // Removed to reduce listeners, scroll/mouse is primary
    // window.addEventListener("click", resetIdleTimer, { passive: true });

    resetIdleTimer(); // Start timer

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("scroll", resetIdleTimer);
      window.removeEventListener("mousemove", resetIdleTimer);
    };
  }, []);

  // Extract headings for TOC
  useEffect(() => {
    if (!content.full_text) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(content.full_text, "text/html");

    const allHeadings: Array<{ id: string; text: string; level: number }> = [];

    doc.querySelectorAll("h1, h2, h3, h4").forEach((heading) => {
      let id = heading.id;
      const text = heading.textContent || "";

      if (!id && text) {
        id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }

      if (id && text) {
        allHeadings.push({
          id,
          text,
          level: parseInt(heading.tagName.substring(1)),
        });
      }
    });

    // Skip headers that match or are part of the article title
    // This removes duplicate title headers from TOC
    let headings = allHeadings;
    const titleNormalized = (content.title || "").toLowerCase().trim();

    // Remove all headers that are substrings of or contain the title
    headings = allHeadings.filter((h) => {
      const headingNormalized = h.text.toLowerCase().trim();
      // Skip if heading is in title or title is in heading (fuzzy match)
      if (
        titleNormalized &&
        (titleNormalized.includes(headingNormalized) ||
          headingNormalized.includes(titleNormalized) ||
          // Also check individual words
          titleNormalized
            .split(/\s+/)
            .some(
              (word) => word.length > 4 && headingNormalized.includes(word),
            ))
      ) {
        return false;
      }
      return true;
    });

    // Renormalize to have at most 3 levels (H2, H3, H4 in display)
    if (headings.length > 0) {
      const minLevel = Math.min(...headings.map((h) => h.level));
      const maxLevel = Math.max(...headings.map((h) => h.level));
      const levelRange = maxLevel - minLevel + 1;

      // If more than 3 levels, collapse the deepest ones
      if (levelRange > 3) {
        headings = headings.map((h) => {
          // Map to range 2-4
          const newLevel = 2 + Math.min(2, h.level - minLevel);
          return { ...h, level: newLevel };
        });
      } else {
        // Normal offset to start at 2
        const levelOffset = minLevel - 2;
        headings = headings.map((h) => ({
          ...h,
          level: h.level - levelOffset,
        }));
      }
    }

    console.log("Extracted TOC Headings structure:", headings);
    setTocHeadings(headings);
  }, [content.full_text, content.title]);

  // Fetch highlights when article loads
  const fetchHighlights = useCallback(async () => {
    try {
      setLoadingHighlights(true);
      const data = await highlightsAPI.getByContent(content.id);
      setHighlights(data);
    } catch (error) {
      console.error("Failed to load highlights:", error);
    } finally {
      setLoadingHighlights(false);
    }
  }, [content.id]);

  useEffect(() => {
    fetchHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]);

  // Removed auto-mark as read on opening
  // Articles are now marked as read only when:
  // 1. User clicks "Read" button
  // 2. User scrolls to >= 90% (handled in backend)

  // Track scroll position and save periodically
  useEffect(() => {
    let saveTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Calculate scroll percentage
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;

      // Navbar auto-hide logic with threshold to prevent flicker
      const SCROLL_THRESHOLD = 10; // Minimum scroll distance to trigger
      const deltaY = scrollTop - lastScrollY;

      // Only update navbar visibility if scroll delta exceeds threshold
      if (Math.abs(deltaY) > SCROLL_THRESHOLD) {
        if (deltaY > 0 && scrollTop > 100) {
          // Scrolling down & past 100px - hide navbar
          setShowNavbar(false);
        } else if (deltaY < 0 || scrollTop < 50) {
          // Scrolling up or near top - show navbar
          setShowNavbar(true);
        }
        setLastScrollY(scrollTop);
      }

      // Update reading progress
      setReadProgress(Math.min(scrollPercent * 100, 100));

      // Debounce: save position 1 second after user stops scrolling
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        // Only save if position changed significantly (more than 5%)
        if (
          content.read_position === undefined ||
          Math.abs(scrollPercent - (content.read_position || 0)) > 0.05
        ) {
          onStatusChange({ read_position: scrollPercent });
        }
      }, 1000);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(saveTimeout);
    };
  }, [content.id, content.read_position, onStatusChange, lastScrollY]);

  // Restore scroll position when article loads
  useEffect(() => {
    if (content.read_position && content.read_position > 0) {
      // Store position in a const to ensure it's not undefined
      const savedPosition = content.read_position;

      // Wait for content to render, then scroll
      setTimeout(() => {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const scrollTo = docHeight * savedPosition;
        window.scrollTo({ top: scrollTo, behavior: "smooth" });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]); // Only run when article changes

  // Focus mode effect - robust scroll-based detection
  useEffect(() => {
    if (!focusMode) {
      // Cleanup focus classes when mode is disabled
      const paragraphs = document.querySelectorAll(
        "#reader-content p, #reader-content h2, #reader-content h3, #reader-content h4, #reader-content blockquote, #reader-content ul, #reader-content ol",
      );
      paragraphs.forEach((p) => p.classList.remove("focused", "near-focused"));
      return;
    }

    const checkFocus = () => {
      const paragraphs = Array.from(
        document.querySelectorAll(
          "#reader-content p, #reader-content h2, #reader-content h3, #reader-content h4, #reader-content blockquote, #reader-content ul, #reader-content ol",
        ),
      );

      if (paragraphs.length === 0) return;

      // ENSURE indices are set (CSS relies on p[data-para-index])
      paragraphs.forEach((p, i) => {
        if (!p.hasAttribute("data-para-index")) {
          p.setAttribute("data-para-index", String(i));
        }
      });

      // Target line is 30% down the screen (matching TOC / reading preference)
      const targetY = window.innerHeight * 0.3;
      let closestIndex = -1;
      let minDistance = Infinity;

      paragraphs.forEach((p, i) => {
        const rect = p.getBoundingClientRect();
        // Distance from the center of the paragraph to the target line
        // Or better: distance from the top of the paragraph to the target line?
        // Let's use top, but if the paragraph overlaps the line, it's a strong candidate.

        let dist = 0;
        if (rect.top <= targetY && rect.bottom >= targetY) {
          dist = 0; // It overlaps the line
        } else {
          dist = Math.min(
            Math.abs(rect.top - targetY),
            Math.abs(rect.bottom - targetY),
          );
        }

        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = i;
        }
      });

      if (closestIndex !== -1) {
        paragraphs.forEach((p, i) => {
          p.classList.remove("focused", "near-focused");
          if (i === closestIndex) {
            p.classList.add("focused");
          } else if (Math.abs(i - closestIndex) <= 1) {
            p.classList.add("near-focused");
          }
        });
      }
    };

    window.addEventListener("scroll", checkFocus, { passive: true });
    checkFocus(); // Check immediately
    setTimeout(checkFocus, 500);

    return () => window.removeEventListener("scroll", checkFocus);
  }, [focusMode, content.full_text, highlights]);

  // highlight - improved for mobile
  useEffect(() => {
    let selectionTimeout: NodeJS.Timeout;

    const handleSelection = (e?: Event) => {
      // Clear any pending timeout
      clearTimeout(selectionTimeout);

      // Check if click was on the toolbar - if so, ignore completely
      const target = e?.target as HTMLElement | undefined;

      // CRITICAL FIX: If the target is no longer in the document (unmounted),
      // it means we clicked something that triggered a re-render (like the highlight button)
      // We MUST ignore this event to prevent clearing the selection
      if (target && !document.contains(target)) {
        return;
      }

      // CRITICAL FIX: Ensure target is an element before using closest
      const isElement =
        target && target.nodeType === 1 && typeof target.closest === "function";
      if (target && !isElement) return;

      // We need to check closely up the DOM tree for the toolbar
      // The toolbar might be mounted in a portal or high up
      const isToolbarClick =
        isElement &&
        (target?.closest(".highlight-toolbar") ||
          target?.closest("button")?.textContent?.includes("Highlight")); // Safety check for our new button

      if (isToolbarClick) {
        return;
      }

      // Small delay to ensure selection is complete
      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();

        // Check if user clicked on an existing highlight (without selecting new text)
        const selectedText = selection?.toString().trim();
        if (!selection || !selectedText || selectedText.length === 0) {
          // Check if the click was on a highlighted span
          if (target?.dataset.highlightId) {
            const clickedHighlight = highlights.find(
              (h) => h.id === target.dataset.highlightId,
            );
            if (clickedHighlight) {
              // Show toolbar for editing this highlight
              const rect = target.getBoundingClientRect();
              setSelection({
                text: clickedHighlight.text,
                startOffset: clickedHighlight.start_offset,
                endOffset: clickedHighlight.end_offset,
                position: {
                  x: rect.left + rect.width / 2, // Centered below
                  y: rect.bottom, // Below the highlight
                },
                existingHighlightId: clickedHighlight.id,
                existingColor: clickedHighlight.color,
                existingNote: clickedHighlight.note,
              });
              return;
            }
          }

          // Only clear if we explicitly clicked elsewhere on the content
          // And verify we aren't interacting with tooltips
          if (!target?.closest(".highlight-tooltip")) {
            setSelection(null);
          }
          return;
        }

        const offsets = getTextOffsets();
        if (!offsets) return;

        // Get toolbar position (show near selection)
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelection({
          text: offsets.selectedText,
          startOffset: offsets.startOffset,
          endOffset: offsets.endOffset,
          position: {
            x: rect.left + rect.width / 2, // Centered below selection
            y: rect.bottom, // Below the selection
          },
        });
      }, 100); // Small delay for mobile selection to complete
    };

    const handleMouseUp = (e: MouseEvent) => handleSelection(e);
    const handleTouchEnd = (e: TouchEvent) => handleSelection(e);

    // Use selectionchange for better mobile support
    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      clearTimeout(selectionTimeout);
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [highlights]);

  /**
   * Fetch similar articles when user requests them
   */
  const handleFindSimilar = async () => {
    if (similarArticles.length > 0) {
      // Toggle if already loaded
      if (showSimilar) {
        // Hiding - start fade-out and scroll back simultaneously
        setIsFadingOut(true);
        window.scrollTo({
          top: scrollPositionBeforeSimilar.current,
          behavior: "smooth",
        });
        // Hide after fade-out transition completes (300ms)
        setTimeout(() => {
          setShowSimilar(false);
          setIsFadingOut(false);
        }, 300);
      } else {
        // Showing - save position and scroll to reveal
        scrollPositionBeforeSimilar.current = window.scrollY;
        setShowSimilar(true);
        setTimeout(() => {
          if (similarArticlesRef.current) {
            const rect = similarArticlesRef.current.getBoundingClientRect();
            // Scroll to show the section with some margin at top
            const scrollTarget = window.scrollY + rect.top - 100; // 100px margin from top
            window.scrollTo({
              top: scrollTarget,
              behavior: "smooth",
            });
          }
        }, 100);
      }
      return;
    }

    try {
      setLoadingSimilar(true);
      setSimilarError(null);
      const results = await searchAPI.findSimilar(content.id);
      setSimilarArticles(results);
      scrollPositionBeforeSimilar.current = window.scrollY;
      setShowSimilar(true);
      // Wait for render then scroll
      setTimeout(() => {
        if (similarArticlesRef.current) {
          const rect = similarArticlesRef.current.getBoundingClientRect();
          const scrollTarget = window.scrollY + rect.top - 100; // 100px margin from top
          window.scrollTo({
            top: scrollTarget,
            behavior: "smooth",
          });
        }
      }, 100);
    } catch (error) {
      console.error("Failed to find related articles:", error);
      setSimilarError(
        "Failed to find related articles. This article may not have embeddings yet.",
      );
      setSimilarArticles([]); // Clear previous results if any
      setShowSimilar(true); // Show the section so the error is visible

      // Scroll to error
      setTimeout(() => {
        if (similarArticlesRef.current) {
          const rect = similarArticlesRef.current.getBoundingClientRect();
          const scrollTarget = window.scrollY + rect.top - 100;
          window.scrollTo({
            top: scrollTarget,
            behavior: "smooth",
          });
        }
      }, 100);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (loadingSummary) return;
    try {
      setLoadingSummary(true);
      await contentAPI.summarize(content.id);
      // In a real implementation with websockets, we'd wait for update.
      // Here, we'll optimistically show a "Generating..." or poll.
      // Actually, since I can't easily add polling right now without more complex logic,
      // let's just simulate strictly for the UI feedback or assume the user reloads?
      // Better: Poll for 5 seconds locally then stop.

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 10) {
          // 10s timeout
          clearInterval(interval);
          setLoadingSummary(false);
          return;
        }
        const updated = await contentAPI.getById(content.id);
        if (updated.summary) {
          setSummary(updated.summary);
          setShowSummary(true);
          clearInterval(interval);
          setLoadingSummary(false);
        }
      }, 1000);
    } catch (e) {
      console.error("Summary generation failed", e);
      setLoadingSummary(false);
    }
  };

  // Use CSS variables for theming - color changes automatically with global theme
  const themeClasses =
    "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]";
  const linkColorClasses =
    "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]";

  const scrollToHighlight = useCallback(
    (
      highlight: {
        id: string;
        text: string;
        start_offset: number;
        end_offset: number;
        color: string;
        note?: string;
      },
      clickedElement?: HTMLElement,
    ) => {
      // Find ALL span elements with this highlight ID (handling multi-paragraph highlights)
      const highlightEls = document.querySelectorAll(
        `[data-highlight-id="${highlight.id}"]`,
      );

      if (highlightEls.length > 0) {
        // Flash animation to draw attention on ALL segments
        highlightEls.forEach((el) => {
          el.classList.add("ring-2", "ring-blue-500");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-blue-500");
          }, 1500);
        });

        // Only scroll if we didn't just click the element (prevent jumping)
        if (!clickedElement) {
          highlightEls[0].scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    },
    [],
  );

  const getTextOffsets = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim().length === 0
    )
      return null;

    const range = selection.getRangeAt(0);
    // Use the specific content container identifying the rendered HTML
    // This avoids counting whitespace in the wrapper divs
    const contentEl = document.getElementById("article-content");

    // If we can't find the specific inner content, fallback to wrapper (though offset might be riskier)
    if (!contentEl) {
      console.warn(
        "Could not find #article-content, offset calculation may be inaccurate",
      );
      return null;
    }

    // Helper to calculate offset relative to contentEl
    // We must match the logic in HighlightRenderer which iterates TEXT nodes
    const walkerFilter: NodeFilter = {
      acceptNode: (node) => {
        // Ignore text inside heading anchors (added by addHeadingAnchors)
        // because HighlightRenderer calculates offsets on original HTML without them
        if (
          node.parentElement &&
          node.parentElement.classList.contains("heading-anchor")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    };

    const calculateOffset = (node: Node, offsetInNode: number): number => {
      const walker = document.createTreeWalker(
        contentEl,
        NodeFilter.SHOW_TEXT,
        walkerFilter,
      );
      let totalOffset = 0;
      let currentNode: Node | null;

      while ((currentNode = walker.nextNode())) {
        if (currentNode === node) {
          return totalOffset + offsetInNode;
        }
        totalOffset += (currentNode.textContent || "").length;
      }
      return -1;
    };

    const startOffset = calculateOffset(
      range.startContainer,
      range.startOffset,
    );
    const endOffset = calculateOffset(range.endContainer, range.endOffset);

    if (startOffset === -1 || endOffset === -1) {
      console.error("Could not calculate exact tracking offsets");
      // Fallback to simple string match if traversal fails (rare)
      return null;
    }

    // Get the full text content as the renderer sees it (concatenated text nodes)
    // This ensures consistency with how we apply highlights
    const walker = document.createTreeWalker(
      contentEl,
      NodeFilter.SHOW_TEXT,
      walkerFilter,
    );
    let fullText = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      fullText += node.textContent || "";
    }

    const selectedText = fullText.substring(startOffset, endOffset);

    return {
      selectedText,
      startOffset,
      endOffset,
    };
  };

  return (
    <div
      className={`min-h-screen ${themeClasses} transition-colors select-none`}
    >
      {/* Reading Progress Bar - at very top */}
      <div
        className="fixed top-0 left-0 right-0 bg-[var(--color-border-subtle)]"
        style={{ height: "var(--progress-height)" }}
      >
        <div
          className="h-full transition-[width] duration-150"
          style={{
            width: `${readProgress}%`,
            backgroundColor: "var(--color-progress-bar)",
          }}
        />
      </div>

      <HighlightToolbar
        selection={selection}
        contentId={content.id}
        onClose={() => setSelection(null)}
        onHighlightCreated={fetchHighlights}
        showNote={isNoteOpen}
        onToggleNote={setIsNoteOpen}
      />
      {/* Sticky Header with Controls - Transparent floating style */}
      <div
        className={`fixed top-0 left-0 right-0 z-10 transition-transform duration-300 ${
          showNavbar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button - shorter text on mobile, dynamic destination */}
            <Link
              href={
                typeof window !== "undefined"
                  ? sessionStorage.getItem("readerReturnPath") || "/dashboard"
                  : "/dashboard"
              }
              scroll={false}
              className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors whitespace-nowrap flex-shrink-0 flex items-center"
              onClick={() => {
                // Clear the return path after using it
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem("readerReturnPath");
                }
              }}
            >
              ← Back
            </Link>

            {/* Reading Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Font Size Control - now visible on mobile */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSetting("fontSize", size)}
                    className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-none font-medium transition-colors ${
                      settings.fontSize === size
                        ? "bg-[var(--color-border)] text-[var(--color-text-primary)]"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span
                      className={
                        size === "small"
                          ? "text-[10px] sm:text-xs"
                          : size === "medium"
                            ? "text-xs sm:text-sm"
                            : "text-sm sm:text-base"
                      }
                    >
                      A
                    </span>
                  </button>
                ))}
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Action Buttons - condensed on mobile */}
              <div className="flex items-center gap-1 flex-wrap">
                {/* Focus Mode button - hidden on mobile */}
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={`hidden sm:inline-block text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-none border transition-colors ${
                    focusMode
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                  title="Toggle focus mode"
                >
                  Focus
                </button>

                {/* Highlights button - HIDDEN on mobile */}
                <button
                  onClick={() => setShowHighlightsPanel(!showHighlightsPanel)}
                  className={`hidden xl:inline-block text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-none border transition-colors ${
                    showHighlightsPanel
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                  title={`${showHighlightsPanel ? "Hide" : "Show"} Highlights`}
                >
                  {showHighlightsPanel ? "Hide" : "Show"} Highlights{" "}
                  {highlights.length > 0 && `(${highlights.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Panel Sidebar */}
      <div
        className={`hidden xl:flex fixed right-4 top-32 w-80 h-[calc(100vh-16rem)] z-20 overflow-hidden flex-col transition-all duration-300 ease-in-out transform ${
          showHighlightsPanel
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "translate-x-[120%] opacity-0 pointer-events-none"
        }`}
      >
        <HighlightsPanel
          highlights={highlights}
          onHighlightClick={scrollToHighlight}
          onHighlightDeleted={fetchHighlights}
          onHighlightUpdated={fetchHighlights}
        />
      </div>

      {/* Table of Contents - Desktop Left Sidebar */}
      {tocHeadings.length > 0 && (
        <div
          ref={tocNavRef}
          onScroll={handleTocScrollInteraction}
          className="hidden xl:block fixed left-8 top-32 w-64 h-[calc(100vh-16rem)] overflow-y-auto pr-4 z-30 opacity-0 animate-fade-in [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
        >
          <nav className="flex flex-col gap-1.5 mt-4 font-mono tracking-tighter">
            {tocHeadings.map((heading) => {
              const isActive = activeId === heading.id;

              // In idle mode: only show active header
              const shouldShow = !isIdle || isActive;

              // Color logic
              const linkColor =
                isActive && !isIdle ? "var(--color-accent)" : "#6b7280";
              const linkWeight = isActive ? 500 : 400;

              // Opacity logic
              const opacityClass = !shouldShow
                ? "opacity-0 pointer-events-none"
                : isActive
                  ? "opacity-100"
                  : "opacity-80 hover:opacity-100";

              const transformClass = isActive ? "translate-x-1" : "";

              // In idle mode, allow wrapping for active; otherwise truncate
              const textClass =
                isIdle && isActive
                  ? "whitespace-normal break-words"
                  : "truncate";

              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(heading.id);
                    if (el) {
                      // Disable scroll spy temporarily
                      isManualScrolling.current = true;

                      // Scroll to position heading at ~30% of viewport height (slightly above center)
                      const top =
                        el.getBoundingClientRect().top + window.scrollY;
                      const offset = window.innerHeight * 0.3;
                      window.scrollTo({
                        top: top - offset,
                        behavior: "smooth",
                      });

                      // Set active ID immediately
                      setActiveId(heading.id);

                      // Re-enable scroll spy after scroll animation (approx 1s)
                      setTimeout(() => {
                        isManualScrolling.current = false;
                      }, 1000);

                      // Highlight the paragraph after the header
                      const nextEl = el.nextElementSibling;
                      if (nextEl && nextEl.tagName === "P") {
                        const pElement = nextEl as HTMLElement;
                        const computedStyle = getComputedStyle(
                          document.documentElement,
                        );
                        const accentColor = computedStyle
                          .getPropertyValue("--color-accent")
                          .trim();
                        pElement.style.color = accentColor;
                        setTimeout(() => {
                          pElement.style.color = "";
                        }, 800);
                      }
                    }
                  }}
                  style={{
                    color: linkColor,
                    fontWeight: linkWeight,
                    paddingLeft: `${Math.max(0, heading.level - 2) * 12}px`,
                    fontSize: heading.level === 2 ? "0.9rem" : "0.85rem",
                    // Add line height for wrapped text in idle mode
                    lineHeight: isIdle && isActive ? "1.4" : "1.2",
                    // Breathing effect: smooth transitions
                    transition: "all 500ms ease, opacity 500ms ease",
                  }}
                  className={`
                    toc-link
                    py-0.5 block
                    ${textClass}
                    hover:!text-gray-900 dark:hover:!text-gray-100
                    ${transformClass}
                    ${opacityClass}
                  `}
                  title={heading.text}
                >
                  {heading.text}
                </a>
              );
            })}
          </nav>
        </div>
      )}

      {/* Article Content */}
      <article className="py-8 pt-28 pb-32 max-w-5xl mx-auto select-none">
        {/* Article Header */}
        <header className="mb-12 max-w-2xl mx-auto px-5 sm:px-6 lg:px-8">
          <h1 className="font-serif font-normal leading-tight mb-4 text-4xl text-[var(--color-text-primary)]">
            {content.title || "Untitled Article"}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mb-4 tracking-wide">
            {content.reading_time_minutes && (
              <span>{content.reading_time_minutes} min read</span>
            )}
            {content.reading_time_minutes && <span>·</span>}
            <span>{new Date(content.created_at).toLocaleDateString()}</span>
          </div>

          {/* Original URL */}
          <a
            href={content.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkColorClasses} text-sm hover:opacity-70 transition-opacity inline-flex items-center gap-1 mb-6`}
          >
            View original
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>

          {/* Thumbnail */}
          {content.thumbnail_url && (
            <div className="mt-6">
              <img
                src={content.thumbnail_url}
                alt=""
                className="w-full opacity-90 hover:opacity-100 transition-opacity cursor-zoom-in"
                onClick={() => handleImageZoom(content.thumbnail_url!)}
              />
            </div>
          )}
        </header>

        {/* Description/Lead paragraph - Aligned with content width */}
        {content.description && (
          <div className="w-full flex justify-center px-5 sm:px-6 lg:px-8 mb-8">
            <div
              className={`w-full
              ${
                settings.contentWidth === "narrow"
                  ? "max-w-2xl"
                  : settings.contentWidth === "wide"
                    ? "max-w-3xl"
                    : "max-w-[42rem]"
              }
            `}
            >
              <div className="font-serif border-l-4 border-[var(--color-border)] pl-4 text-[var(--color-text-secondary)] text-lg leading-relaxed italic">
                {content.description}
              </div>
            </div>
          </div>
        )}

        {/* TLDR Summary Section - Aligned with content width */}
        <div className="w-full flex justify-center px-5 sm:px-6 lg:px-8 mb-12">
          <div
            className={`w-full
              ${
                settings.contentWidth === "narrow"
                  ? "max-w-2xl"
                  : settings.contentWidth === "wide"
                    ? "max-w-3xl"
                    : "max-w-[42rem]"
              }
            `}
          >
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => {
                  if (summary) {
                    setShowSummary(!showSummary);
                  } else {
                    handleGenerateSummary();
                  }
                }}
                disabled={loadingSummary}
                className={`text-xs px-3 py-1.5 leading-none rounded-none border transition-colors flex items-center gap-2 font-mono uppercase tracking-wider
                    ${
                      showSummary && summary
                        ? "bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] border-[var(--color-text-primary)] hover:bg-transparent hover:text-[var(--color-text-primary)]"
                        : "bg-transparent text-[var(--color-text-primary)] border-[var(--color-text-primary)] hover:bg-[var(--color-text-primary)] hover:text-[var(--color-bg-primary)]"
                    }`}
              >
                {loadingSummary ? (
                  <>
                    <span className="inline-block w-2.5 h-4 bg-[var(--color-text-primary)] animate-blink align-text-bottom mr-1"></span>
                    Summarizing_
                  </>
                ) : summary ? (
                  showSummary ? (
                    "Hide TL;DR"
                  ) : (
                    "Show TL;DR"
                  )
                ) : (
                  "Generate TL;DR"
                )}
              </button>
            </div>

            {/* Retro Summary Box */}
            {showSummary && summary && (
              <div className="relative p-6 border-2 border-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-[4px_4px_0px_0px_var(--color-text-primary)] rounded-none">
                {/* Font family and line height respect settings, but size is fixed */}
                <div
                  className={`
                      ${
                        settings.fontFamily === "serif"
                          ? "font-serif-setting"
                          : settings.fontFamily === "sans"
                            ? "font-sans-setting"
                            : settings.fontFamily === "merriweather"
                              ? "font-merriweather-setting"
                              : settings.fontFamily === "verdana"
                                ? "font-verdana-setting"
                                : "font-system-setting"
                      }
                      ${settings.lineHeight === "compact" ? "line-height-compact" : settings.lineHeight === "spacious" ? "line-height-spacious" : "line-height-comfortable"}
                    `}
                >
                  <ul className="list-disc pl-5 space-y-4 marker:text-[var(--color-text-primary)]">
                    {summary.split("\n").map((line, i) => {
                      // Normalize: remove BOM, control chars, normalize whitespace
                      let clean = line
                        .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width chars
                        .replace(/\r/g, "") // Carriage returns
                        .trim();

                      // Clean up markdown list chars if they exist at start
                      clean = clean.replace(/^[-•*]\s*/, "");
                      if (!clean) return null;

                      // Very robust parsing: find first ** and second **
                      let title: string | null = null;
                      let content: string = clean;

                      const firstMarker = clean.indexOf("**");
                      if (firstMarker !== -1 && firstMarker < 5) {
                        // Must be near start (allow some whitespace)
                        const secondMarker = clean.indexOf(
                          "**",
                          firstMarker + 2,
                        );
                        if (secondMarker !== -1) {
                          title = clean
                            .slice(firstMarker + 2, secondMarker)
                            .trim();
                          // Everything after the closing **
                          const rest = clean.slice(secondMarker + 2);
                          // Remove leading separators like ": " or " - " or just spaces
                          content = rest.replace(/^[\s:\-–—]+/, "").trim();
                        }
                      }

                      // Debug logging removed

                      return (
                        <li key={i} className="pl-1">
                          {title && (
                            <div className="tldr-title font-bold text-base mb-2 tracking-tight text-[var(--color-text-primary)]">
                              {title}
                            </div>
                          )}
                          <div className="text-sm leading-relaxed opacity-90">
                            {content}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {useMemo(() => {
          // Merge existing highlights with current selection (for visual persistence)
          let displayHighlights = highlights;
          // Only show temp selection when the note editor is OPEN (to persist visual while focus is in textarea)
          // Otherwise, let the native browser selection handle the visual (preventing double-highlight)
          if (selection && !selection.existingHighlightId && isNoteOpen) {
            displayHighlights = [
              ...highlights,
              {
                id: "temp-selection",
                text: selection.text,
                start_offset: selection.startOffset,
                end_offset: selection.endOffset,
                color: selection.existingColor || "selection", // Use standard selection blue
                note: selection.existingNote,
              },
            ];
          }

          return (
            /* Outer wrapper handles the "margin/padding" space and prevents it from being selectable */
            <div className="w-full flex justify-center px-5 sm:px-6 lg:px-8 select-none cursor-default">
              {/* Inner container constraints width but has NO padding, so selection matches text exactly */}
              <div
                className={`w-full
                  ${
                    settings.contentWidth === "narrow"
                      ? "max-w-2xl"
                      : settings.contentWidth === "wide"
                        ? "max-w-3xl"
                        : "max-w-[42rem]"
                  }
                `}
              >
                <div
                  id="reader-content"
                  className={`text-[var(--color-text-secondary)] select-text w-full outline-none
                  ${
                    settings.fontFamily === "serif"
                      ? "font-serif-setting"
                      : settings.fontFamily === "sans"
                        ? "font-sans-setting"
                        : settings.fontFamily === "merriweather"
                          ? "font-merriweather-setting"
                          : settings.fontFamily === "verdana"
                            ? "font-verdana-setting"
                            : "font-system-setting"
                  }
                  ${
                    settings.fontSize === "small"
                      ? "text-small-setting"
                      : settings.fontSize === "large"
                        ? "text-large-setting"
                        : "text-medium-setting"
                  }
                  ${
                    settings.lineHeight === "compact"
                      ? "line-height-compact"
                      : settings.lineHeight === "spacious"
                        ? "line-height-spacious"
                        : "line-height-comfortable"
                  }
                  ${
                    settings.letterSpacing === "tight"
                      ? "letter-spacing-tight"
                      : settings.letterSpacing === "wide"
                        ? "letter-spacing-wide"
                        : "letter-spacing-normal"
                  }
                  ${settings.bionicReading ? "bionic-reading" : ""}
                  ${focusMode ? "focus-mode" : ""}
                `}
                >
                  {content.full_text ? (
                    <HighlightRenderer
                      html={content.full_text}
                      highlights={displayHighlights}
                      onHighlightClick={scrollToHighlight}
                      onImageClick={handleImageZoom}
                    />
                  ) : (
                    <div className="text-center py-12 opacity-60">
                      <p>Full content not available yet.</p>
                      <p className="text-sm mt-2">
                        {content.processing_status === "processing" &&
                          "Content is being extracted..."}
                        {content.processing_status === "pending" &&
                          "Content extraction is pending..."}
                        {content.processing_status === "failed" &&
                          "Content extraction failed. Please visit the original URL."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }, [
          content.full_text,
          content.processing_status,
          highlights,
          selection, // Add selection dependency
          isNoteOpen, // Add isNoteOpen dependency so highlight appears when note opens
          scrollToHighlight,
          focusMode,
          settings.fontFamily,
          settings.fontSize,
          settings.contentWidth,
          settings.lineHeight,
          settings.letterSpacing,
          settings.bionicReading,
          handleImageZoom,
        ])}

        {/* End of Article Actions - Quiet and Minimal */}
        {content.full_text && (
          <div className="mt-16 max-w-2xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onStatusChange({ is_archived: !content.is_archived })
                }
                className={`text-xs px-2 py-0.5 leading-none rounded-none border transition-colors ${
                  content.is_archived
                    ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                }`}
              >
                {content.is_archived ? "Unarchive" : "Archive"}
              </button>
              <button
                onClick={handleFindSimilar}
                disabled={loadingSimilar}
                className="text-xs px-2 py-0.5 leading-none rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingSimilar
                  ? "Finding related..."
                  : showSimilar
                    ? "Hide Related"
                    : "Find Related"}
              </button>
            </div>
          </div>
        )}

        {/* Similar Articles Section */}
        {showSimilar && (
          <div
            ref={similarArticlesRef}
            className={`mt-8 max-w-2xl mx-auto px-5 sm:px-6 lg:px-8 transition-opacity duration-300 ${
              isFadingOut ? "opacity-0" : "opacity-100"
            }`}
          >
            <h2 className="font-serif text-2xl font-normal mb-6 text-[var(--color-text-primary)]">
              Similar Articles
            </h2>

            {similarError ? (
              <div className="p-4 rounded-none border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                <p className="text-sm">{similarError}</p>
              </div>
            ) : similarArticles.length > 0 ? (
              <div className="grid gap-4">
                {similarArticles.map(({ item, similarity_score }) => (
                  <Link
                    key={item.id}
                    href={`/content/${item.id}`}
                    className="block p-4 rounded-none border border-[var(--color-border)] transition-colors hover:border-[var(--color-accent)]"
                  >
                    <div className="flex items-start gap-4">
                      {item.thumbnail_url && (
                        <img
                          src={item.thumbnail_url}
                          alt=""
                          className="w-20 h-20 object-cover flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-serif font-medium mb-1 ${linkColorClasses}`}
                        >
                          {item.title || "Untitled"}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-faint)]">
                          <span className="text-[var(--color-accent)] font-medium">
                            {Math.round(similarity_score * 100)}% similar
                          </span>
                          {item.reading_time_minutes && (
                            <>
                              <span>•</span>
                              <span>{item.reading_time_minutes} min read</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-[var(--color-text-muted)]">
                No similar articles found.
              </div>
            )}
          </div>
        )}
      </article>
      {/* Image Zoom Modal */}
      {zoomedImage && (
        <ImageZoomModal
          src={zoomedImage}
          onClose={() => setZoomedImage(null)}
        />
      )}
    </div>
  );
}

// Separate component for complex zoom logic
function ImageZoomModal({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(0.7);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.5, scale + delta), 4);
    setScale(newScale);
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.stopPropagation();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center cursor-zoom-out animate-fade-in backdrop-blur-sm overflow-hidden"
      onClick={onClose}
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div className="relative flex items-center justify-center w-full h-full p-8">
        <img
          ref={imageRef}
          src={src}
          alt="Zoomed"
          className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl transition-transform duration-75 ease-out cursor-move"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          draggable={false}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white/90">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.max(0.5, s - 0.5));
          }}
          className="hover:text-white p-1"
        >
          -
        </button>
        <span className="text-xs font-mono w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.min(4, s + 0.5));
          }}
          className="hover:text-white p-1"
        >
          +
        </button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScale(0.7);
            setPosition({ x: 0, y: 0 });
          }}
          className="text-xs hover:text-white"
        >
          Reset
        </button>
      </div>

      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 transition-colors"
        onClick={onClose}
        aria-label="Close zoom"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
