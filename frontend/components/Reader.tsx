/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentItem } from "@/types";
import { searchAPI, highlightsAPI, contentAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useReadingSettings } from "@/contexts/ReadingSettingsContext";
import { sanitizeContentHtml } from "@/lib/bionicReading";
import { useTTS } from "@/hooks/useTTS";
import { useHotkeys } from "@/hooks/useHotkeys";
import HighlightToolbar from "./HighlightToolbar";
import SequentialRetroLoader from "./SequentialRetroLoader";
import NowPlaying from "./NowPlaying";
import HighlightRenderer from "./HighlightRenderer";
import HighlightsPanel from "./HighlightsPanel";
import ConnectionsPanel from "./ConnectionsPanel";
import ThemeToggle from "./ThemeToggle";
import BlockList, { BlockListRef } from "./editor/BlockList";
import KeyboardShortcuts from "./KeyboardShortcuts";
import { SHOW_EDIT_ARTICLE } from "@/lib/flags";

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
    full_text?: string;
    is_public?: boolean;
  }) => void;
}

export default function Reader({ content, onStatusChange }: ReaderProps) {
  // Get user for public profile check
  const { user } = useAuth();

  // Use global theme context (no local theme state needed)
  useTheme();

  // Use reading settings from context
  const { settings, updateSetting } = useReadingSettings();
  const contentRef = useRef<HTMLDivElement>(null);

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

  // New Highlight State for Inline Expansion
  const [newlyCreatedHighlightId, setNewlyCreatedHighlightId] = useState<
    string | null
  >(null);

  // Summary State
  const [summary, setSummary] = useState<string | null>(
    content.summary || null,
  );
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(!!content.summary);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(content.title || "");
  const [editDescription, setEditDescription] = useState(
    content.description || "",
  );
  const [editAuthor, setEditAuthor] = useState(content.author || "");
  const [editPublishedDate, setEditPublishedDate] = useState(
    content.published_date
      ? new Date(content.published_date).toISOString().split("T")[0]
      : "",
  );
  const [metadataSaved, setMetadataSaved] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const editorRef = useRef<BlockListRef>(null);

  const [optimisticMeta, setOptimisticMeta] = useState<{
    title?: string | null;
    author?: string | null;
    published_date?: string | null;
  } | null>(null);

  const displayTitle =
    optimisticMeta?.title !== undefined ? optimisticMeta.title : content.title;
  const displayAuthor =
    optimisticMeta?.author !== undefined
      ? optimisticMeta.author
      : content.author;
  const displayPublishedDate =
    optimisticMeta?.published_date !== undefined
      ? optimisticMeta.published_date
      : content.published_date;

  const estimatedReadingTime = useMemo(() => {
    if (content.reading_time_minutes) return content.reading_time_minutes;
    if (!content.full_text) return null;
    const words = content.full_text
      .replace(/<[^>]*>?/gm, "")
      .split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [content.reading_time_minutes, content.full_text]);

  // Initialize edit state when content loads
  useEffect(() => {
    if (content) {
      setEditTitle(displayTitle || "");
      setEditDescription(content.description || "");
      setEditAuthor(displayAuthor || "");
      setEditPublishedDate(
        displayPublishedDate
          ? new Date(displayPublishedDate).toISOString().split("T")[0]
          : "",
      );
    }
  }, [content, displayTitle, displayAuthor, displayPublishedDate]);

  // Save Changes Handler
  const handleSaveChanges = async () => {
    if (!editorRef.current) return;

    setIsSaving(true);
    try {
      const newHtml = editorRef.current.getHtml();

      const updated = await contentAPI.update(content.id, {
        title: editTitle,
        description: editDescription,
        full_text: newHtml,
      });

      // Update parent state
      onStatusChange({
        full_text: updated.full_text || newHtml,
        // We might want to pass title/desc here if onStatusChange supports it,
        // but looking at interface it supports is_read, read_pos, is_archived, full_text.
        // For now, full_text update is key.
      });

      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save changes:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Save metadata (title, author, published_date) without entering full edit mode
  const handleSaveMetadata = async () => {
    setIsSaving(true);
    try {
      await contentAPI.update(content.id, {
        title: editTitle || undefined,
        author: editAuthor || undefined,
        published_date: editPublishedDate || null,
      });
      setOptimisticMeta({
        title: editTitle || null,
        author: editAuthor || null,
        published_date: editPublishedDate || null,
      });
      setMetadataSaved(true);
      setTimeout(() => setMetadataSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save metadata:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Scroll position ref for restoring state
  const savedScrollPosition = useRef(0);

  // Extraction Confidence State
  const [extractionConfidence, setExtractionConfidence] = useState<{
    score: number;
    label: string;
  } | null>(null);

  // Parse extraction confidence and metadata from HTML content
  useEffect(() => {
    if (!content.full_text) return;

    // Parse confidence score — attribute order varies after HTML serialization
    const confidenceMatch =
      content.full_text.match(
        /meta name="extraction-confidence" content="(\d+)"/,
      ) ||
      content.full_text.match(
        /meta content="(\d+)" name="extraction-confidence"/,
      );
    if (confidenceMatch && confidenceMatch[1]) {
      const score = parseInt(confidenceMatch[1], 10);
      let label = "low";
      if (score >= 80) label = "high";
      else if (score >= 60) label = "medium";
      setExtractionConfidence({ score, label });
    }
  }, [content.full_text]);

  // TTS State (for future implementation)
  const { pause, resume, isPlaying } = useTTS();

  // Router for shortcuts (Esc)
  const router = useRouter();

  // Keyboard Shortcuts
  useHotkeys({
    esc: () => router.push("/dashboard"),
    h: () => setShowHighlightsPanel((prev) => !prev),
    c: (e) => {
      // Only toggle connections if NOT cmd+c (system copy)
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        // Only allow connections panel on desktop
        if (window.innerWidth >= 1280) {
          setShowConnectionsPanel((prev) => !prev);
        }
      }
    },
    f: (e) => {
      // Only toggle focus mode if NOT cmd+f (browser search)
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      }
    },
    n: async (e) => {
      // Create highlight with note when text is selected
      const windowSelection = window.getSelection();
      if (
        !windowSelection ||
        windowSelection.isCollapsed ||
        !windowSelection.toString().trim()
      ) {
        return;
      }

      e.preventDefault();

      try {
        // Get range info (similar to HighlightToolbar logic)
        const range = windowSelection.getRangeAt(0);
        const selectedText = windowSelection.toString().trim();

        // Find the article-content container to calculate offsets
        const container = contentRef.current;
        if (!container) return;

        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(container);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const startOffset = preSelectionRange.toString().length;
        const endOffset = startOffset + selectedText.length;

        // Create highlight with default color (yellow)
        const newHighlight = await highlightsAPI.create(content.id, {
          text: selectedText,
          start_offset: startOffset,
          end_offset: endOffset,
          color: "yellow",
        });

        // Refresh highlights and auto-open note editor for new highlight
        await refreshHighlights(newHighlight.id);

        // Clear selection
        windowSelection.removeAllRanges();
      } catch (error) {
        console.error("Failed to create highlight with note:", error);
      }
    },
    t: () => (isPlaying ? pause() : resume()), // Simple toggle
    "?": () => setShowShortcuts((v) => !v),
    // Ephemeral formatting for user readability - NOW PERSISTED
    b: async (e) => {
      e.preventDefault();

      // CRITICAL FIX: Store ephemeral UI state and remove them before editing
      const ephemeralElements = contentRef.current?.querySelectorAll(
        '[data-ephemeral="true"]',
      );
      const ephemeralData: Array<{
        element: Element;
        parent: Node;
        nextSibling: Node | null;
      }> = [];

      ephemeralElements?.forEach((el) => {
        if (el.parentNode) {
          ephemeralData.push({
            element: el,
            parent: el.parentNode,
            nextSibling: el.nextSibling,
          });
          el.parentNode.removeChild(el);
        }
      });

      try {
        if (contentRef.current) {
          contentRef.current.contentEditable = "true";
          document.execCommand("bold");
          contentRef.current.contentEditable = "false";

          const newHtml = contentRef.current.innerHTML;
          const cleanHtml = sanitizeContentHtml(newHtml);
          onStatusChange({ full_text: cleanHtml });
        }
      } catch (err) {
        console.warn("Formatting failed", err);
      } finally {
        // Restore ephemeral elements
        ephemeralData.forEach(({ element, parent, nextSibling }) => {
          parent.insertBefore(element, nextSibling);
        });
      }
    },
    i: async (e) => {
      e.preventDefault();

      // CRITICAL FIX: Store ephemeral UI state and remove them before editing
      const ephemeralElements = contentRef.current?.querySelectorAll(
        '[data-ephemeral="true"]',
      );
      const ephemeralData: Array<{
        element: Element;
        parent: Node;
        nextSibling: Node | null;
      }> = [];

      ephemeralElements?.forEach((el) => {
        if (el.parentNode) {
          ephemeralData.push({
            element: el,
            parent: el.parentNode,
            nextSibling: el.nextSibling,
          });
          el.parentNode.removeChild(el);
        }
      });

      try {
        if (contentRef.current) {
          contentRef.current.contentEditable = "true";
          document.execCommand("italic");
          contentRef.current.contentEditable = "false";

          const newHtml = contentRef.current.innerHTML;
          const cleanHtml = sanitizeContentHtml(newHtml);
          onStatusChange({ full_text: cleanHtml });
        }
      } catch (err) {
        console.warn("Formatting failed", err);
      } finally {
        // Restore ephemeral elements
        ephemeralData.forEach(({ element, parent, nextSibling }) => {
          parent.insertBefore(element, nextSibling);
        });
      }
    },
  });

  const [selection, setSelection] = useState<ExtendedSelection | null>(null);

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
  const [_loadingHighlights, _setLoadingHighlights] = useState(false);

  // Connected highlight IDs — fetched once per article, not per highlight
  const [connectedHighlightIds, setConnectedHighlightIds] = useState<
    Set<string>
  >(new Set());

  // Highlights panel visibility
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [showConnectionsPanel, setShowConnectionsPanel] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleImageZoom = useCallback((src: string) => {
    setZoomedImage(src);
  }, []);

  // Gesture: Two-finger swipe to toggle panels (screen-half aware with close)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Threshold for horizontal swipe vs vertical scroll
      if (Math.abs(e.deltaX) > 30 && Math.abs(e.deltaY) < 30) {
        const screenWidth = window.innerWidth;
        const mouseX =
          (e as WheelEvent & { clientX?: number }).clientX || screenWidth / 2; // Fallback to center
        const isLeftHalf = mouseX < screenWidth / 2;

        // Left half swipe logic
        if (isLeftHalf) {
          if (e.deltaX < 0) {
            // Swipe right: open connections panel
            setShowConnectionsPanel(true);
            if (showHighlightsPanel) setShowHighlightsPanel(false);
          } else if (e.deltaX > 0 && showConnectionsPanel) {
            // Swipe left: close connections panel if open
            setShowConnectionsPanel(false);
          }
        }

        // Right half swipe logic
        if (!isLeftHalf) {
          if (e.deltaX > 0) {
            // Swipe left: open highlights panel
            setShowHighlightsPanel(true);
            if (showConnectionsPanel) setShowConnectionsPanel(false);
          } else if (e.deltaX < 0 && showHighlightsPanel) {
            // Swipe right: close highlights panel if open
            setShowHighlightsPanel(false);
          }
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [showHighlightsPanel, showConnectionsPanel]);

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
    // window.addEventListener("keydown", resetIdleTimer, { passive: true }); // Removed to reduce listeners, scroll/mouse is primary
    // window.addEventListener("click", resetIdleTimer, { passive: true });

    resetIdleTimer(); // Start timer

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("scroll", resetIdleTimer);
    };
  }, []);

  // Extract headings for TOC
  useEffect(() => {
    if (!content.full_text) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(content.full_text, "text/html");

    const allHeadings: Array<{ id: string; text: string; level: number }> = [];

    const seenIds = new Map<string, number>();
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
        // Deduplicate: if this id was seen before, append -2, -3, etc.
        const count = seenIds.get(id) ?? 0;
        seenIds.set(id, count + 1);
        const uniqueId = count === 0 ? id : `${id}-${count + 1}`;

        allHeadings.push({
          id: uniqueId,
          text,
          level: parseInt(heading.tagName.substring(1)),
        });
      }
    });

    // Skip headings whose text is exactly the article title — avoids a repeated
    // <h1> at the top of the article body appearing in the TOC.
    let headings = allHeadings;
    const titleNormalized = (content.title || "").toLowerCase().trim();

    headings = allHeadings.filter((h) => {
      const headingNormalized = h.text.toLowerCase().trim();
      return !(titleNormalized && headingNormalized === titleNormalized);
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

    setTocHeadings(headings);
  }, [content.full_text, content.title]);

  // Fetch highlights
  const refreshHighlights = useCallback(
    async (newHighlightId?: string) => {
      // If a new highlight was created (e.g. "Note" button clicked), store ID to auto-open it
      if (newHighlightId) {
        setNewlyCreatedHighlightId(newHighlightId);
        // Clear it after a moment so it doesn't persist across future re-renders distinct from this interaction
        setTimeout(() => setNewlyCreatedHighlightId(null), 2000);
      }
      if (content.id) {
        try {
          const [highlightData, connectionData] = await Promise.allSettled([
            highlightsAPI.getByContent(content.id),
            searchAPI.findArticleConnections(content.id),
          ]);

          if (highlightData.status === "fulfilled") {
            setHighlights(highlightData.value);
          } else {
            console.error("Failed to fetch highlights:", highlightData.reason);
          }

          if (connectionData.status === "fulfilled") {
            // Build a flat Set of all highlight IDs that appear in any connection pair
            const ids = new Set<string>();
            for (const articleConn of connectionData.value) {
              for (const pair of articleConn.highlight_pairs) {
                ids.add(pair.user_highlight_id);
              }
            }
            setConnectedHighlightIds(ids);
          }
          // Connection failures are silent — no embeddings yet is expected
        } catch (error) {
          console.error("Failed to fetch highlights:", error);
        }
      }
    },
    [content.id],
  );

  useEffect(() => {
    refreshHighlights();
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
                // We no longer pass existingNote to toolbar since it's handled inline
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
    } catch (error: unknown) {
      console.error("Failed to find related articles:", error);

      // Check if it's the specific "no embedding" error
      const isEmbeddingError =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "status" in error.response &&
        error.response.status === 400 &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "detail" in error.response.data &&
        typeof error.response.data.detail === "string" &&
        error.response.data.detail.includes("no embedding");

      setSimilarError(
        isEmbeddingError
          ? "This article is still being processed. Please wait a moment and try again."
          : "Failed to find related articles. Please try again later.",
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
        // Normalize text content length to match what we render (if needed)
        // For now, textContent length is usually correct for raw text nodes
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
      console.warn(
        "Could not calculate exact tracking offsets, using fallback",
      );
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

  const articleContent = useMemo(() => {
    // Merge existing highlights with current selection (for visual persistence)
    // Note: "Fake" highlight for note editing is no longer needed since note editing is inline
    const displayHighlights = highlights;

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
            ref={contentRef}
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
                onDeleteHighlight={async (id) => {
                  await highlightsAPI.delete(id);
                  refreshHighlights();
                }}
                onUpdateHighlight={refreshHighlights}
                newlyCreatedHighlightId={newlyCreatedHighlightId}
                onShowConnections={(_highlightId) => {
                  setShowConnectionsPanel(true);
                }}
                connectedHighlightIds={connectedHighlightIds}
              />
            ) : (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <SequentialRetroLoader
                  messages={
                    content.content_type === "pdf"
                      ? [
                          "Scanning layout...",
                          "Identifying columns...",
                          " extracting figures...",
                          "Reflowing text...",
                        ]
                      : [
                          "Connecting to source...",
                          "Extracting content...",
                          "Parsing article...",
                          "Formatting for you...",
                        ]
                  }
                  className="text-[var(--color-accent)] text-lg"
                  interval={2000}
                />
                <p className="text-sm text-[var(--color-text-muted)] opacity-70">
                  {content.processing_status === "failed"
                    ? "Content extraction failed. Please visit the original URL."
                    : "This might take a few seconds."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [
    content.full_text,
    content.content_type,
    content.processing_status,
    highlights,
    connectedHighlightIds,
    scrollToHighlight,
    focusMode,
    settings,
    handleImageZoom,
    newlyCreatedHighlightId,
    refreshHighlights,
  ]);

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
        onOptimisticCreate={(color) => {
          if (selection) {
            setHighlights((prev) => [
              ...prev,
              {
                id: `temp-${Date.now()}`,
                text: selection.text,
                start_offset: selection.startOffset,
                end_offset: selection.endOffset,
                color,
              },
            ]);
          }
        }}
        onHighlightCreated={refreshHighlights}
      />
      {/* Sticky Header with Controls - Transparent floating style */}
      <div
        className={`fixed top-0 left-0 right-0 z-10 transition-transform duration-300 ${
          showNavbar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button */}
            <button
              onClick={() => {
                const returnPath =
                  sessionStorage.getItem("readerReturnPath") || "/dashboard";
                sessionStorage.removeItem("readerReturnPath");
                router.push(returnPath);
              }}
              className="compact-touch text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors whitespace-nowrap flex-shrink-0 flex items-center"
            >
              ← Back
            </button>

            {/* Player moved to bottom left */}

            {/* Reading Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Font Size Control - now visible on mobile */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSetting("fontSize", size)}
                    className={`compact-touch w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-none font-medium transition-colors ${
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

                {/* Connections button - HIDDEN on mobile */}
                <button
                  onClick={() => setShowConnectionsPanel(!showConnectionsPanel)}
                  className={`hidden xl:inline-block text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-none border transition-colors ${
                    showConnectionsPanel
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                  title={`${showConnectionsPanel ? "Hide" : "Show"} Connections`}
                >
                  {showConnectionsPanel ? "Hide" : "Show"} Connections
                </button>

                {/* Edit Mode button - PDF Only, behind feature flag */}
                {SHOW_EDIT_ARTICLE && content.content_type === "pdf" && (
                  <button
                    onClick={() => {
                      if (isEditing) {
                        handleSaveChanges();
                      } else {
                        // Capture scroll position before switching
                        savedScrollPosition.current = window.scrollY;
                        setIsEditing(true);
                      }
                    }}
                    disabled={isSaving}
                    className={`hidden sm:inline-block text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-none border transition-colors ${
                      isEditing
                        ? "bg-[var(--color-accent)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                    title="Toggle Edit Mode"
                  >
                    {isSaving
                      ? "Saving..."
                      : isEditing
                        ? "Save Changes"
                        : "Edit Article"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player - Fixed Bottom Left */}
      <div className="hidden md:block fixed bottom-4 left-4 z-40">
        <NowPlaying direction="up" />
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
          onHighlightDeleted={refreshHighlights}
          onHighlightUpdated={refreshHighlights}
        />
      </div>

      {/* Connections Panel Sidebar - Left Side */}
      <div
        className={`hidden xl:flex fixed left-4 top-32 w-80 h-[calc(100vh-16rem)] z-20 overflow-hidden flex-col transition-all duration-300 ease-in-out transform ${
          showConnectionsPanel
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-[120%] opacity-0 pointer-events-none"
        }`}
      >
        <ConnectionsPanel
          contentId={content.id}
          isOpen={showConnectionsPanel}
          onClose={() => setShowConnectionsPanel(false)}
          onNavigateToArticle={(id) => router.push(`/content/${id}`)}
        />
      </div>

      {/* Table of Contents - Desktop Left Sidebar */}
      {tocHeadings.length > 0 && !showConnectionsPanel && (
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
      <article className="py-8 pt-28 pb-32 max-w-5xl mx-auto select-none overflow-x-hidden w-full">
        {/* Article Header */}
        <header className="mb-12 max-w-2xl mx-auto px-5 sm:px-6 lg:px-8 relative">
          {/* Zone 1: Title + pencil edit button */}
          <div className="group/title relative mb-3">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full font-serif font-normal leading-tight text-4xl text-[var(--color-text-primary)] bg-transparent border-b border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)]"
                placeholder="Article Title"
              />
            ) : (
              <h1 className="font-serif font-normal leading-tight text-4xl text-[var(--color-text-primary)] pr-12">
                {displayTitle || "Untitled Article"}
              </h1>
            )}
            <button
              onClick={() => setIsEditingMeta((v) => !v)}
              className="absolute top-2 right-0 opacity-0 group-hover/title:opacity-40 hover:!opacity-100 transition-opacity text-[var(--color-text-muted)] hover:text-[var(--color-accent)] p-2 -mr-2 -mt-2"
              title="Edit title, author, and date"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>

          {/* Byline — Zone 2 + Zone 3 */}
          <div className="flex flex-col mb-4 font-mono text-xs tracking-tight">
            {/* Zone 2: article attribution — author wraps freely + published date */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--color-text-muted)]">
              {displayAuthor && (
                <span
                  className={`text-[var(--color-text-secondary)] ${displayAuthor.includes(",") || displayAuthor.includes(" and ") ? "basis-full mb-0.5" : ""}`}
                >
                  {displayAuthor}
                </span>
              )}
              {displayPublishedDate && (
                <>
                  {displayAuthor &&
                    !(
                      displayAuthor.includes(",") ||
                      displayAuthor.includes(" and ")
                    ) && (
                      <span className="text-[var(--color-text-faint)]">·</span>
                    )}
                  <span>
                    published{" "}
                    {new Date(displayPublishedDate).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </span>
                </>
              )}
              {!displayAuthor && !displayPublishedDate && (
                <span className="text-[var(--color-text-faint)] italic">
                  no attribution
                </span>
              )}
            </div>

            {/* Inline meta edit panel */}
            {isEditingMeta && (
              <div className="mt-3 mb-2 p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] space-y-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                    placeholder="Article title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                      Author
                    </label>
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                      placeholder="Author name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                      Published
                    </label>
                    <input
                      type="date"
                      value={editPublishedDate}
                      onChange={(e) => setEditPublishedDate(e.target.value)}
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-1">
                  {metadataSaved && (
                    <span className="text-[10px] font-mono text-[var(--color-accent)]">
                      Saved.
                    </span>
                  )}
                  <button
                    onClick={() => setIsEditingMeta(false)}
                    className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleSaveMetadata();
                      setIsEditingMeta(false);
                    }}
                    disabled={isSaving}
                    className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
            {/* Zone 3: reader info — added date · read time · confidence · domain */}
            <div className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[var(--color-text-faint)]">
              <span>
                added{" "}
                {new Date(content.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {estimatedReadingTime && (
                <>
                  <span>·</span>
                  <span>{estimatedReadingTime} min read</span>
                </>
              )}
              {extractionConfidence && (
                <>
                  <span>·</span>
                  <span className="relative group/conf inline-flex">
                    <span
                      className={`cursor-help px-1.5 py-0.5 font-bold border uppercase tracking-wider text-[10px] ${
                        extractionConfidence.label === "high"
                          ? "bg-green-100/50 text-green-800 border-green-300"
                          : extractionConfidence.label === "medium"
                            ? "bg-yellow-100/50 text-yellow-800 border-yellow-300"
                            : "bg-red-100/50 text-red-800 border-red-300"
                      }`}
                    >
                      {extractionConfidence.score}%
                    </span>
                    {/* Tooltip hidden on mobile (tap targets don't have hover) */}
                    <span className="hidden sm:block pointer-events-none absolute bottom-full left-0 mb-2 w-64 bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-3 py-2 text-[10px] font-mono text-[var(--color-text-secondary)] leading-relaxed shadow-md opacity-0 group-hover/conf:opacity-100 transition-opacity duration-150 z-50 normal-case tracking-normal font-normal">
                      Extraction quality: how completely the article text was
                      captured ({extractionConfidence.score}/100). High ≥ 80
                      means full article; Low &lt; 50 means partial or fallback
                      extraction.
                    </span>
                  </span>
                </>
              )}
              {user?.is_public && (
                <>
                  <span>·</span>
                  <button
                    onClick={() =>
                      onStatusChange({ is_public: !content.is_public })
                    }
                    className={`inline-flex items-center gap-1 transition-colors ${
                      content.is_public
                        ? "text-[var(--color-accent)] hover:opacity-70"
                        : "hover:text-[var(--color-text-primary)]"
                    }`}
                    title={
                      content.is_public
                        ? "Publicly visible (Click to make private)"
                        : "Private (Click to make public)"
                    }
                  >
                    {content.is_public ? (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Public
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Private
                      </>
                    )}
                  </button>
                </>
              )}
              <span>·</span>
              <a
                href={content.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center ${linkColorClasses} hover:opacity-70 transition-opacity truncate max-w-[24ch] sm:max-w-none`}
              >
                ↗{" "}
                {(() => {
                  try {
                    return new URL(content.original_url).hostname.replace(
                      /^www\./,
                      "",
                    );
                  } catch {
                    return content.original_url;
                  }
                })()}
              </a>
            </div>
          </div>

          {/* Thumbnail */}
          {content.thumbnail_url && (
            <div className="mt-4 mb-6">
              <img
                src={content.thumbnail_url}
                alt=""
                className="w-full max-h-[500px] object-cover rounded-sm shadow-sm opacity-90 hover:opacity-100 transition-opacity cursor-zoom-in"
                onClick={() => handleImageZoom(content.thumbnail_url!)}
              />
            </div>
          )}
        </header>

        {content.content_type === "pdf" ||
        content.content_vertical === "academic" ? (
          isEditing ? (
            <div className="mb-10 max-w-2xl mx-auto px-5 sm:px-6 lg:px-8">
              <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-6 rounded-sm relative">
                <span className="absolute top-0 left-6 -translate-y-1/2 bg-[var(--color-bg-secondary)] px-2 text-xs font-serif italic text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-full">
                  Abstract
                </span>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-[var(--color-text-secondary)] text-base font-serif leading-relaxed bg-transparent border-none resize-none focus:outline-none"
                  rows={4}
                  placeholder="Abstract or description..."
                />
              </div>
            </div>
          ) : (
            (content.vertical_metadata?.abstract || content.description) && (
              <div className="mb-10 max-w-2xl mx-auto px-5 sm:px-6 lg:px-8">
                <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-6 rounded-sm relative">
                  <span className="absolute top-0 left-6 -translate-y-1/2 bg-[var(--color-bg-secondary)] px-2 text-xs font-serif italic text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-full">
                    Abstract
                  </span>
                  <p className="text-[var(--color-text-secondary)] text-base font-serif leading-relaxed">
                    {content.vertical_metadata?.abstract || content.description}
                  </p>
                </div>
              </div>
            )
          )
        ) : (
          content.description && (
            <div className="w-full flex justify-center px-5 sm:px-6 lg:px-8 mb-8">
              <div
                className={`w-full ${
                  settings.contentWidth === "narrow"
                    ? "max-w-2xl"
                    : settings.contentWidth === "wide"
                      ? "max-w-3xl"
                      : "max-w-[42rem]"
                }`}
              >
                <div className="font-serif border-l-4 border-[var(--color-border)] pl-4 text-[var(--color-text-secondary)] text-lg leading-relaxed">
                  {content.description}
                </div>
              </div>
            </div>
          )
        )}

        {/* Description/Lead paragraph - Aligned with content width */}

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
        <div className="w-full flex justify-center px-5 sm:px-6 lg:px-8 mb-12">
          {isEditing ? (
            <div className="w-full max-w-2xl">
              <BlockList
                ref={editorRef}
                initialHtml={content.full_text || ""}
                initialScrollTop={savedScrollPosition.current}
              />
            </div>
          ) : (
            articleContent
          )}
        </div>

        {/* End of Article Actions - Quiet and Minimal */}
        {content.full_text && (
          <div className="mt-16 max-w-2xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onStatusChange({ is_archived: !content.is_archived })
                }
                className={`compact-touch text-xs px-2 py-0.5 leading-none rounded-none border transition-colors ${
                  content.is_archived
                    ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                }`}
              >
                {content.is_archived ? "Unarchive" : "Archive"}
              </button>

              {/* Edit Toggle (PDF Only) - MOVED TO HEADER */}
              <button
                onClick={handleFindSimilar}
                disabled={loadingSimilar}
                className={`compact-touch text-xs px-2 py-0.5 leading-none rounded-none border transition-colors flex items-center gap-2
                  ${
                    showSimilar
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }
                  ${loadingSimilar ? "opacity-70 cursor-wait" : ""}
                `}
              >
                {loadingSimilar ? (
                  <span className="font-mono text-xs animate-pulse">
                    Finding related...
                  </span>
                ) : showSimilar ? (
                  "Hide Related"
                ) : (
                  "Find Related"
                )}
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
              Related Articles
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
                          className="w-20 h-20 object-cover flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity mt-1"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col pt-1">
                        <h3
                          className={`font-serif font-medium leading-snug line-clamp-2 ${linkColorClasses}`}
                          style={{
                            marginTop: "3px",
                            marginBottom: "10px",
                          }}
                        >
                          {item.title || "Untitled"}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-auto flex items-center gap-3 text-xs text-[var(--color-text-faint)]">
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

      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={[
          { key: "Esc", desc: "Back to queue" },
          { key: "h", desc: "Toggle highlights panel" },
          { key: "f", desc: "Focus mode" },
          { key: "c", desc: "Connections panel (desktop)" },
          { key: "?", desc: "Show this help" },
        ]}
      />
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

  // Lock body scroll while modal is open
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
