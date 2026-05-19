---
name: Quiet Scribe
colors:
  surface: '#121413'
  surface-dim: '#121413'
  surface-bright: '#383a38'
  surface-container-lowest: '#0d0f0e'
  surface-container-low: '#1a1c1b'
  surface-container: '#1e201f'
  surface-container-high: '#282a29'
  surface-container-highest: '#333534'
  on-surface: '#e2e3e1'
  on-surface-variant: '#c1c8c1'
  inverse-surface: '#e2e3e1'
  inverse-on-surface: '#2f3130'
  outline: '#8b928c'
  outline-variant: '#424843'
  surface-tint: '#a9cfb7'
  primary: '#a9cfb7'
  on-primary: '#143725'
  primary-container: '#2d4f3c'
  on-primary-container: '#9ac0a7'
  inverse-primary: '#436651'
  secondary: '#b9c7e0'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d2'
  tertiary: '#f2b8bb'
  on-tertiary: '#4b2528'
  tertiary-container: '#663c3f'
  on-tertiary-container: '#e1a8ab'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c5ecd2'
  primary-fixed-dim: '#a9cfb7'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#2c4e3b'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#f2b8bb'
  on-tertiary-fixed: '#321114'
  on-tertiary-fixed-variant: '#653b3e'
  background: '#121413'
  on-background: '#e2e3e1'
  surface-variant: '#333534'
typography:
  editor-title:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  editor-body:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  ui-header:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  ui-nav:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  ui-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 260px
  editor-max-width: 720px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is centered on the concept of "Digital Ink"—a focused, distraction-free environment for deep thought and long-form writing, optimized for night-time focus and reduced eye strain. It targets knowledge workers, researchers, and writers who require a reliable, immersive workspace.

The visual style is **Minimalist** with a touch of **Editorial** flair. It prioritizes clarity over decoration, using subtle tonal shifts to create hierarchy. The aesthetic is intentionally understated, evoking the feeling of a premium fountain pen on heavy, dark-toned stationery.

## Colors
The palette is optimized for dark mode legibility and ocular comfort during long writing sessions.
- **Primary:** A deep forest green used for primary actions, active navigation states, and the "Synced" status.
- **Secondary:** A cool slate blue-gray used for secondary UI elements and supporting icons.
- **Neutral:** A range of deep charcoal and "ink" tones derived from a cool neutral base, providing a soft-contrast background for light-colored text.
- **Backgrounds:** Use a deep, near-black "ink" surface for the main editor and slightly lighter charcoal tones for the sidebar and containers to create a clear structural hierarchy.

## Typography
The design system employs a dual-font strategy:
- **Inter (Sans-Serif):** Used for all functional UI elements, including navigation, buttons, tooltips, and labels. It provides a modern, utilitarian feel for the application shell.
- **Source Serif 4 (Serif):** Reserved exclusively for the note-taking experience (titles and body text). This enhances readability for long-form content and differentiates "the work" from "the tool."

Line heights are intentionally tall in the editor to facilitate comfortable reading in low-light environments. UI labels use slightly increased letter spacing and uppercase styling for hierarchy.

## Layout & Spacing
The design system follows a **Fixed-Fluid** layout model optimized for desktop environments.
- **Sidebar:** A fixed-width navigation panel on the left (260px) containing folder structures and the note list.
- **Main Canvas:** A fluid area that houses the editor. The editor itself is constrained to a maximum width of 720px and centered to prevent eye strain.
- **Spacing Rhythm:** Based on an 8px grid. Use `stack-md` (16px) for standard component padding and `stack-lg` (32px) for section margins.
- **Focus Mode:** On smaller windows or when toggled, the sidebar collapses entirely, allowing the editor to occupy the full width of the viewable area.

## Elevation & Depth
In keeping with the minimalist philosophy, this design system avoids heavy drop shadows. In this dark theme, depth is communicated through **Tonal Layering** (making elevated surfaces slightly lighter):
- **Level 0 (Base):** The editor area is the deepest surface (darkest ink color).
- **Level 1 (Surface):** The sidebar and secondary panels use a slightly lighter charcoal tint to appear "closer" to the user.
- **Level 2 (Overlays):** Modals and context menus use the lightest surface color in the palette with a thin 1px border to define their edges against the dark background.

Interaction states (e.g., hovering over a note in the list) are signaled by subtle background color shifts rather than elevation changes.

## Shapes
The shape language is "Rounded" and approachable. 
- UI elements like buttons, input fields, and tags use a consistent 8px radius (`roundedness: 2`).
- Active state indicators (like the highlight in the sidebar) follow this rounded language to feel modern and friendly.
- Avoid large circular or pill-shaped buttons to maintain the structured, editorial appearance.

## Components
- **Buttons:** Primary buttons are solid Forest Green with white text. Secondary buttons use a ghost style (transparent background) with a Slate border and text. All buttons feature 8px corner rounding.
- **Sync Status Indicator:** A small, circular dot next to the note title. Solid Forest Green indicates "Synced," a pulsing Amber indicates "Saving," and an Outline Gray indicates "Offline Mode."
- **Sidebar Items:** Use a subtle lighter charcoal background fill for the active state, with 8px rounded corners.
- **Input Fields:** Search bars and metadata fields are borderless with a slightly lighter charcoal background fill, appearing flush with the UI until focused.
- **Note Cards (List View):** Minimalist entries in the sidebar containing a title and a single-line preview. No borders; use vertical spacing to separate entries.
- **The Editor:** A distraction-free canvas. Formatting tools are hidden by default, appearing only upon text selection or via a subtle floating bar at the bottom of the screen.