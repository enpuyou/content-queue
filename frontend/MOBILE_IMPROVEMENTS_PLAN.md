# Mobile Interface Improvements Plan

**Date:** January 22, 2026
**Status:** Research & Planning
**Priority:** High

---

## Executive Summary

The current mobile interface has significant usability issues that need to be addressed. This document outlines the identified problems, proposed solutions, and implementation priorities.

---

## Issues Identified

### 1. Button Boxes Stretched/Compressed on Mobile

**Problem:**

- Filter buttons in ContentList and navigation buttons get stretched or compressed
- Button labels lose centering on smaller screens
- Fixed width buttons (`w-6 h-6`) don't scale appropriately

**Current Code (ContentList.tsx line 384):**

```tsx
className={`no-underline text-xs px-2 py-1 rounded-none border whitespace-nowrap transition-colors...`}
```

**Proposed Solution:**

- Use `flex-shrink-0` on buttons to prevent compression
- Add `min-w-fit` to ensure content doesn't wrap unexpectedly
- Consider using icon-only buttons on mobile with tooltips
- Implement horizontal scrolling for filter row with `overflow-x-auto` and proper scroll indicators

---

### 2. Content Item Actions Never Show on Mobile

**Problem:**

- Action buttons use `opacity-0 group-hover:opacity-100` which doesn't work on touch devices
- Mobile users have no way to access Read/Unread, Archive, Delete, etc.

**Current Code (ContentItem.tsx line 283):**

```tsx
<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
```

**Proposed Solution:**

- Add a three-dot menu button (⋮) that appears on all screens
- On mobile: Show three-dot menu always, hide individual buttons
- On desktop: Keep hover behavior for individual buttons, optionally show three-dot menu
- **Implementation:** Create a `MobileActionsMenu` component with dropdown:
  - Read/Unread
  - Archive/Unarchive
  - Add to List
  - Add Tag
  - Delete

**Example Implementation:**

```tsx
{
  /* Desktop: hover actions */
}
<div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100">
  {/* existing buttons */}
</div>;

{
  /* Mobile: three-dot menu */
}
<div className="sm:hidden relative">
  <button onClick={() => setShowMobileMenu(!showMobileMenu)}>⋮</button>
  {showMobileMenu && <MobileActionsDropdown />}
</div>;
```

---

### 3. Queue Display on Mobile - Use Card Layout

**Problem:**

- Current list layout is cramped on mobile
- Similar Articles section in Reader uses nice block/card layout that could be reused

**Current Similar Articles Layout (Reader.tsx line 596-636):**

```tsx
<div className="grid gap-4">
  {similarArticles.map(({ item }) => (
    <Link className="block p-4 rounded-none border border-[var(--color-border)]">
      <div className="flex items-start gap-4">
        {/* thumbnail, title, description, metadata */}
      </div>
    </Link>
  ))}
</div>
```

**Proposed Solution:**

- Create a `ContentCard` variant component for mobile display
- Use the Similar Articles card style as a template
- Toggle between list view (desktop) and card view (mobile)
- Cards should show:
  - Title (prominent)
  - Description (2 lines max)
  - Status indicator
  - Reading time
  - Three-dot action menu

---

### 4. Reader Navbar Too Compressed on Mobile

**Problem:**

- Too many controls in the navbar: Back, Font Size (3 buttons), Theme, Highlights, Archive, Find Related
- Everything gets crushed together on small screens

**Current Code (Reader.tsx line 403-484):**
Contains: Back button, Font Size controls, Theme Toggle, Highlights, Archive, Find Related

**Proposed Solution:**

- **Option A: Collapse into single menu**
  - Keep only "Back" visible
  - Add three-dot menu for all other actions

- **Option B: Two-tier layout on mobile**
  - Top row: Back, Theme Toggle, Three-dot menu
  - Three-dot menu contains: Font Size, Highlights, Archive, Find Related

