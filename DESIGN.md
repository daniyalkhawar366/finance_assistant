---
name: Editorial Utility
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#c8c5cb'
  on-secondary: '#303034'
  secondary-container: '#47464b'
  on-secondary-container: '#b6b4ba'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e4e1e7'
  secondary-fixed-dim: '#c8c5cb'
  on-secondary-fixed: '#1b1b1f'
  on-secondary-fixed-variant: '#47464b'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  numeric-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  internal-padding: 1.5rem
  external-gap: 0.75rem
  section-margin: 2rem
  table-cell-padding: 1rem
---

## Brand & Style

This design system is built on the principles of **Editorial Minimalism** and **Technical Precision**. It is designed for a high-net-worth fintech audience that values density of information without the clutter of traditional banking interfaces. The aesthetic takes cues from developer-centric tools like Linear, prioritizing functional clarity and "calm confidence."

The brand personality is authoritative yet understated. It avoids decorative elements in favor of structural integrity. Every pixel must serve a purpose; whitespace is used as a separator rather than just a void, creating a layout that feels both expansive and information-rich. The emotional response should be one of complete control and professional-grade reliability.

## Colors

The palette is strictly dark-mode, utilizing a layered approach to create depth. The foundation is a near-black **Background (#0A0A0F)**, with secondary **Surface Cards (#141418)** sitting directly above. 

- **Primary Indigo (#6366F1):** Reserved for high-intent actions, active states, and focus indicators. It should be used sparingly to maintain the "muted" aesthetic.
- **Off-White (#F2F2F2):** The primary text color, providing high contrast without the eye strain of pure white.
- **Borders (#2A2A35):** Essential for structural definition. All surfaces are defined by a 1px solid border.
- **Data Indicators:** Green, Red, and Amber are desaturated to ensure they fit within the editorial theme while remaining legible as semantic signals.

## Typography

Typography in this design system is treated as a structural element. **Inter** is the sole typeface, chosen for its clarity and extensive OpenType features.

**Critical Instruction:** All financial figures and data points must use `font-variant-numeric: tabular-nums`. This ensures that columns of numbers align perfectly, facilitating quick scanning of financial reports.

Line heights are kept tight to support data density. Use uppercase labels with slight letter spacing for secondary navigation or category headers to create clear visual hierarchy without increasing font size.

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy for desktop layouts and a fluid structure for mobile. The layout is centered on a 12-column grid.

- **Internal Padding:** Generous (24px) to give content room to breathe within its container.
- **External Gaps:** Tight (12px) to maintain a dense, technical "cockpit" feel where components feel interconnected.
- **Bento Grid Logic:** Dashboards should utilize a Bento-box approach, where cards vary in column span (e.g., 4, 8, or 12) but maintain a uniform height per row to ensure a clean horizontal axis.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and 1px borders rather than shadows. 

1. **Level 0 (Background):** The deepest layer (#0A0A0F).
2. **Level 1 (Cards/Sidebar):** Raised surface (#141418) with a 1px solid border (#2A2A35).
3. **Level 2 (Popovers/Modals):** A slightly lighter surface (#1C1C22) with a more prominent border (#3F3F4E).

Shadows are strictly forbidden. To indicate focus or interactivity, use a subtle color shift in the border (moving from #2A2A35 to #6366F1) or a slight background highlight.

## Shapes

The shape language is "sharp-ish" to reinforce the feeling of precision. 

- **Standard Elements:** 4px (rounded-sm) for small components like checkboxes or mini-pills.
- **Containers/Cards:** 8px (rounded-md) for all dashboard cards and primary buttons.
- **Large Sections:** 12px (rounded-lg) for main app containers if nested.

Avoid fully circular (pill-shaped) elements except for status indicators where distinction from buttons is required.

## Components

### Navigation Sidebar
A persistent, narrow sidebar on the left. Icons should be stroke-based (1.5px weight) with labels in `label-md` style. Active states use a subtle vertical 2px indigo line on the far left.

### Bento-Grid Cards
Containers for data visualization. Each card must have a 1px border and 24px internal padding. Titles are placed in the top-left using `headline-md`.

### Data Tables
Tables are the heart of the interface. 
- **Header:** Uppercase `label-md`, muted opacity.
- **Rows:** 1px bottom border only. Hover state changes the background to a slightly lighter gray (#1C1C22).
- **Cells:** Use `numeric-data` for all monetary values.

### Input Fields
Darker than the surface (#0A0A0F), 1px border. Focus state changes border to Primary Indigo. No glows or shadows on focus.

### Progress Bars
Ultra-thin (4px height). Background track is the border color (#2A2A35), with the fill using the Indigo or semantic status colors.

### Category Pills
Muted backgrounds (low opacity of the text color) with 0.5px borders. Text is always `label-md`.