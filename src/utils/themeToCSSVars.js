import { FONT_OPTIONS } from '../data/defaultTheme';

/**
 * Maps theme tokens (edited via the Style panel) to the CSS custom
 * properties consumed by cv-document.css. This is the single translation
 * point between "user-facing style settings" and "actual rendered pixels",
 * so the document always reflows consistently when a token changes.
 */
export function themeToCSSVars(theme) {
  const font = FONT_OPTIONS.find((f) => f.id === theme.fontFamily) ?? FONT_OPTIONS[0];

  return {
    '--cv-font': font.stack,
    '--cv-ink': theme.accentColor,
    '--cv-muted': theme.mutedColor,
    '--cv-rule': theme.ruleColor,
    '--cv-role': theme.roleColor,
    '--cv-name-size': `${theme.nameSize}pt`,
    '--cv-title-size': `${theme.titleSize}pt`,
    '--cv-heading-size': `${theme.sectionHeadingSize}pt`,
    '--cv-entry-title-size': `${theme.entryTitleSize}pt`,
    '--cv-body-size': `${theme.bodySize}pt`,
    '--cv-role-size': `${theme.roleSize}pt`,
    '--cv-meta-size': `${theme.metaSize}pt`,
    '--cv-unit': `${theme.unit}pt`,
    '--cv-section-gap': theme.sectionGap,
    '--cv-entry-gap': theme.entryGap,
    '--cv-line-height': theme.lineHeight,
    '--cv-margin-x': `${theme.pageMarginX}pt`,
    '--cv-margin-y': `${theme.pageMarginY}pt`,
    '--cv-margin-y-bottom': `${theme.pageMarginYBottom}pt`,
    '--cv-column-gap': `${theme.columnGap}pt`,
    '--cv-left-flex': theme.leftColumnWidth,
    '--cv-right-flex': 100 - theme.leftColumnWidth,
    '--cv-header-align': theme.headerAlign,
    '--cv-heading-align': theme.sectionHeadingAlign,
    '--cv-heading-case': theme.sectionHeadingCase === 'upper' ? 'uppercase' : 'none',
    '--cv-heading-weight': theme.sectionHeadingWeight,
    '--cv-rule-thickness': `${theme.ruleThickness}pt`,
    '--cv-bullet-style': theme.bulletStyle === 'dash' ? "'–  '" : 'disc',
  };
}