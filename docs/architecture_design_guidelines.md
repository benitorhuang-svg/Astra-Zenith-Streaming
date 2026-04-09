# Synapse Web SDK: Architecture & Design Guidelines
## Pure Tailwind CSS v4 + Block Decomposition

---

### 1. Single-Origin CSS Architecture

This project uses a **Single-Origin** CSS architecture powered by **Tailwind CSS v4**.
There is exactly **one** CSS pipeline: Tailwind processes `input.css` and generates the final compiled output.

#### The Golden Rule

```
                   ┌─────────────┐
 input.css ──────► │ Tailwind v4 │ ──────► Compiled Output (served to browser)
 (source hub)      │   Compiler   │
                   └─────────────┘
```

**Every CSS rule flows through Tailwind's `@layer` system.** There is no "second origin."

---

### 2. Tailwind CSS v4: The `@layer` System

Tailwind v4 uses CSS `@layer` to control cascade specificity. Our project organizes all styles into four layers:

```
@layer base       ← Global resets, body defaults
@layer theme      ← Design tokens (CSS custom properties per theme)
@layer components ← Reusable component classes (.a-*, .m-*, .o-*, .g-*)
@layer utilities  ← Single-property atomic classes (.u-*)
```

#### Layer Cascade Order (Low → High specificity)

```
base < theme < components < utilities
```

> **Key**: Utilities always win over components. Components always win over base.
> This means a `.u-bg-card` on an element will override the `background` set by `.m-card`.

---

### 3. File Organization

#### `input.css` — The Single Entry Point

```css
@import "tailwindcss";       /* ← Tailwind v4 core (base, utilities) */

/* ── Layer 1: Theme ──────────────────────────── */
@layer theme    { @import "./theme.css"; }

/* ── Layer 2: Components ─────────────────────── */
@layer components {
    @import "./atoms.css";
    @import "./molecules.css";
    @import "./organisms.css";
    @import "./portal_components.css";
    @import "./vfx.css";
}

/* ── Layer 3: Utilities ──────────────────────── */
@layer utilities { @import "./overrides.css"; }
```

#### File Directory

```
src/styles/
  ├── input.css              ← Entry point (Tailwind + @layer imports)
  ├── theme.css              ← Design tokens (:root variables per theme)
  ├── atoms.css              ← .a-glass, .a-bracket, .a-status-dot
  ├── molecules.css          ← .m-card, .m-badge, .m-profile
  ├── organisms.css          ← .o-header, .o-log-stream, .o-hud, .o-portal
  ├── portal_components.css  ← Portal-specific: drag, seats, ghost
  ├── vfx.css                ← Backdrop VFX, scrollbar, keyframes, scanner
  └── overrides.css          ← Tactical !important overrides (HUD status-bar)
```

#### What Changed From The Old Structure

| Old (Dual-Origin) | New (Pure Tailwind) | Reason |
|:-------------------|:--------------------|:-------|
| `az_blueprint.css` (49KB orphan) | **DELETED** | Not loaded by HTML; dead weight |
| `tailwind.config.js` | **DELETED** | Tailwind v4 uses `@theme` in CSS |
| `layout_utils.css` | **DELETED** | Replaced by Tailwind natives: `flex`, `gap-4`, `w-full` |
| `spacing_utils.css` | **DELETED** | Replaced by Tailwind natives: `p-4`, `mt-2`, `gap-6` |
| `typography_utils.css` | **DELETED** | Replaced by Tailwind natives: `text-sm`, `font-mono` |
| `surface_utils.css` | **DELETED** | Replaced by Tailwind natives: `bg-card`, `border`, `rounded-lg` |
| `effects_utils.css` | Merged → `vfx.css` | Consolidated with `utilities.css` |
| `utilities.css` | Merged → `vfx.css` | Backdrop, scrollbar, keyframes in one place |
| `overrides.css` | **NEW** | Isolated HUD `!important` overrides |

