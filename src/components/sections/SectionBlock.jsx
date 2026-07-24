import EditableText from '../EditableText';
import { useCVStore } from '../../store/cvStore';
import { PlusIcon } from '../Icons';
import TextSection from './TextSection';
import EntryListSection from './EntryListSection';
import SkillListSection from './SkillListSection';
import LabelListSection from './LabelListSection';

const RENDERERS = {
  text: TextSection,
  'entry-list': EntryListSection,
  'skill-list': SkillListSection,
  'label-list': LabelListSection,
};

/**
 * Every section on the page shares the same shell: a heading, then (per the
 * format spec) a horizontal rule directly underneath it, then type-specific
 * content. This is what keeps section headings visually identical across
 * the whole document regardless of what's inside.
 *
 * A section can be rendered as a PARTIAL fragment when pagination has split
 * it across a page boundary (see utils/paginate.js): `itemStart`/`itemEnd`
 * slice which entries/items this fragment shows, and `showHead` controls
 * whether the heading + rule render here (only the first fragment of a
 * split section shows them — later fragments continue directly with
 * items). The heading + rule are wrapped in a `data-section-head` element
 * so pagination can measure that block's height on its own, independent of
 * however many items follow it.
 *
 * `isActive`: while `editing` is true, a section only shows its empty/
 * placeholder fields (blank contact rows, "add bullet" buttons, move/
 * remove controls, etc.) when it is BOTH `editing` and `isActive` — i.e.
 * the person has clicked into this specific section. Any other section
 * renders exactly as it would in preview: no placeholder clutter, no
 * blank rows reserving space. Text is still directly clickable-to-edit
 * everywhere (EditableText's `editable` prop stays tied to `editing`
 * alone, not `isActive`), so a single click both activates the section
 * AND focuses the field — the person doesn't need two clicks. `onActivate`
 * is called on click/focus-within so the parent can track which section
 * is active; it's a no-op when not editing (nothing to activate in
 * preview). NOTE: `isActive` is never true in the always-non-editing
 * measurement host (see CVDocument.jsx), since that host always passes
 * `editing={false}` and never renders this component with isActive at
 * all — so pagination continues measuring the same "nothing active"
 * geometry that preview/export use, regardless of what's active on
 * screen.
 */
export default function SectionBlock({
  section,
  editing,
  showRule,
  itemStart = 0,
  itemEnd = null,
  showHead = true,
  splits = {},
  isActive = false,
  onActivate,
}) {
  const updateSectionTitle = useCVStore((s) => s.updateSectionTitle);
  const Renderer = RENDERERS[section.type];

  const fullItems = section.type === 'text' ? null : section.items;
  const totalItems = fullItems ? fullItems.length : 0;
  const resolvedEnd = itemEnd == null ? totalItems : itemEnd;
  const slicedItems = fullItems ? fullItems.slice(itemStart, resolvedEnd) : null;
  const isLastFragment = fullItems ? resolvedEnd >= totalItems : true;

  // `showEmptyState` is the actual gate list renderers use to decide
  // whether to show blank/placeholder rows, add-buttons, and move/remove
  // controls. `editing` alone still makes text directly clickable.
  const showEmptyState = editing && isActive;

  const props = {
    sectionId: section.id,
    editing,
    showEmptyState,
    itemOffset: itemStart,
    totalItems,
    splits, // Pass splits down to the list renderer
    ...(section.type === 'text' ? { body: section.body } : { items: slicedItems }),
  };

  const handleActivate = () => {
    if (editing && typeof onActivate === 'function') onActivate(section.id);
  };

  return (
    <section
      className={`cv-section ${editing ? 'cv-section-editable' : ''} ${showEmptyState ? 'active' : ''}`}
      data-section-id={section.id}
      onMouseDown={handleActivate}
    >
      {showHead && (
        <div data-section-head>
          <EditableText
            as="h2"
            className="cv-section-heading"
            value={section.title}
            onCommit={(v) => updateSectionTitle(section.id, v)}
            editable={editing}
            multiline={false}
            placeholder="Section title"
          />
          <hr className={`cv-section-rule ${showRule ? '' : 'hidden'}`} />
        </div>
      )}
      {Renderer ? <Renderer {...props} /> : null}
      {section.type === 'entry-list' && showEmptyState && isLastFragment && (
        <AddEntryButton sectionId={section.id} />
      )}
      {(section.type === 'skill-list' || section.type === 'label-list') && showEmptyState && isLastFragment && (
        <AddEntryButton sectionId={section.id} label="Add item" />
      )}
    </section>
  );
}

function AddEntryButton({ sectionId, label = 'Add entry' }) {
  const addEntry = useCVStore((s) => s.addEntry);
  return (
    <button
      className="icon-btn no-print"
      style={{ marginTop: '6pt', fontSize: '9pt', display: 'flex', alignItems: 'center', gap: '3pt' }}
      onClick={() => addEntry(sectionId)}
    >
      <PlusIcon /> {label}
    </button>
  );
}