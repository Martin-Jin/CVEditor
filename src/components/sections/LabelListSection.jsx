import EditableText from '../EditableText';
import { useCVStore } from '../../store/cvStore';
import MoveRemoveButtons from './MoveRemoveButtons';

/**
 * Bold heading + paragraph underneath, matching "Main Soft Skills" formatting.
 *
 * `items` may be a SLICE of the section's full item list when pagination
 * has split this section across a page boundary — see EntryListSection's
 * doc comment for what `itemOffset`/`totalItems` are for.
 *
 * See SkillListSection's doc comment for what `showEmptyState` gates here:
 * the control-block layout (move/remove buttons) only appears once this
 * section has been clicked into; before that, text stays directly
 * clickable in the same compact layout preview uses.
 */
export default function LabelListSection({ sectionId, items, editing, showEmptyState = false, itemOffset = 0, totalItems }) {
  const updateEntry = useCVStore((s) => s.updateEntry);
  const removeEntry = useCVStore((s) => s.removeEntry);
  const moveEntryStep = useCVStore((s) => s.moveEntryStep);

  const total = totalItems ?? items.length;

  return (
    <div>
      {items.map((item, idx) => {
        const globalIdx = idx + itemOffset;
        return (
        <div className={`cv-label-item ${item.italic ? 'cv-item-italic' : ''}`} data-item-id={item.id} key={item.id}>
          {showEmptyState ? (
            <div className="entry-block" style={{ padding: '6px 8px' }}>
              <div className="field-row" style={{ marginBottom: '4px', alignItems: 'center' }}>
                <EditableText
                  as="span"
                  className="cv-skill-label"
                  value={item.label}
                  onCommit={(v) => updateEntry(sectionId, item.id, { label: v })}
                  editable
                  multiline={false}
                  placeholder="Heading"
                  style={{ display: 'inline-block' }}
                />
                <div className="no-print cv-item-controls" style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                  <MoveRemoveButtons
                    onMoveUp={() => moveEntryStep(sectionId, item.id, -1)}
                    onMoveDown={() => moveEntryStep(sectionId, item.id, 1)}
                    onRemove={() => removeEntry(sectionId, item.id)}
                    disableUp={globalIdx === 0}
                    disableDown={globalIdx === total - 1}
                  />
                </div>
              </div>
              <EditableText
                as="span"
                value={item.text}
                onCommit={(v) => updateEntry(sectionId, item.id, { text: v })}
                editable
                placeholder="Detail text"
              />
            </div>
          ) : editing ? (
            <>
              <EditableText
                as="span"
                className="cv-skill-label"
                value={item.label}
                onCommit={(v) => updateEntry(sectionId, item.id, { label: v })}
                editable
                multiline={false}
              />
              <EditableText
                as="div"
                value={item.text}
                onCommit={(v) => updateEntry(sectionId, item.id, { text: v })}
                editable
              />
            </>
          ) : (
            <>
              <span className="cv-skill-label">{item.label}</span>
              <div>{item.text}</div>
            </>
          )}
        </div>
        );
      })}
    </div>
  );
}