---

### 4. Design Tokens: `@theme` Block

Tailwind v4 allows extending the theme directly in CSS using `@theme`:

```css
@theme {
    --color-primary: var(--primary);
    --color-accent: var(--accent);
    --color-success: var(--success);
    --color-bg: var(--background);
    --color-surface: var(--surface-glass);
    --color-card: var(--surface-card);
    --color-text-main: var(--text-main);
    --color-text-dim: var(--text-dim);
    --font-headline: 'Outfit', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
}
```

> This replaces `tailwind.config.js`. All token mapping lives inside `input.css`.

---

### 5. Naming Convention

All hand-written classes follow **Atomic Design prefixes**:

| Prefix | Layer | Example | Description |
|:-------|:------|:--------|:------------|
| `.a-*` | Atom | `.a-glass`, `.a-bracket` | Pure visual primitives |
| `.m-*` | Molecule | `.m-card`, `.m-badge` | Small composites |
| `.o-*` | Organism | `.o-header`, `.o-hud` | Full UI sections |
| `.g-*` | Global | `.g-backdrop` | Page-level VFX |
| `.u-*` | Utility | `.u-scrollbar` | Only for things Tailwind can't do |

#### When to use `.u-*` vs Tailwind native?

| Need | Do This | Don't Do This |
|:-----|:--------|:--------------|
| `display: flex` | Use Tailwind `flex` | ~~`.u-flex`~~ |
| `padding: 1rem` | Use Tailwind `p-4` | ~~`.u-p-4`~~ |
| Custom scrollbar | Use `.u-scrollbar` | Can't do in Tailwind |
| Glassmorphism | Use `.a-glass` | Too complex for utilities |

---

### 6. Ghost Code Prevention Rules

1. **No Duplicate Classes**: Every selector defined in exactly ONE file. No cross-file duplication.
2. **No .u-* Wrappers for Tailwind Builtins**: If Tailwind has `flex`, never create `.u-flex`.
3. **No Alias Variables**: If `--surface-card` exists, do not create `--card-surface`.
4. **Single @keyframes Owner**: Each animation keyframe defined in exactly ONE file (`vfx.css`).
5. **No Orphan CSS**: Every `.css` file must be imported in `input.css`. Standalone files = ghost code.

---

### 7. Block Decomposition: TypeScript Components

**Goal:** Reduce cognitive load of large TS components.

#### When to Decompose?
- Component `.ts` file exceeds **250–300 lines**
- Component has multiple distinct functional zones (Sidebar, HUD, Table)

#### Implementation Pattern
- **Modular Renderers**: `az_portal_hud.ts`, `az_portal_table.ts`, `az_portal_sidebar.ts`
- **Encapsulated State**: Sub-renderers receive only needed data via typed parameters
- **No Inline Styles**: All `style="..."` in TS templates → extract to CSS classes in the appropriate layer file

#### Case Study: `az_portal` Refactor

```
az_portal.ts (orchestrator)
  ├── az_portal_hud.ts      ← HUD template renderer
  ├── az_portal_table.ts    ← Table/seats template
  ├── az_portal_sidebar.ts  ← Sidebar template
  └── az_portal_drag.ts     ← Drag & drop logic
```

---

### 8. Developer Best Practices

1. **Tailwind First**: Use Tailwind utility classes for layout, spacing, typography, colors.
2. **Components for Complexity**: Create `.a-*/m-*/o-*` classes only for multi-property, reusable visual treatments.
3. **Decompose at 300 Lines**: If a `.ts` file exceeds 300 lines, extract sub-renderers immediately.
4. **Pass Props, Not "This"**: Sub-renderers receive specific state values, not the entire component.
5. **No Orphan Files**: Every CSS file must be `@import`'d in `input.css`. Every TS file must be imported.
6. **Test Before Delete**: Before removing any CSS rule, verify it's not the sole provider via DevTools > Computed.
