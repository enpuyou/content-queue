# UI Enhancement Skill

## Purpose
Research modern UI patterns and components, present curated options with live examples, gather user preference, and implement the chosen design with proper tutorial-style explanations.

## When to Use
- User wants to improve or add UI components
- Modernizing existing interface elements
- Adding new visual features or interactions
- Redesigning components for better UX

## Workflow

### Phase 1: Research & Discovery (Auto)
1. **Understand the Context**
   - Read the target component/page code
   - Identify current design patterns and tech stack
   - Note existing styling approach (Tailwind classes, themes, etc.)

2. **Research Modern Patterns**
   - Search for 2026 modern UI/UX trends relevant to the task
   - Focus on: React 19, Next.js 14+, Tailwind CSS v4, modern design systems
   - Look for accessibility best practices
   - Find real-world examples from popular sites/libraries

3. **Curate 2-4 Options**
   For each option, provide:
   - **Name & Description**: Clear, concise name and what makes it unique
   - **Visual Example**: Link to CodePen, CodeSandbox, or screenshot from modern sites
   - **Pros & Cons**: Honest assessment (accessibility, mobile support, complexity)
   - **Best For**: Specific use cases where this pattern excels
   - **Code Preview**: Small snippet showing the key technique

### Phase 2: User Selection (Interactive)
Present options using AskUserQuestion tool:
- Show all options with visual examples
- Allow user to pick one or provide custom direction
- Ask clarifying questions about preferences if needed

### Phase 3: Implementation (Tutorial Mode)
Once user chooses an option:

1. **Explain the Approach**
   - Overview of what will change and why
   - Architecture/component structure decisions
   - Any dependencies or setup needed

2. **Show the Code**
   - Indicate exact file paths and locations
   - Include comments explaining key parts
   - Highlight what's changed from the original

3. **Implementation Steps**
   Break down into numbered steps:
   ```
   Step 1: Update imports in ComponentName.tsx
   Add these imports at the top:
   ```tsx
   import { useState, useEffect } from 'react';
   ```

   This brings in React hooks we'll use for state management and side effects.

   Step 2: Add state for the new feature...
   ```

4. **Explain Each Addition**
   - What the code does
   - Why this approach was chosen
   - How it integrates with existing code
   - Any edge cases or gotchas

5. **Testing Guidance**
   - How to verify it works
   - What to look for in the UI
   - Common issues and how to debug

### Phase 4: Follow-up
- Check if user needs refinements
- Offer to adjust based on visual feedback
- Suggest related improvements (don't implement unless asked)

## Example Invocation
```
User: "The content cards look outdated, let's modernize them"
