import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HeaderBlock from './sections/HeaderBlock';
import SectionBlock from './sections/SectionBlock';
import { themeToCSSVars } from '../utils/themeToCSSVars';
import { usePagination } from '../utils/paginate';

const HEADER_PSEUDO_ID = '__header__';

/**
 * Renders the CV. There are two distinct visual modes:
 *
 * PREVIEW (`editing = false`): real, separately-margined A4 page boxes —
 * exactly what export produces, since export clones this same DOM. Fixed
 * height, `overflow: hidden`, content sliced into fragments per page by
 * `usePagination`.
 *
 * EDITING (`editing = true`): ONE continuous flowing column per the
 * left/right column split — no fixed page height, no clipping, no page
 * breaks shown at all. Every section renders here in full regardless of
 * which page(s) it will actually land on in Preview/export. This is what
 * makes the "content doesn't fit in edit mode because of button chrome"
 * problem structurally impossible: since there's no fixed-height box in
 * edit mode, there's nothing for extra chrome height to overflow OUT of.
 *
 * PAGE BREAKS: where a page actually ends is controlled entirely via
 * `theme.manualBreaks[pageNumber]`, a plain content-height number in pt,
 * set directly in the Style panel's "Manual page breaks" section rather
 * than any visual/draggable indicator in this component. paginate.js
 * honors a set value by forcing that page's packing target to exactly
 * that height with no fit-checking or safety margin — content can end up
 * clipped past the printable margin if the value doesn't leave room for
 * it, which is expected once manual control is taken. Leaving a page's
 * value unset falls back to fully automatic packing. Switch to Preview
 * to see exactly where a given value lands; this was previously done via
 * an in-editor draggable line, which was removed after repeated attempts
 * to keep its on-screen position faithful to Preview's real per-column,
 * per-page pack results proved too unreliable to trust.
 *
 * ACTIVE SECTION: `activeSectionId` (lifted to App.jsx) controls which
 * section currently shows its empty/placeholder fields and move/remove
 * controls — every other section (and the header, tracked via the
 * reserved `HEADER_PSEUDO_ID`) renders as compactly as preview does.
 * This never affects the measurement host below, which always renders
 * with `editing={false}` regardless of what's active on screen.
 *
 * `onPagesChange(pages)`: called (from an effect, not during render) with
 * the resolved page list whenever pagination recomputes.
 */
