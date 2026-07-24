// Theme tokens: the single source of truth for every visual/spacing decision.
// Editing these values (via the Style panel) re-flows the WHOLE document
// consistently, instead of letting individual elements drift out of alignment.

export const FONT_OPTIONS = [
  { id: 'sans', label: 'Sans (Helvetica-like)', stack: '"Helvetica Neue", Arial, "Segoe UI", sans-serif' },
  { id: 'serif', label: 'Serif (Georgia-like)', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'grotesk', label: 'Grotesk (Inter-like)', stack: '"Inter", "Segoe UI", sans-serif' },
  { id: 'mono', label: 'Mono', stack: '"JetBrains Mono", "Courier New", monospace' },
];

export const ACCENT_PRESETS = [
  { id: 'ink', label: 'Classic ink', color: '#141414' },
  { id: 'navy', label: 'Navy', color: '#1c2f4c' },
  { id: 'forest', label: 'Forest', color: '#1f3d2e' },
  { id: 'maroon', label: 'Maroon', color: '#5c1a2b' },
  { id: 'slate', label: 'Slate', color: '#33404d' },
];

export function createDefaultTheme() {
  return {
    fontFamily: 'sans',
    // Base sizes in pt (print-native unit) — everything else derives via scale ratios.
    // Hierarchy, largest to smallest:
    //   H1  nameSize            — the person's name (page title)
    //   H2  sectionHeadingSize  — section headings (SUMMARY, EDUCATION, ...)
    //   H3  entryTitleSize      — entry titles within a section (org / degree)
    //   body bodySize           — running text (descriptions, bullets)
    //   role roleSize           — the role/subtitle line under an entry title
    //   meta metaSize           — dates, locations, contacts
    nameSize: 22, // H1
    titleSize: 9.5,
    sectionHeadingSize: 11, // H2
    entryTitleSize: 9.5, // H3
    bodySize: 8.4,
    roleSize: 8.4,
    metaSize: 7.6,

    accentColor: '#141414',
    mutedColor: '#5a5a5a',
    ruleColor: '#141414',
    // Role/subtitle lines (e.g. "Bachelor of Engineering - Part II
    // Mechatronics", "(online tutoring)") are set in this color rather than
    // bolded, so they stand out from body text without competing with the
    // entry title's weight.
    roleColor: '#8a5a12',

    // Spacing scale in pt. All vertical rhythm derives from `unit`.
    unit: 6,
    sectionGap: 1.6, // multiples of `unit` between sections
    entryGap: 1.0, // multiples of `unit` between entries within a section
    lineHeight: 1.3,

    // Layout — page dimensions are fixed to A4 (see A4_HEIGHT_PT in paginate.js).
    pageMarginX: 18, // pt
    pageMarginY: 26, // pt — top margin
    pageMarginYBottom: 20, // pt — intentionally slightly less than the top margin
    columnGap: 10, // pt
    leftColumnWidth: 62, // percent
    twoColumn: true,
    headerAlign: 'center', // 'left' | 'center'
    sectionHeadingAlign: 'left',
    sectionHeadingCase: 'upper', // 'upper' | 'title'
    sectionHeadingWeight: 700,
    showSectionRule: true,
    ruleThickness: 1,

    // Pagination: how many A4 pages the document may flow across. 1 keeps
    // strict single-page behavior (content is measured against one page's
    // available height, full stop). 2 lets content that doesn't fit on
    // page 1 automatically continue onto page 2 — real pagination (see
    // utils/paginate.js) decides which sections land on which page by
    // measuring their actual rendered height, so each page's content
    // naturally ends at that page's own bottom margin without any manual
    // "auto-fit" step.
    maxPages: 1,

    // Per-page manual page-break overrides, keyed by 1-based page number
    // (e.g. `{ 1: 512.4 }`). When a page has an entry here, pagination
    // (see utils/paginate.js) fills that page up to exactly that content
    // height and stops, ignoring its own fit-checking/margin safety —
    // content can end up clipped past the page's printable margin if the
    // value doesn't leave room for the trailing bottom margin. Set via
    // dragging the page-break handle in edit mode; cleared by dragging it
    // back to (or past) the automatic position, or via its reset control.
    manualBreaks: {},

    // Bullets
    bulletStyle: 'disc', // 'disc' | 'dash'
  };
}