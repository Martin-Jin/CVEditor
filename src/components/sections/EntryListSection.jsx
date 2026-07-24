import EditableText from '../EditableText';
import { useCVStore } from '../../store/cvStore';
import { PlusIcon, CloseIcon } from '../Icons';
import MoveRemoveButtons from './MoveRemoveButtons';
import { useSectionItems } from './useSectionItems';

/**
 * `editing` keeps existing, filled-in text directly clickable-to-edit
 * everywhere (so a single click both activates the section AND focuses
 * the field). `showEmptyState` (true only once the section has been
 * clicked into — see SectionBlock's `isActive`) additionally reveals
 * empty/placeholder fields, add-bullet/add-entry affordances, and
 * move/remove controls. Until then, an entry with e.g. no `role` or no
 * `footer` renders exactly as it would in preview — no blank reserved
 * rows — matching the request that edit mode look identical to preview
 * except for the section currently being worked on.
 */
export default function EntryListSection({ sectionId, items, editing, showEmptyState = false, itemOffset = 0, totalItems, splits = {} }) {
  const updateBullet = useCVStore((s) => s.updateBullet);
  const addBullet = useCVStore((s) => s.addBullet);
  const removeBullet = useCVStore((s) => s.removeBullet);
  const { updateEntry, removeEntry, moveEntryStep, isFirst, isLast } = useSectionItems(sectionId, itemOffset, totalItems, items);

  return (
    <div>
      {items.map((entry, idx) => {
        const globalIdx = idx + itemOffset;
        const validSubIds = splits[globalIdx];

        // If a split exists for this item, only render sub-components whose IDs are in the array
        const isSubValid = (id) => !validSubIds || validSubIds.includes(id);

        return (
        <div className="cv-entry" data-item-id={entry.id} key={entry.id}>
          {isSubValid('head') && (
            <div className="cv-entry-head" data-sub-id="head">
              <div className="cv-entry-heading">
                <div className="cv-entry-org">
                  <EditableText
                    as="span"
                    value={entry.org}
                    onCommit={(v) => updateEntry(entry.id, { org: v })}
                    editable={editing}
                    multiline={false}
                    placeholder="Organisation / entry title"
                  />
                </div>
                {(entry.role || showEmptyState) && (
                  <EditableText
                    as="div"
                    className="cv-entry-role"
                    value={entry.role}
                    onCommit={(v) => updateEntry(entry.id, { role: v })}
                    editable={editing}
                    multiline={false}
                    placeholder="Role / subtitle"
                  />
                )}
              </div>

              {(entry.dateRange || entry.location || showEmptyState) && (
                <div className="cv-entry-meta-block">
                  {(entry.dateRange || showEmptyState) && (
                    <EditableText
                      as="div"
                      className="cv-entry-date"
                      value={entry.dateRange}
                      onCommit={(v) => updateEntry(entry.id, { dateRange: v })}
                      editable={editing}
                      multiline={false}
                      placeholder="Date range"
                    />
                  )}
                  {(entry.location || showEmptyState) && (
                    <EditableText
                      as="div"
                      className="cv-entry-location"
                      value={entry.location}
                      onCommit={(v) => updateEntry(entry.id, { location: v })}
                      editable={editing}
                      multiline={false}
                      placeholder="Location"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {isSubValid('desc') && (entry.description || showEmptyState) && (
            <EditableText
              as="p"
              className="cv-entry-description"
              value={entry.description}
              onCommit={(v) => updateEntry(entry.id, { description: v })}
              editable={editing}
              placeholder="Short description"
              data-sub-id="desc"
            />
          )}

          {(entry.bullets.length > 0 || showEmptyState) && (
            <ul className="cv-entry-bullets">
              {entry.bullets.map((bullet, bIdx) => {
                const subId = `bullet-${bIdx}`;
                if (!isSubValid(subId)) return null;

                // Split once, unconditionally — used both for the plain
                // preview render AND the inactive-editing render, so the
                // two stay structurally identical (see below).
                const [label, ...restParts] = splitBulletLabel(bullet);
                const rest = restParts.join(':');

                return (
                  <li key={bIdx} data-sub-id={subId}>
                    {showEmptyState ? (
                      // Only the ACTIVE section gets the control-block
                      // layout (remove button, flex row). This is the
                      // ONE place bullets are allowed to differ in shape
                      // from preview, since it's also the one place the
                      // hidden measurement host doesn't need to match
                      // (that section isn't being measured against its
                      // own inflated active-state markup).
                      <span style={{ display: 'inline-flex', width: '100%', gap: '4pt', alignItems: 'flex-start' }}>
                        <EditableText
                          as="span"
                          value={bullet}
                          onCommit={(v) => updateBullet(sectionId, entry.id, bIdx, v)}
                          editable
                          style={{ flex: 1 }}
                        />
                        <button
                          className="icon-btn danger no-print cv-item-controls"
                          title="Remove bullet"
                          onClick={() => removeBullet(sectionId, entry.id, bIdx)}
                        >
                          <CloseIcon />
                        </button>
                      </span>
                    ) : editing ? (
                      // Inactive but editing: same two-span shape as
                      // preview (bold label span + plain text run), just
                      // made directly click-to-edit — no wrapper, no
                      // extra flex layout, so this measures/wraps
                      // identically to the hidden `editing={false}`
                      // measurement host paginate.js uses.
                      label ? (
                        <>
                          <EditableText
                            as="span"
                            className="cv-entry-bullet-label"
                            value={label}
                            onCommit={(v) => updateBullet(sectionId, entry.id, bIdx, `${v}: ${rest}`)}
                            editable
                            multiline={false}
                          />
                          <EditableText
                            as="span"
                            value={rest}
                            onCommit={(v) => updateBullet(sectionId, entry.id, bIdx, `${label}: ${v}`)}
                            editable
                            multiline={false}
                          />
                        </>
                      ) : (
                        <EditableText
                          as="span"
                          value={bullet}
                          onCommit={(v) => updateBullet(sectionId, entry.id, bIdx, v)}
                          editable
                          multiline={false}
                        />
                      )
                    ) : label ? (
                      <>
                        <span className="cv-entry-bullet-label">{label}:</span>
                        {rest}
                      </>
                    ) : (
                      bullet
                    )}
                  </li>
                );
              })}
              {showEmptyState && isSubValid('add-bullet') && (
                <li style={{ listStyle: 'none', marginLeft: '-12pt' }}>
                  <button className="icon-btn no-print cv-item-controls" onClick={() => addBullet(sectionId, entry.id)}>
                    <PlusIcon /> Add bullet
                  </button>
                </li>
              )}
            </ul>
          )}

          {isSubValid('foot') && (entry.footer || showEmptyState) && (
            <EditableText
              as="p"
              className="cv-entry-footer"
              value={entry.footer}
              onCommit={(v) => updateEntry(entry.id, { footer: v })}
              editable={editing}
              multiline={false}
              placeholder="Optional footer (reference, contact...)"
              data-sub-id="foot"
            />
          )}

          {showEmptyState && (
            <div className="no-print cv-item-controls" style={{ display: 'flex', gap: '4pt', marginTop: '5pt' }}>
              <MoveRemoveButtons
                onMoveUp={() => moveEntryStep(entry.id, -1)}
                onMoveDown={() => moveEntryStep(entry.id, 1)}
                onRemove={() => removeEntry(entry.id)}
                disableUp={isFirst(idx)}
                disableDown={isLast(idx)}
                removeTitle="Remove entry"
              />
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

function splitBulletLabel(bullet) {
  const idx = bullet.indexOf(':');
  if (idx === -1 || idx > 40) return [null, bullet];
  return [bullet.slice(0, idx), bullet.slice(idx + 1).trim()];
}