const CVDocument = forwardRef(function CVDocument(
  { cv, theme, editing = false, onPagesChange, activeSectionId = null, onActivateSection },
  ref
) {
  const cssVars = themeToCSSVars(theme);
  const [measureHostEl, setMeasureHostEl] = useState(null);
  const measureHostRefCallback = useRef((node) => setMeasureHostEl(node));

  const { pages, overflowsMaxPages, ready, pending } = usePagination(measureHostEl, cv, theme);

  const wholeSectionFragments = (sectionIds) =>
    sectionIds.map((id) => ({ sectionId: id, type: cv.sections[id]?.type, itemStart: 0, itemEnd: null, showHead: true, splits: {} }));

  const resolvedPages = pages ?? [
    {
      marginTop: theme.pageMarginY,
      marginBottom: theme.pageMarginYBottom,
      leftColumn: wholeSectionFragments(cv.layout.leftColumn),
      rightColumn: theme.twoColumn ? wholeSectionFragments(cv.layout.rightColumn) : [],
      manualBreakPt: theme.manualBreaks?.[1] ?? null,
      naturalHeightPt: 842 - theme.pageMarginY - theme.pageMarginYBottom,
      leftNaturalHeightPt: 842 - theme.pageMarginY - theme.pageMarginYBottom,
      rightNaturalHeightPt: 842 - theme.pageMarginY - theme.pageMarginYBottom,
    },
  ];
  const resolvedOverflowsMaxPages = pages ? overflowsMaxPages : false;

  useEffect(() => {
    if (ready && typeof onPagesChange === 'function') {
      onPagesChange(resolvedPages, pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, resolvedPages, pending, onPagesChange]);

  const measureHost = createPortal(
    // Rendered via a portal straight to document.body — NOT as a normal
    // descendant of this component's own render tree — because this
    // component can itself end up nested inside App.jsx's zoom wrapper
    // (`.page-wrap`, which applies `transform: scale(zoom)`). Per the CSS
    // spec, any ancestor with a `transform` becomes the containing block
    // for `position: fixed` descendants, which means `.cv-measure-host`'s
    // "position: fixed; left: -100000px" (meant to escape to the true,
    // unzoomed viewport — see its own CSS comment) would otherwise be
    // computed relative to that transformed ancestor instead, and its
    // rendered size would be scaled by `zoom` right along with it. Every
    // height paginate.js reads from this host would then be wrong by a
    // factor of 1/zoom — e.g. at 90% zoom, every measured height comes
    // out roughly 11% too large — which makes the packer believe content
    // is taller than it truly is and stop packing far short of a page's
    // real available height. A portal to `document.body` sidesteps this
    // entirely: there is no transformed ancestor between the host and
    // the true viewport, at any zoom level, ever.
    <div className="cv-measure-host" ref={measureHostRefCallback.current} style={cssVars} aria-hidden="true">
      <div data-header>
        <HeaderBlock header={cv.header} editing={false} showRule={false} />
      </div>
      <div className={`cv-measure-columns ${theme.twoColumn ? '' : 'single'}`}>
        <div className="cv-measure-column cv-measure-column-left">
          {(theme.twoColumn ? cv.layout.leftColumn : [...cv.layout.leftColumn, ...cv.layout.rightColumn]).map((id) => {
            const section = cv.sections[id];
            if (!section) return null;
            return <SectionBlock key={id} section={section} editing={false} showRule={theme.showSectionRule} />;
          })}
        </div>
        {theme.twoColumn && (
          <div className="cv-measure-column cv-measure-column-right">
            {cv.layout.rightColumn.map((id) => {
              const section = cv.sections[id];
              if (!section) return null;
              return <SectionBlock key={id} section={section} editing={false} showRule={theme.showSectionRule} />;
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  if (editing) {
    return (
      <div className="cv-page-stack cv-continuous" ref={ref} data-page-count={resolvedPages.length}>
        {measureHost}
        <ContinuousDocument
          cv={cv}
          theme={theme}
          cssVars={cssVars}
          activeSectionId={activeSectionId}
          onActivateSection={onActivateSection}
        />
      </div>
    );
  }

  return (
    <div className="cv-page-stack" ref={ref} data-page-count={resolvedPages.length}>
      {measureHost}
      {resolvedPages.map((page, index) => (
        <Page
          key={index}
          page={page}
          pageNumber={index + 1}
          cv={cv}
          theme={theme}
          cssVars={cssVars}
          isLastPage={index === resolvedPages.length - 1}
          overflowsMaxPages={resolvedOverflowsMaxPages}
        />
      ))}
    </div>
  );
});

export default CVDocument;

/**
 * Edit-mode continuous view: the header, then every section in full
 * (never sliced by page fragments — unlike preview, ALL content for
 * every section always renders here, since there's no fixed page to
 * slice it against). Where pages actually break is no longer shown
 * inline here — see the "Manual page breaks" section of the Style panel
 * for setting/adjusting the break height directly as a number, and
 * switch to Preview to see exactly where it lands.
 */
function ContinuousDocument({ cv, theme, cssVars, activeSectionId, onActivateSection }) {
  const renderColumn = (sectionIds) =>
    sectionIds.map((id) => {
      const section = cv.sections[id];
      if (!section) return null;
      return (
        <SectionBlock
          key={id}
          section={section}
          editing
          showRule={theme.showSectionRule}
          isActive={activeSectionId === id}
          onActivate={onActivateSection}
        />
      );
    });

  return (
    <div
      className="cv-page cv-continuous-page editing"
      style={{
        ...cssVars,
        '--cv-page-margin-top': `${theme.pageMarginY}pt`,
        '--cv-page-margin-bottom': `${theme.pageMarginYBottom}pt`,
      }}
    >
      <HeaderBlock
        header={cv.header}
        editing
        showRule={false}
        isActive={activeSectionId === HEADER_PSEUDO_ID}
        onActivate={() => onActivateSection?.(HEADER_PSEUDO_ID)}
      />
      <div className={`cv-columns ${theme.twoColumn ? '' : 'single'}`} data-columns-root>
        <div className="cv-column cv-column-left" data-column="left">
          {renderColumn(theme.twoColumn ? cv.layout.leftColumn : [...cv.layout.leftColumn, ...cv.layout.rightColumn])}
        </div>
        {theme.twoColumn && (
          <div className="cv-column cv-column-right" data-column="right">
            {renderColumn(cv.layout.rightColumn)}
          </div>
        )}
      </div>
    </div>
  );
}

function Page({ page, pageNumber, cv, theme, cssVars, isLastPage, overflowsMaxPages }) {
  const pageElRef = useRef(null);

  const renderFragment = (frag) => {
    const section = cv.sections[frag.sectionId];
    if (!section) return null;
    return (
      <SectionBlock
        key={`${frag.sectionId}:${frag.itemStart}:${frag.splits ? JSON.stringify(frag.splits) : '0'}`}
        section={section}
        editing={false}
        showRule={theme.showSectionRule}
        itemStart={frag.itemStart}
        itemEnd={frag.itemEnd}
        showHead={frag.showHead}
        splits={frag.splits || {}}
      />
    );
  };

  return (
    <>
      {pageNumber > 1 && (
        <div className="cv-page-separator no-print">
          <span className="cv-page-separator-margin">{`↓ ${theme.pageMarginYBottom}pt bottom margin`}</span>
          <div className="cv-page-separator-line" />
          <span className="cv-page-separator-label">{`Page ${pageNumber - 1} → Page ${pageNumber}`}</span>
          <div className="cv-page-separator-line" />
          <span className="cv-page-separator-margin">{`${theme.pageMarginYBottom}pt top margin ↓`}</span>
        </div>
      )}
      <div
        ref={pageElRef}
        className="cv-page"
        style={{
          ...cssVars,
          '--cv-page-margin-top': `${page.marginTop}pt`,
          '--cv-page-margin-bottom': `${page.marginBottom}pt`,
        }}
          data-page-number={pageNumber}
      >
        {pageNumber === 1 && <HeaderBlock header={cv.header} editing={false} showRule={false} />}
        <div className={`cv-columns ${theme.twoColumn ? '' : 'single'}`} data-columns-root>
          <div className="cv-column cv-column-left" data-column="left">
            {page.leftColumn.map(renderFragment)}
          </div>
          {theme.twoColumn && (
            <div className="cv-column cv-column-right" data-column="right">
              {page.rightColumn.map(renderFragment)}
            </div>
          )}
        </div>

        {isLastPage && overflowsMaxPages && (
          <div className="cv-page-break no-print">
            <span>
              Content past this page exceeds your {theme.maxPages === 1 ? '1-page' : `${theme.maxPages}-page`} limit
              and won&rsquo;t appear in the exported PDF — trim content, set a manual page break height in the
              Style panel, or raise the page limit there.
            </span>
          </div>
        )}
      </div>
    </>
  );
}