- **Label Changes:**
  - "← Back to Queue" → "← Back" (saves significant space)
  - "Show/Hide Highlights" → Icon only on mobile
  - "Archive/Unarchive" → Icon only on mobile

**Recommended approach:** Option B with icons

---

### 5. Navbar Covers Article Title + Flicker Issue

**Problem:**

- When scrolling to top, navbar appears and covers the article title
- Navbar shows/hides too sensitively, causing flicker
- Issue affects both mobile and desktop

**Current Code (Reader.tsx line 120-148):**

```tsx
// Show navbar when scrolling up or at top
const currentScrollY = window.scrollY;
if (currentScrollY < lastScrollY) {
  setShowNavbar(true);
} else if (currentScrollY > 100) {
  setShowNavbar(false);
}
setLastScrollY(currentScrollY);
```

**Proposed Solutions:**

1. **Add scroll threshold/debounce:**

```tsx
const SCROLL_THRESHOLD = 10; // Minimum scroll distance to trigger
const deltaY = currentScrollY - lastScrollY;

if (Math.abs(deltaY) > SCROLL_THRESHOLD) {
  if (deltaY < 0 || currentScrollY < 50) {
    setShowNavbar(true);
  } else if (currentScrollY > 100) {
    setShowNavbar(false);
  }
  setLastScrollY(currentScrollY);
}
```

2. **Increase top padding on article:**
   - Current: `pt-24` (6rem)
   - Issue: May still overlap on some devices
   - Consider dynamic padding based on navbar visibility

3. **Alternative: Slide-in from side on mobile**
   - Less intrusive than top navbar
   - Common pattern in reading apps

---

### 6. Insufficient Page Padding on Mobile

**Problem:**

- Text starts almost at the edge of the screen
- No breathing room for comfortable reading

**Current Code (DashboardClient.tsx line 20):**

```tsx
<main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
```

**Current Code (Reader.tsx line 503):**

```tsx
<article className={`max-w-2xl mx-auto px-4 py-8 pt-24`}>
```

**Proposed Solution:**

- Increase mobile padding from `px-4` (1rem) to `px-5` or `px-6` (1.25-1.5rem)
- Add horizontal safe-area padding for notched devices:

```tsx
className = "px-5 sm:px-6 lg:px-8 safe-area-inset-x";
```

In globals.css:

```css
@supports (padding: max(0px)) {
  .safe-area-inset-x {
    padding-left: max(1.25rem, env(safe-area-inset-left));
    padding-right: max(1.25rem, env(safe-area-inset-right));
  }
}
```

---

### 7. Font Size Not Optimized for Mobile

**Problem:**

- Font sizes may be too small or too large on mobile
- Line lengths not optimized for mobile reading

**Current Code (globals.css line 451-528):**

```css
@media (max-width: 640px) {
  body {
    font-size: 16px;
  }
  h1 {
    font-size: 1.75rem;
  }
  h2 {
    font-size: 1.25rem;
  }
  h3 {
    font-size: 1.1rem;
  }
}
```

**Proposed Solution:**

- Content body text: 16px-17px (current 16px is good)
- Article title in reader: Scale down more aggressively
- Metadata text: Keep at `text-xs` (12px)
- Add line-height adjustments for mobile:

```css
@media (max-width: 640px) {
  .prose-editorial {
    font-size: 1rem;
    line-height: 1.8;
  }

  /* Reader font size options adjusted for mobile */
  .reader-font-small {
    font-size: 0.9rem;
  }
  .reader-font-medium {
    font-size: 1rem;
  }
  .reader-font-large {
    font-size: 1.125rem;
  }
}
```

---

### 8. List Management View - Lists Stretched on Mobile

**Problem:**

- Lists should display as square blocks, not full-width stretched
- Maintains visual consistency with desktop

**Proposed Solution:**

