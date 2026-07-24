import EditableText from '../EditableText';
import MoveRemoveButtons from './MoveRemoveButtons';
import { useSectionItems } from './useSectionItems';

/**
 * "Label - description" list, matching "Main Technical Skills" formatting.
 *
 * `items` may be a SLICE of the section's full item list when pagination
 * has split this section across a page boundary — see EntryListSection's
 * doc comment for what `itemOffset`/`totalItems` are for.
 *
 * Layout switches to the control-block form (move/remove buttons visible)
 * only once `showEmptyState` is true, i.e. this section has been clicked
 * into. Before that, while `editing` is still true, text renders in the
 * same compact "label - text" form as preview but stays directly
 * clickable — so the first click both activates the section and focuses
 * the field, instead of needing an initial "reveal controls" click.
 */
export default function SkillListSection({ sectionId, items, editing, showEmptyState = false, itemOffset = 0, totalItems }) {
  const { updateEntry, removeEntry, moveEntryStep, isFirst, isLast } = useSectionItems(sectionId, itemOffset, totalItems, items);

  return (
    <ul className="cv-entry-bullets" style={{ margin: 0 }}>
      {items.map((item, idx) => {
        return (
        <li
          className="cv-skill-item"
          data-item-id={item.id}
          key={item.id}
          style={{ listStyle: showEmptyState ? 'none' : undefined, marginLeft: showEmptyState ? '-12pt' : undefined }}
        >
          {showEmptyState ? (
            <div className="entry-block" style={{ padding: '6px 8px' }}>
              <div className="field-row" style={{ marginBottom: '4px' }}>
                <EditableText
                  as="span"
                  className="cv-skill-label"
                  value={item.label}
                  onCommit={(v) => updateEntry(item.id, { label: v })}
                  editable
                  multiline={false}
                  placeholder="Label"
                  style={{ display: 'inline-block' }}
                />
                <div className="no-print cv-item-controls" style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                  <MoveRemoveButtons
                    onMoveUp={() => moveEntryStep(item.id, -1)}
                    onMoveDown={() => moveEntryStep(item.id, 1)}
                    onRemove={() => removeEntry(item.id)}
                    disableUp={isFirst(idx)}
                    disableDown={isLast(idx)}
                  />
                </div>
              </div>
              <EditableText
                as="span"
                value={item.text}
                onCommit={(v) => updateEntry(item.id, { text: v })}
                editable
                placeholder="Description"
              />
            </div>
          ) : editing ? (
            <>
              <EditableText
                as="span"
                className="cv-skill-label"
                value={item.label}
                onCommit={(v) => updateEntry(item.id, { label: v })}
                editable
                multiline={false}
              />
              {item.text && ' - '}
              <EditableText as="span" value={item.text} onCommit={(v) => updateEntry(item.id, { text: v })} editable multiline={false} />
            </>
          ) : (
            <>
              <span className="cv-skill-label">{item.label}</span>
              {item.text && ' - '}
              {item.text}
            </>
          )}
        </li>
        );
      })}
    </ul>
  );
}
