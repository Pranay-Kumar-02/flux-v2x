# Accessibility Statement for FluxV2X

FluxV2X is committed to ensuring digital accessibility for security researchers, data engineers, and developers of all abilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

---

## 1. Conformance Target
The FluxV2X Web user interface targets **WCAG 2.2 Level AA** compliance.

### Implemented Accessibility Features:
- **Keyboard Navigation**: All interactive elements (navigation buttons, modal controls, tab selectors, forms) receive visible focus rings and can be activated via standard keyboard shortcuts (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`).
- **Contrast & Typography**: The interface utilizes an optimized dark theme with WCAG AA compliant contrast ratios for primary body text, mathematical metrics, and status badges.
- **Semantic Structure**: Semantic HTML5 landmark tags (`<header>`, `<aside>`, `<main>`, `<nav>`, `<section>`) are used throughout the application to facilitate screen reader navigation.
- **Form Controls & Labels**: Form inputs in the Schema & Feature Lab, Model Laboratory, and Mitigation Simulator have programmatically associated labels and readable placeholders.
- **Data Tables & Data Visualization**: Tables include `<th>` header scopes and sticky headers for tabular navigation. Chart views provide numeric textual representations alongside graphical views.
- **Motion & Animations**: Pulse and transition animations respect the user's `prefers-reduced-motion` browser preferences.

---

## 2. Known Limitations & Technical Roadmap
While we strive for comprehensive accessibility, certain complex telemetry views are undergoing active enhancements:
- **Interactive Spatiotemporal Maps**: The 2D scatter coordinates in the Network Context Explorer currently rely on Canvas/SVG rendering. We are implementing an accessible tabular drill-down alternative for users utilizing assistive screen-reading technologies.
- **High-Density Decision Traces**: Chronological traces exceeding 100 rows provide pagination controls to avoid overwhelming buffer sizes in braille and speech readers.

---

## 3. Feedback and Reporting Issues
If you encounter accessibility barriers while using FluxV2X, or have suggestions for improvement, please let us know:
- **GitHub Issue**: Open an issue tagged `a11y` or `accessibility` on our [GitHub Issue Tracker](https://github.com/Pranay-Kumar-02/flux-v2x/issues).
- **Details to Include**: The page URL/view name, assistive technology used (screen reader, keyboard only, magnifier), browser version, and a description of the barrier.

We review accessibility feedback promptly and prioritize fixes in upcoming release cycles.