- Use CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))`
- Or flex with `flex-wrap: wrap` and fixed width items
- Set maximum width on list cards: `max-w-[160px]` on mobile

---

### 9. Hamburger Button Not Aligned with Logo

**Problem:**

- Hamburger menu button and "sedi" logo are not vertically aligned
- Creates visual imbalance

**Current Code (Navbar.tsx line 28):**

```tsx
<div className="flex items-center justify-between w-full gap-8 h-20">
```

**Proposed Solution:**

- Ensure consistent `items-center` on parent flex container
- Check if hamburger button has extra padding/margin
- Possibly reduce header height on mobile

```tsx
<div className="flex items-center justify-between w-full gap-4 h-16 md:h-20">
```

---

### 10. Theme Toggle Hidden in Hamburger Menu

**Problem:**

- Theme toggle is only accessible via hamburger menu on mobile
- Common action shouldn't require extra tap

**Proposed Solution:**

- Move Theme Toggle outside hamburger menu on mobile
- Place in navbar, next to hamburger button

```tsx
<div className="flex items-center gap-2 md:hidden">
  <ThemeToggle />
  <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
    {/* hamburger icon */}
  </button>
</div>
```

---

### 11. Highlighting Doesn't Work on Mobile

**Problem:**

- Text selection/highlighting relies on mouse events
- Touch devices use different selection APIs
- Highlight toolbar may not appear or position correctly

**Current Implementation (Reader.tsx line 177-232):**
Uses `mouseup` event which doesn't capture touch selection

**Proposed Solutions:**

**Option A: Touch-friendly selection detection**

```tsx
useEffect(() => {
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // Handle selection
    }
  };

  document.addEventListener("selectionchange", handleSelectionChange);
  return () =>
    document.removeEventListener("selectionchange", handleSelectionChange);
}, []);
```

**Option B: Long-press to highlight**

- Detect long-press on text
- Show highlight menu after long-press
- Common pattern in mobile reading apps

**Option C: Selection mode toggle**

- Add "Highlight Mode" button
- When active, any text selection creates highlight
- Reduces accidental highlights

---

## Implementation Priority

### High Priority (Phase 1)

1. **Content Item Actions** - Users can't perform basic actions on mobile
2. **Reader Navbar** - Core functionality is unusable
3. **Page Padding** - Affects readability

### Medium Priority (Phase 2)

4. **Navbar Flicker Fix** - Annoyance but not blocking
5. **Theme Toggle Position** - UX improvement
6. **Hamburger Alignment** - Visual polish

### Lower Priority (Phase 3)

7. **Card Layout for Queue** - Nice to have
8. **Mobile Font Optimization** - Fine-tuning
9. **List View Layout** - Specific to list management
10. **Highlighting on Mobile** - Advanced feature

---

## Technical Approach

### Shared Components to Create

1. `MobileActionsMenu.tsx` - Reusable three-dot menu
2. `ContentCard.tsx` - Card variant of ContentItem
3. `ResponsiveNavbar.tsx` - Refactored Reader navbar

### CSS Changes

1. Add mobile breakpoint utilities in `globals.css`
2. Create safe-area inset helpers
3. Add touch-friendly interaction states

### Testing Considerations

- Test on iOS Safari (notch handling, selection behavior)
- Test on Android Chrome
- Test various screen sizes: 320px, 375px, 414px widths
- Test landscape orientation

---

## Estimated Effort

| Task                        | Estimated Hours |
| --------------------------- | --------------- |
| Content Item Mobile Actions | 3-4 hours       |
| Reader Navbar Refactor      | 2-3 hours       |
| Navbar Scroll Fix           | 1-2 hours       |
| Padding/Spacing Adjustments | 1 hour          |
| Theme Toggle Reposition     | 0.5 hours       |
| Hamburger Alignment Fix     | 0.5 hours       |
| Mobile Highlighting         | 4-6 hours       |
| Card Layout for Queue       | 3-4 hours       |
| Testing & Polish            | 2-3 hours       |
| **Total**                   | **17-24 hours** |

---

## References

- Similar Articles card layout: `Reader.tsx` lines 596-636
- Mobile navbar pattern: `Navbar.tsx` lines 96-156
- Current mobile CSS: `globals.css` lines 451-528
