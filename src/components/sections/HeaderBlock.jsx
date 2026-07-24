import EditableText from '../EditableText';
import { useCVStore } from '../../store/cvStore';
import { PlusIcon, CloseIcon } from '../Icons';

/**
 * The top-of-page identity block: name, subtitle/title line, and a row of
 * contact links. Alignment (left/center) is theme-driven; content editing
 * happens inline when `editing` is true.
 *
 * `isActive` mirrors SectionBlock's concept for the header (which isn't
 * one of the reorderable sections, so it tracks its own activation state
 * via CVDocument's HEADER_PSEUDO_ID — see there). Name/title stay
 * directly clickable-to-edit whenever `editing` is true, same as
 * existing filled-in text elsewhere; `isActive` only gates the per-row
 * remove buttons and the add-contact/add-link affordances, so an
 * unclicked header shows exactly the same contact row preview does.
 */
export default function HeaderBlock({ header, editing, showRule, isActive = false, onActivate }) {
  const updateHeader = useCVStore((s) => s.updateHeader);
  const updateHeaderContact = useCVStore((s) => s.updateHeaderContact);
  const addHeaderContact = useCVStore((s) => s.addHeaderContact);
  const removeHeaderContact = useCVStore((s) => s.removeHeaderContact);

  const showEmptyState = editing && isActive;

  const allContacts = [
    ...header.contacts.map((c) => ({ ...c, list: 'contacts' })),
    ...header.links.map((c) => ({ ...c, list: 'links' })),
  ];

  return (
    <header
      className={`cv-header ${editing ? 'cv-header-editable' : ''} ${showEmptyState ? 'active' : ''}`}
      data-align="center"
      data-header
      onMouseDown={() => {
        if (editing && typeof onActivate === 'function') onActivate();
      }}
    >
      <EditableText
        as="h1"
        className="cv-name"
        value={header.name}
        onCommit={(text) => updateHeader({ name: text })}
        editable={editing}
        multiline={false}
        placeholder="Your Name"
      />
      <EditableText
        as="p"
        className="cv-header-title"
        value={header.title}
        onCommit={(text) => updateHeader({ title: text })}
        editable={editing}
        multiline={false}
        placeholder="Professional title / tagline"
      />
      <div className="cv-contacts">
        {allContacts.map((c, i) => (
          <span key={c.id} className="cv-contact-row" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3pt' }}>
            {showEmptyState ? (
              <>
                <EditableText
                  as="span"
                  className="cv-contact-label"
                  value={c.label}
                  onCommit={(text) => updateHeaderContact(c.list, c.id, { label: text })}
                  editable
                  multiline={false}
                  placeholder="Label"
                  style={{ display: 'inline-block' }}
                />
                <EditableText
                  as="span"
                  value={c.value}
                  onCommit={(text) => updateHeaderContact(c.list, c.id, { value: text })}
                  editable
                  multiline={false}
                  placeholder="value"
                  style={{ display: 'inline-block' }}
                />
                <button
                  className="icon-btn danger no-print cv-item-controls"
                  title="Remove contact"
                  onClick={() => removeHeaderContact(c.list, c.id)}
                  style={{ padding: '0 2px' }}
                >
                  <CloseIcon />
                </button>
              </>
            ) : editing ? (
              // Inactive but editing: same two-piece shape preview uses
              // (bold label span + plain value span) — just made directly
              // click-to-edit, no inline-block override, no remove
              // button — so this measures/wraps identically to the
              // hidden `editing={false}` measurement host.
              <>
                <EditableText
                  as="span"
                  className="cv-contact-label"
                  value={`${c.label}:`}
                  onCommit={(text) => updateHeaderContact(c.list, c.id, { label: text.replace(/:$/, '') })}
                  editable
                  multiline={false}
                />
                <EditableText
                  as="span"
                  value={c.value}
                  onCommit={(text) => updateHeaderContact(c.list, c.id, { value: text })}
                  editable
                  multiline={false}
                />
              </>
            ) : (
              <>
                <span className="cv-contact-label">{c.label}:</span>
                <a href={toHref(c.value)} target="_blank" rel="noreferrer">
                  {c.value}
                </a>
              </>
            )}
            {i < allContacts.length - 1 && !showEmptyState && <span aria-hidden="true"> | </span>}
          </span>
        ))}
        {showEmptyState && (
          <span style={{ display: 'inline-flex', gap: '4pt' }}>
            <button className="icon-btn no-print" title="Add contact" onClick={() => addHeaderContact('contacts')}>
              <PlusIcon /> contact
            </button>
            <button className="icon-btn no-print" title="Add link" onClick={() => addHeaderContact('links')}>
              <PlusIcon /> link
            </button>
          </span>
        )}
      </div>
      {showRule && <hr className="cv-header-rule" />}
    </header>
  );
}

function toHref(value) {
  if (/^https?:\/\//.test(value)) return value;
  if (value.includes('@')) return `mailto:${value}`;
  return `https://${value}`;
}