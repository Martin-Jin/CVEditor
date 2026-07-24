import { useEffect, useState } from 'react';
import { useCVStore } from '../store/cvStore';
import { FONT_OPTIONS, ACCENT_PRESETS } from '../data/defaultTheme';

/**
 * Right-hand "Style" panel. Every control here writes to the theme store,
 * which is the single source of truth consumed by themeToCSSVars — so
 * changing a slider here re-flows the *entire* document consistently
 * rather than nudging one element out of alignment with the rest.
 */
export default function StylePanel() {
  const theme = useCVStore((s) => s.theme);
  const cv = useCVStore((s) => s.cv);
  const updateTheme = useCVStore((s) => s.updateTheme);
  const saveThemeAsDefault = useCVStore((s) => s.saveThemeAsDefault);
  const setManualBreak = useCVStore((s) => s.setManualBreak);
  const clearManualBreak = useCVStore((s) => s.clearManualBreak);
  const [savedFlash, setSavedFlash] = useState(false);

  const set = (patch) => updateTheme(patch);

  const handleSaveAsDefault = () => {
    saveThemeAsDefault();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  return (
    <aside className="side-panel right">
      <div className="panel-header">
        <h2>Style</h2>
        <p>Changes apply to the whole document to keep spacing consistent.</p>
      </div>
      <div className="panel-content panel-scroll">

        <PanelSection title="Typography">
          <div className="field">
            <label htmlFor="font-select">Font family</label>
            <select id="font-select" value={theme.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <Slider label="Name size" value={theme.nameSize} min={14} max={36} step={0.5} unit="pt" onChange={(v) => set({ nameSize: v })} />
          <Slider label="Title / tagline size" value={theme.titleSize} min={6} max={14} step={0.25} unit="pt" onChange={(v) => set({ titleSize: v })} />
          <Slider label="Section heading size" value={theme.sectionHeadingSize} min={8} max={18} step={0.25} unit="pt" onChange={(v) => set({ sectionHeadingSize: v })} />
          <Slider label="Entry title size" value={theme.entryTitleSize} min={6} max={14} step={0.25} unit="pt" onChange={(v) => set({ entryTitleSize: v })} />
          <Slider label="Body text size" value={theme.bodySize} min={6} max={12} step={0.1} unit="pt" onChange={(v) => set({ bodySize: v })} />
          <Slider label="Role / subtitle size" value={theme.roleSize} min={6} max={12} step={0.1} unit="pt" onChange={(v) => set({ roleSize: v })} />
          <Slider label="Meta text size" value={theme.metaSize} min={5.5} max={11} step={0.1} unit="pt" onChange={(v) => set({ metaSize: v })} />
          <Slider label="Line height" value={theme.lineHeight} min={1.0} max={1.8} step={0.02} unit="×" onChange={(v) => set({ lineHeight: v })} />
        </PanelSection>

        <PanelSection title="Section headings">
          <div className="field">
            <label>Alignment</label>
            <Segmented
              options={[{ id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }]}
              value={theme.sectionHeadingAlign}
              onChange={(v) => set({ sectionHeadingAlign: v })}
            />
          </div>
          <div className="field">
            <label>Case</label>
            <Segmented
              options={[{ id: 'upper', label: 'UPPERCASE' }, { id: 'title', label: 'Title Case' }]}
              value={theme.sectionHeadingCase}
              onChange={(v) => set({ sectionHeadingCase: v })}
            />
          </div>
          <div className="field">
            <label>Weight</label>
            <Segmented
              options={[{ id: 600, label: 'Medium' }, { id: 700, label: 'Bold' }, { id: 800, label: 'Extra bold' }]}
              value={theme.sectionHeadingWeight}
              onChange={(v) => set({ sectionHeadingWeight: v })}
            />
          </div>
        </PanelSection>

        <PanelSection title="Spacing">
          <Slider label="Base spacing unit" value={theme.unit} min={3} max={12} step={0.5} unit="pt" onChange={(v) => set({ unit: v })} />
          <Slider label="Space between sections" value={theme.sectionGap} min={0.5} max={4} step={0.1} unit="×" onChange={(v) => set({ sectionGap: v })} />
          <Slider label="Space between entries" value={theme.entryGap} min={0.3} max={3} step={0.1} unit="×" onChange={(v) => set({ entryGap: v })} />
          <Slider label="Page margin (horizontal)" value={theme.pageMarginX} min={10} max={50} step={1} unit="pt" onChange={(v) => set({ pageMarginX: v })} />
          <Slider label="Page margin (top)" value={theme.pageMarginY} min={12} max={50} step={1} unit="pt" onChange={(v) => set({ pageMarginY: v })} />
          <Slider label="Page margin (bottom)" value={theme.pageMarginYBottom} min={8} max={46} step={1} unit="pt" onChange={(v) => set({ pageMarginYBottom: v })} />
          <p className="helptext">
            The bottom margin defaults slightly smaller than the top margin, matching common print conventions.
          </p>
        </PanelSection>

        <PanelSection title="Pages">
          <div className="field">
            <label>Page count</label>
            <Segmented
              options={[{ id: 1, label: '1 page' }, { id: 2, label: 'Up to 2 pages' }]}
              value={theme.maxPages}
              onChange={(v) => set({ maxPages: v })}
            />
          </div>
          <p className="helptext">
            With 2 pages allowed, whole sections that don't fit on page 1 automatically move to page 2 —
            no manual fitting needed. Page 2's top margin matches page 1's bottom margin, since there's no
            repeated header to make room for.
          </p>
        </PanelSection>

        <PanelSection title="Manual page breaks">
          <p className="helptext">
            Automatic page breaks should fit most documents, but if a page is cutting off in the wrong place,
            enter the exact content height (in pt) where that page should end instead. Switch to Preview
            after entering a value to see exactly where it lands, and adjust the number from there —
            there's no in-editor indicator of where a given number falls, only Preview shows the real result.
          </p>
          {Array.from({ length: theme.maxPages || 1 }, (_, i) => i + 1).map((pageNumber) => (
            <ManualBreakField
              key={pageNumber}
              pageNumber={pageNumber}
              value={theme.manualBreaks?.[pageNumber] ?? null}
              onSet={(v) => setManualBreak(pageNumber, v)}
              onClear={() => clearManualBreak(pageNumber)}
            />
          ))}
        </PanelSection>

        <PanelSection title="Layout">
          <div className="toggle-row">
            <label htmlFor="two-col-toggle">Two-column layout</label>
            <Switch id="two-col-toggle" checked={theme.twoColumn} onChange={(v) => set({ twoColumn: v })} />
          </div>
          {theme.twoColumn && (
            <>
              <Slider
                label="Left column width"
                value={theme.leftColumnWidth}
                min={35}
                max={75}
                step={1}
                unit="%"
                onChange={(v) => set({ leftColumnWidth: v })}
              />
              <Slider label="Column gap" value={theme.columnGap} min={4} max={40} step={1} unit="pt" onChange={(v) => set({ columnGap: v })} />
              <ColumnBalanceHint cv={cv} theme={theme} onFix={(v) => set({ leftColumnWidth: v })} />
            </>
          )}
          <div className="field">
            <label>Header alignment</label>
            <Segmented
              options={[{ id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }]}
              value={theme.headerAlign}
              onChange={(v) => set({ headerAlign: v })}
            />
          </div>
        </PanelSection>

        <PanelSection title="Rules & separators">
          <div className="toggle-row">
            <label htmlFor="rule-toggle">Show separator lines</label>
            <Switch id="rule-toggle" checked={theme.showSectionRule} onChange={(v) => set({ showSectionRule: v })} />
          </div>
          <p className="helptext">
            Separators appear under every section heading and as the divider between columns — matching
            the source format. They don't appear under the header block or between individual entries.
          </p>
          {theme.showSectionRule && (
            <Slider label="Rule thickness" value={theme.ruleThickness} min={0.5} max={3} step={0.25} unit="pt" onChange={(v) => set({ ruleThickness: v })} />
          )}
        </PanelSection>

        <PanelSection title="Bullets">
          <div className="field">
            <label>Bullet style</label>
            <Segmented
              options={[{ id: 'disc', label: '• Dot' }, { id: 'dash', label: '– Dash' }]}
              value={theme.bulletStyle}
              onChange={(v) => set({ bulletStyle: v })}
            />
          </div>
        </PanelSection>

        <PanelSection title="Color">
          <div className="field">
            <label>Accent presets</label>
            <div className="swatch-row">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`swatch ${theme.accentColor === p.color ? 'active' : ''}`}
                  style={{ background: p.color }}
                  title={p.label}
                  onClick={() => set({ accentColor: p.color, ruleColor: p.color })}
                />
              ))}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ink-color">Ink / headings</label>
              <input id="ink-color" type="color" value={theme.accentColor} onChange={(e) => set({ accentColor: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="muted-color">Muted text</label>
              <input id="muted-color" type="color" value={theme.mutedColor} onChange={(e) => set({ mutedColor: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="rule-color">Rule color</label>
              <input id="rule-color" type="color" value={theme.ruleColor} onChange={(e) => set({ ruleColor: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="role-color">Role / subtitle color</label>
              <input id="role-color" type="color" value={theme.roleColor} onChange={(e) => set({ roleColor: e.target.value })} />
            </div>
          </div>
          <p className="helptext">
            Role/subtitle lines (e.g. a degree name, or "(online tutoring)") use this color instead of bold, so
            they stand out from body text without competing with the entry title's weight.
          </p>
        </PanelSection>

        <PanelSection title="Defaults">
          <button className="btn btn-ghost btn-sm btn-block" onClick={handleSaveAsDefault}>
            <SaveDefaultIcon /> {savedFlash ? 'Saved as default!' : 'Save current style as default'}
          </button>
          <p className="helptext">
            Makes the current font, size, spacing, and color settings the starting point for new documents
            (via Reset, or the next time you open the editor with no saved document).
          </p>
        </PanelSection>
      </div>
    </aside>
  );
}

function PanelSection({ title, children }) {
  return (
    <div className="panel-section">
      <div className="panel-section-title">{title}</div>
      {children}
    </div>
  );
}

/**
 * One page's manual-break number field. Kept as local text state and only
 * committed (via onSet) on blur or Enter — writing to the store on every
 * keystroke would push a new undo-history entry per character, per the
 * same pattern EditableText uses elsewhere. Empty input means "automatic"
 * (calls onClear instead of onSet).
 */
function formatBreakValue(value) {
  return value != null ? String(Math.round(value)) : '';
}

function ManualBreakField({ pageNumber, value, onSet, onClear }) {
  const [text, setText] = useState(formatBreakValue(value));

  // Keep the field in sync if the underlying value changes from outside
  // (e.g. Reset elsewhere, or loading/importing a different document).
  useEffect(() => {
    setText(formatBreakValue(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      onClear();
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Invalid entry — revert to whatever the store currently holds
      // rather than committing garbage.
      setText(formatBreakValue(value));
      return;
    }
    onSet(parsed);
  };

  return (
    <div className="field-row" style={{ alignItems: 'center', marginBottom: '8px' }}>
      <div className="field" style={{ flex: 1, marginBottom: 0 }}>
        <label>{`Page ${pageNumber} break height`}</label>
        <div className="slider-field">
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Automatic"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setText(formatBreakValue(value));
                e.currentTarget.blur();
              }
            }}
            style={{ width: '100%' }}
          />
          <span className="slider-value">pt</span>
        </div>
      </div>
      {value != null && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '20px' }}
          onClick={() => {
            onClear();
            setText('');
          }}
          title="Reset to automatic page break"
        >
          Reset
        </button>
      )}
    </div>
  );
}

/**
 * A rough, client-side content-weight estimate for each column, shown next
 * to the "Left column width" slider.
 *
 * Why this exists: pagination measures and packs content correctly for
 * whatever column widths the theme specifies — it never mis-measures or
 * silently drops content that fits. But if one column is given a narrow
 * width while carrying most of the CV's content (e.g. 5 dense sections
 * squeezed into a 38%-wide sidebar while a 62%-wide column only holds 2
 * short ones), that narrow column's text wraps onto far more lines than
 * it would at a wider measure, so IT runs out of vertical room and spills
 * onto extra pages while the wide column's page space goes unused below
 * its own, much shorter, content. That can look like "there's clearly
 * room here, why did this get cut off / pushed to another page" even
 * though pagination is doing exactly what the column widths ask of it.
 *
 * This estimates each column's share of total content (by counting
 * entries/items and rough character counts across each column's
 * sections) and compares that against the width split, surfacing a
 * one-click suggestion to rebalance when the two are meaningfully out of
 * step. It's intentionally approximate — a hint toward a likely fix, not
 * a replacement for previewing the result.
 */
function ColumnBalanceHint({ cv, theme, onFix }) {
  if (!cv?.layout) return null;

  const weightOfSection = (section) => {
    if (!section) return 0;
    if (section.type === 'text') return 1 + (section.body?.length ?? 0) / 220;
    const items = section.items ?? [];
    let w = 1; // heading overhead
    for (const item of items) {
      w += 1; // per-item overhead (title/meta row)
      w += (item.description?.length ?? 0) / 220;
      w += (item.text?.length ?? 0) / 220;
      w += (item.bullets?.length ?? 0) * 0.6;
    }
    return w;
  };

  const columnWeight = (ids) => ids.reduce((sum, id) => sum + weightOfSection(cv.sections[id]), 0);

  const leftWeight = columnWeight(cv.layout.leftColumn ?? []);
  const rightWeight = columnWeight(cv.layout.rightColumn ?? []);
  const totalWeight = leftWeight + rightWeight;
  if (totalWeight === 0) return null;

  const suggestedLeftPct = Math.round((leftWeight / totalWeight) * 100);
  const currentLeftPct = theme.leftColumnWidth;
  const diff = Math.abs(suggestedLeftPct - currentLeftPct);

  // Only speak up when the mismatch is large enough to plausibly explain
  // uneven page-filling — small differences are normal and not worth a
  // suggestion every time content is edited.
  if (diff < 12) return null;

  const clampedSuggestion = Math.min(75, Math.max(35, suggestedLeftPct));
  const narrowSide = currentLeftPct < suggestedLeftPct ? 'left' : 'right';

  return (
    <div className="column-balance-hint">
      <BalanceIcon />
      <div>
        <p>
          The <strong>{narrowSide}</strong> column is carrying noticeably more content than its current width
          — that's often why one side runs out of page space while the other still has room. Based on what's
          in each column right now, about <strong>{clampedSuggestion}% / {100 - clampedSuggestion}%</strong>{' '}
          would balance them better.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => onFix(clampedSuggestion)}>
          Set left column to {clampedSuggestion}%
        </button>
      </div>
    </div>
  );
}

function BalanceIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
      <path d="M12 3v18M5 8l-3 6a4 4 0 0 0 8 0l-3-6h-2ZM19 8l-3 6a4 4 0 0 0 8 0l-3-6h-2Z" />
    </svg>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="slider-field">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="slider-value">
          {Number.isInteger(step) ? value : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}
          {unit}
        </span>
      </div>
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button key={opt.id} className={value === opt.id ? 'active' : ''} onClick={() => onChange(opt.id)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ id, checked, onChange }) {
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" />
      <span className="switch-thumb" />
    </label>
  );
}

function SaveDefaultIcon() {
  return (
    <svg className="icon icon-sm" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}