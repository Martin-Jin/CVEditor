import { useLayoutEffect, useRef, useState } from 'react';

const A4_HEIGHT_PT = 842;
const PT_PER_PX = 72 / 96;
const DEBOUNCE_MS = 60;
// Fraction of a page's available height reserved as safety slack before
// packing, for automatically-paginated pages only (never applied when a
// page has a manual break override — see computePages). Measured directly:
// exporting re-renders the same page content from scratch in a brand-new
// popup window/document (see exportPDF.js) rather than reusing the
// measured layout, and on a real CV that fresh render came out ~3.5%
// taller than what was measured here for the identical content/width
// (691.55pt measured vs 715.65pt actually rendered) — most likely
// per-line sub-pixel rounding in a separate layout/paint pass, which
// compounds with a fractional OS display-scale factor (e.g. Windows at
// 125%) and accumulates across every wrapped line on the page. A flat
// few-point buffer doesn't scale with how much text is on the page, which
// is why bumping it from 2pt to 6pt made no visible difference — reserving
// a percentage instead scales with content the same way the error does.
const SAFETY_MARGIN_RATIO = 0.05;

export function usePagination(measureRoot, cv, theme) {
  const [result, setResult] = useState({
    pages: null,
    overflowLeft: [],
    overflowRight: [],
    overflowsMaxPages: false,
    ready: false,
    pending: false,
  });
  const debounceRef = useRef(null);
  const hasComputedRef = useRef(false);
  const stabilityRafRef = useRef(null);
  // Tracks whether we've already attached a document.fonts.ready listener
  // for the currently-selected font, so re-runs of this effect (which
  // happen on every content edit) don't stack up duplicate listeners.
  // Reset whenever the font family changes, since that can kick off a new
  // font load that needs its own wait.
  const fontsHandledRef = useRef(false);
  const lastFontFamilyRef = useRef(theme.fontFamily);
  if (lastFontFamilyRef.current !== theme.fontFamily) {
    lastFontFamilyRef.current = theme.fontFamily;
    fontsHandledRef.current = false;
  }

  useLayoutEffect(() => {
    if (!measureRoot) return undefined;
    let cancelled = false;

    const waitForStableLayout = (onStable) => {
      let lastHeight = null;
      let stableFrames = 0;
      const sample = () => {
        if (cancelled || !measureRoot) return;
        const h = measureRoot.scrollHeight;
        if (h === lastHeight) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
          lastHeight = h;
        }
        if (stableFrames >= 2) {
          onStable();
          return;
        }
        stabilityRafRef.current = requestAnimationFrame(sample);
      };
      stabilityRafRef.current = requestAnimationFrame(sample);
    };

    const recompute = () => {
      cancelAnimationFrame(stabilityRafRef.current);
      waitForStableLayout(() => {
        if (cancelled || !measureRoot) return;
        const computed = computePages(measureRoot, cv, theme);
        hasComputedRef.current = true;
        setResult({ ...computed, ready: true, pending: false });
      });
    };

    clearTimeout(debounceRef.current);
    if (!hasComputedRef.current) {
      recompute();
    } else {
      setResult((prev) => ({ ...prev, pending: true }));
      debounceRef.current = setTimeout(recompute, DEBOUNCE_MS);
    }

    // Force a fresh recompute once web fonts finish loading — the
    // measurement above may have run against fallback-font metrics
    // (narrower/shorter than the real font), which would otherwise lock
    // in a layout decision based on an undercount.
    if (typeof document !== 'undefined' && document.fonts && !fontsHandledRef.current) {
      fontsHandledRef.current = true;
      document.fonts.ready
        .then(() => {
          if (cancelled) return;
          clearTimeout(debounceRef.current);
          recompute();
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
      cancelAnimationFrame(stabilityRafRef.current);
    };
  }, [measureRoot, cv, theme]);

  return result;
}

/**
 * Manual page-break overrides let a person forcibly pin how much content
 * lands on a given page, bypassing the automatic packer's fit-checking
 * entirely — a deliberate escape hatch for when the automatic measurement
 * disagrees with what the person can see. `theme.manualBreaks` is a plain
 * object keyed by 1-based page number: `{ 1: 512.4, 2: 700 }` means "page 1
 * ends after 512.4pt of content height, page 2 ends after 700pt". A page
 * with no key (or theme.manualBreaks itself absent/empty) falls back to
 * fully automatic packing. There's no upper bound applied to a manual
 * value — if the person drags the line past where content would
 * naturally fit, packColumn below fills up to exactly that height and
 * stops, with no minimum-content/never-leave-a-page-empty guarantees and
 * no safety margin, since the person has explicitly taken over that
 * decision and accepted that content may run past the page's printable
 * margin and get clipped.
 */
function getManualBreakPt(theme, pageNumber) {
  const v = theme?.manualBreaks?.[pageNumber];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function computePages(measureRoot, cv, theme) {
  const maxPages = Math.max(1, theme.maxPages || 1);
  const authoredWidthPt = parseFloat(getComputedStyle(measureRoot).getPropertyValue('--page-w')) || 595;
  const hostRect = measureRoot.getBoundingClientRect();
  const renderScale = hostRect.width / (authoredWidthPt / PT_PER_PX) || 1;
  const toPt = (px) => (px / renderScale) * PT_PER_PX;

  const headerEl = measureRoot.querySelector('[data-header]');
  // The wrapper div itself carries no margin — .cv-header's own
  // margin-bottom collapses through it (no border/padding to contain it),
  // so it never shows up in the wrapper's getBoundingClientRect().height.
  // Left out, page 1's available height comes out overstated by exactly
  // that margin, letting the packer fit content past the real page's edge.
  const headerMarginBottomPt = headerEl
    ? toPt(parseFloat(getComputedStyle(headerEl.firstElementChild || headerEl).marginBottom) || 0)
    : 0;
  const headerHeightPt = headerEl ? toPt(headerEl.getBoundingClientRect().height) + headerMarginBottomPt : 0;
  const sectionGapPt = theme.unit * theme.sectionGap;

  const twoColumn = theme.twoColumn;
  const leftModel = twoColumn ? buildColumnModel(measureRoot, cv.layout.leftColumn, cv, toPt) : [];
  const rightModel = twoColumn ? buildColumnModel(measureRoot, cv.layout.rightColumn, cv, toPt) : [];
  const singleModel = !twoColumn
    ? buildColumnModel(measureRoot, [...cv.layout.leftColumn, ...cv.layout.rightColumn], cv, toPt)
    : [];

  const pages = [];
  let leftCursor = { sectionIndex: 0, itemIndex: 0, subIndex: 0 };
  let rightCursor = { sectionIndex: 0, itemIndex: 0, subIndex: 0 };
  let singleCursor = { sectionIndex: 0, itemIndex: 0, subIndex: 0 };

  const isDone = (cursor, model) => cursor.sectionIndex >= model.length;

  let pageIndex = 0;
  while (pageIndex < maxPages) {
    const pageNumber = pageIndex + 1;
    const isFirstPage = pageIndex === 0;
    const marginTop = isFirstPage ? theme.pageMarginY : theme.pageMarginYBottom;
    const marginBottom = theme.pageMarginYBottom;

    const manualBreakPt = getManualBreakPt(theme, pageNumber);
    // Automatic available height still reserves the safety margin; a
    // manual override does not — the person is directly specifying where
    // content should stop, so we honor that exactly rather than second-
    // guessing it with our own buffer.
    const rawAvailableHeightPt = A4_HEIGHT_PT - marginTop - marginBottom - (isFirstPage ? headerHeightPt : 0);
    const automaticAvailableHeightPt = rawAvailableHeightPt * (1 - SAFETY_MARGIN_RATIO);
    const availableHeightPt = manualBreakPt != null ? manualBreakPt : automaticAvailableHeightPt;

    let leftFrag = [];
    let rightFrag = [];
    let singleFrag = [];
    let leftUsedPt = 0;
    let rightUsedPt = 0;
    let singleUsedPt = 0;

    if (twoColumn) {
      if (!isDone(leftCursor, leftModel)) {
        const r = packColumn(leftModel, leftCursor, availableHeightPt, sectionGapPt, manualBreakPt != null);
        leftFrag = r.fragments;
        leftCursor = r.nextCursor;
        leftUsedPt = r.usedPt;
      }
      if (!isDone(rightCursor, rightModel)) {
        const r = packColumn(rightModel, rightCursor, availableHeightPt, sectionGapPt, manualBreakPt != null);
        rightFrag = r.fragments;
        rightCursor = r.nextCursor;
        rightUsedPt = r.usedPt;
      }
    } else if (!isDone(singleCursor, singleModel)) {
      const r = packColumn(singleModel, singleCursor, availableHeightPt, sectionGapPt, manualBreakPt != null);
      singleFrag = r.fragments;
      singleCursor = r.nextCursor;
      singleUsedPt = r.usedPt;
    }

    // The packer's REAL stopping point for this page — whichever column
    // extends further, since that's the true visual bottom of this
    // page's content. This is what preview's page height keys off, rather
    // than a theoretical "A4 height minus margins" number the greedy
    // packer may have stopped well short of (it stops as soon as the next
    // item doesn't fit, so it very often does stop short of the
    // theoretical max).
    const actualContentHeightPt = twoColumn ? Math.max(leftUsedPt, rightUsedPt) : singleUsedPt;

    pages.push({
      marginTop,
      marginBottom,
      leftColumn: twoColumn ? leftFrag : singleFrag,
      rightColumn: twoColumn ? rightFrag : [],
      // Carried through so CVDocument can render the draggable break
      // handle at the right spot and know whether it's showing a manual
      // or automatic position.
      manualBreakPt,
      naturalHeightPt: actualContentHeightPt,
      // Each column packs independently against the SAME height budget,
      // but a denser column can run out of content to place well before
      // a lighter column does — `naturalHeightPt` above is deliberately
      // the max of the two (it's what actually determines the page's
      // height), but that means it does NOT represent where a lighter
      // column's own content really stops. Expose both so the UI can
      // show each column's true cutoff instead of implying a single
      // shared boundary applies to both.
      leftNaturalHeightPt: twoColumn ? leftUsedPt : singleUsedPt,
      rightNaturalHeightPt: twoColumn ? rightUsedPt : 0,
    });

    const leftDone = twoColumn ? isDone(leftCursor, leftModel) : isDone(singleCursor, singleModel);
    const rightDone = twoColumn ? isDone(rightCursor, rightModel) : true;

    pageIndex += 1;
    if (leftDone && rightDone) break;
  }

  const overflowLeft = twoColumn
    ? remainderFragments(leftModel, leftCursor)
    : remainderFragments(singleModel, singleCursor);
  const overflowRight = twoColumn ? remainderFragments(rightModel, rightCursor) : [];
  const overflowsMaxPages = overflowLeft.length > 0 || overflowRight.length > 0;

  return { pages, overflowLeft, overflowRight, overflowsMaxPages };
}

function getAdjustedItemHeight(element, toPt) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const marginTop = parseFloat(style.marginTop) || 0;
  return toPt(rect.height + marginTop);
}

function buildColumnModel(measureRoot, sectionIds, cv, toPt) {
  const models = [];
  for (const id of sectionIds) {
    const section = cv.sections[id];
    if (!section) continue;
    const secEl = measureRoot.querySelector(`[data-section-id="${cssEscape(id)}"]`);
    if (!secEl) continue;

    const headEl = secEl.querySelector('[data-section-head]');
    const headHeightPt = headEl ? getAdjustedItemHeight(headEl, toPt) : 0;

    let items;
    if (section.type === 'text') {
      const bodyEl = secEl.querySelector('.cv-text-body');
      items = [
        {
          itemId: 'body',
          heightPt: getAdjustedItemHeight(bodyEl, toPt),
          gapAfterPt: 0,
        },
      ];
    } else {
      const itemEls = Array.from(secEl.querySelectorAll('[data-item-id]'));
      items = itemEls.map((el) => {
        const subEls = Array.from(el.querySelectorAll('[data-sub-id]'));
        // Bullets are nested one level deeper inside a shared
        // <ul class="cv-entry-bullets">, which carries its own leading
        // top-margin that no individual <li data-sub-id="bullet-N"> ever
        // reflects. Left uncorrected, summing sub-item heights runs
        // slightly short of the entry's true rendered height. Fold any
        // such wrapper's own top margin into the first sub-item nested
        // inside it.
        const seenWrappers = new Set();
        const subItems = subEls.map((sel) => {
          let extraTopMarginPt = 0;
          const parent = sel.parentElement;
          if (parent && parent !== el && !seenWrappers.has(parent)) {
            seenWrappers.add(parent);
            const parentMarginTop = parseFloat(getComputedStyle(parent).marginTop) || 0;
            extraTopMarginPt = toPt(parentMarginTop);
          }
          return {
            id: sel.getAttribute('data-sub-id'),
            heightPt: getAdjustedItemHeight(sel, toPt) + extraTopMarginPt,
            gapAfterPt: toPt(parseFloat(getComputedStyle(sel).marginBottom) || 0),
          };
        });
        return {
          itemId: el.getAttribute('data-item-id'),
          heightPt: getAdjustedItemHeight(el, toPt),
          gapAfterPt: toPt(parseFloat(getComputedStyle(el).marginBottom) || 0),
          subItems: subItems.length > 0 ? subItems : null,
        };
      });
    }

    models.push({ id, type: section.type, headHeightPt, items });
  }
  return models;
}

/**
 * Packs as many whole/partial items as fit into `availableHeightPt`.
 *
 * `forceExact`, set when the caller supplied a manual break override,
 * switches off every "don't leave a page empty" / "don't cut this
 * mid-item unless we have to" accommodation that the automatic mode uses:
 * no `forced`-first-item bypass, no lump-vs-subitem double check, no
 * safety margin (already excluded by the caller). It just fills up to
 * exactly `availableHeightPt` and stops — including cutting an item off
 * matched, whole item pushed to the next page if that's what your dragged
 * line implies. This is what makes it possible to place the line at any
 * height, including ones the automatic packer would refuse to produce,
 * with the explicit trade-off that content can end up clipped past the
 * page's own printable margin if the line is set too low or too high.
 */
function packColumn(sections, cursor, availableHeightPt, sectionGapPt, forceExact = false) {
  const fragments = [];
  let used = 0;
  let sectionIndex = cursor.sectionIndex;
  let itemIndex = cursor.itemIndex;
  let subIndex = cursor.subIndex || 0;

  while (sectionIndex < sections.length) {
    const section = sections[sectionIndex];
    const showHead = itemIndex === 0 && subIndex === 0;
    const precedingGap = fragments.length > 0 ? sectionGapPt : 0;
    const headCost = showHead ? section.headHeightPt : 0;
    const isFirstOnPage = fragments.length === 0;

    if (section.items.length === 0) {
      const cost = precedingGap + headCost;
      if (used + cost > availableHeightPt && !isFirstOnPage) break;
      used += cost;
      fragments.push({ sectionId: section.id, type: section.type, itemStart: 0, itemEnd: 0, showHead: true, splits: {} });
      sectionIndex += 1;
      itemIndex = 0;
      subIndex = 0;
      continue;
    }

    const firstItem = section.items[itemIndex];
    let firstItemCost = firstItem.heightPt;
    if (firstItem.subItems && firstItem.subItems.length > 0) {
        const startSub = itemIndex === cursor.itemIndex ? subIndex : 0;
        if (startSub < firstItem.subItems.length) {
            firstItemCost = firstItem.subItems[startSub].heightPt;
        }
    }
    const minCost = precedingGap + headCost + firstItemCost;

    // In forceExact mode, a section only gets deferred to the next page
    // if even its heading alone can't fit — we don't reserve room for a
    // "first item" up front, since forceExact's inner loop below will
    // happily place a partial item (down to a single sub-part) rather
    // than requiring the whole first item's minimum cost to fit.
    if (forceExact) {
      if (used + precedingGap + headCost > availableHeightPt && !isFirstOnPage) break;
    } else if (used + minCost > availableHeightPt && !isFirstOnPage) {
      break;
    }

    let sectionUsed = used + precedingGap + headCost;
    let placed = 0;
    let nextSubIndex = 0;
    let splits = {};

    for (let i = itemIndex; i < section.items.length; i++) {
      const it = section.items[i];
      const isContinuation = (i === itemIndex && subIndex > 0);
      
      let itemCost = it.heightPt;
      if (isContinuation && it.subItems) {
          itemCost = 0;
          for(let j=subIndex; j<it.subItems.length; j++) {
              itemCost += it.subItems[j].heightPt;
              if (j < it.subItems.length - 1) itemCost += it.subItems[j].gapAfterPt;
          }
      }

      const gapBefore = placed > 0 ? section.items[i - 1].gapAfterPt : 0;
      const addition = gapBefore + itemCost;
      const forced = !forceExact && isFirstOnPage && placed === 0;

      if (sectionUsed + addition > availableHeightPt && !forced) {
        if (it.subItems && it.subItems.length > 0) {
          let subPlaced = 0;
          let subUsed = sectionUsed + gapBefore;
          let startSub = isContinuation ? subIndex : 0;
          
          for (let j = startSub; j < it.subItems.length; j++) {
            const sub = it.subItems[j];
            const subGapBefore = subPlaced > 0 ? it.subItems[j - 1].gapAfterPt : 0;
            const subAdd = subGapBefore + sub.heightPt;
            if (subUsed + subAdd > availableHeightPt && !(forced && subPlaced === 0)) break;
            subUsed += subAdd;
            subPlaced += 1;
          }

          // If every sub-part fits (a more granular check than the
          // lump `it.heightPt` used above), place the item whole rather
          // than treating it as a rejected/partial fit.
          if (subPlaced === it.subItems.length) {
            sectionUsed = subUsed;
            placed += 1;
            if (isContinuation) {
              splits[i] = it.subItems.slice(subIndex).map((s) => s.id);
            }
            continue;
          }

          if (subPlaced > 0 && startSub + subPlaced < it.subItems.length) {
            splits[i] = it.subItems.slice(startSub, startSub + subPlaced).map(s => s.id);
            sectionUsed = subUsed;
            placed += 1;
            nextSubIndex = startSub + subPlaced;
            break;
          }
        }
        break; 
      }

      sectionUsed += addition;
      placed += 1;
      if (isContinuation && it.subItems) {
         splits[i] = it.subItems.slice(subIndex).map(s => s.id);
      }
    }

    // Nothing from this section actually fit — it's ENTIRELY deferred to
    // the next page, heading included. `used` was never touched for this
    // section attempt (see `sectionUsed` above), so it correctly stays
    // exactly as it was before this section was tried — no rollback
    // needed, and no heading cost leaks in for a section that never
    // actually renders on this page.
    if (placed === 0) break;

    used = sectionUsed;

    fragments.push({
      sectionId: section.id,
      type: section.type,
      itemStart: itemIndex,
      itemEnd: itemIndex + placed,
      showHead,
      splits
    });
    
    itemIndex += placed;

    if (nextSubIndex > 0) {
        itemIndex -= 1;
        subIndex = nextSubIndex;
        break;
    } else {
        subIndex = 0;
        if (itemIndex >= section.items.length) {
          sectionIndex += 1;
          itemIndex = 0;
        } else {
          break;
        }
    }
  }

  return { fragments, nextCursor: { sectionIndex, itemIndex, subIndex }, usedPt: used };
}

function remainderFragments(model, cursor) {
  const fragments = [];
  for (let s = cursor.sectionIndex; s < model.length; s++) {
    const section = model[s];
    const start = s === cursor.sectionIndex ? cursor.itemIndex : 0;
    const startSub = s === cursor.sectionIndex ? (cursor.subIndex || 0) : 0;

    if (section.items.length === 0) {
      if (start === 0 && startSub === 0) {
        fragments.push({ sectionId: section.id, type: section.type, itemStart: 0, itemEnd: 0, showHead: true, splits: {} });
      }
      continue;
    }

    if (start >= section.items.length) continue;
    
    const splits = {};
    if (startSub > 0 && section.items[start] && section.items[start].subItems) {
         splits[start] = section.items[start].subItems.slice(startSub).map(s => s.id);
    }

    fragments.push({
      sectionId: section.id,
      type: section.type,
      itemStart: start,
      itemEnd: section.items.length,
      showHead: start === 0 && startSub === 0,
      splits
    });
  }
  return fragments;
}

function cssEscape(value) {
  if (typeof window !== 'undefined' && window.CSS && CSS.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}