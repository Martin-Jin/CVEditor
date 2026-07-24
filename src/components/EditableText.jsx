import { useRef, useEffect, useCallback } from 'react';

/**
 * A contentEditable span/div that:
 *  - auto-grows in height as text wraps (native block behavior — no manual sizing needed)
 *  - commits on blur AND on every input (debounced via the store's own history push
 *    only happening at blur, to avoid flooding undo history with every keystroke)
 *  - supports a resizable *width* via CSS `resize` when `resizableWidth` is set,
 *    while text overflow still wraps/grows height automatically.
 *
 * This is intentionally NOT a rich text editor — it only ever produces plain text,
 * keeping the CV's typography fully controlled by the theme rather than ad-hoc
 * inline formatting a user could apply per-word (which would break consistency).
 */
export default function EditableText({
  value,
  onCommit,
  as: Tag = 'div',
  className = '',
  placeholder = 'Click to edit',
  resizableWidth = false,
  multiline = true,
  editable = true,
  style,
  ...props // ALLOW DATA ATTRIBUTES
}) {
  const ref = useRef(null);
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    if (ref.current.innerText !== value) {
      ref.current.innerText = value ?? '';
    }
    lastCommitted.current = value;
  }, [value]);

  const handleBlur = useCallback(() => {
    if (!ref.current) return;
    const text = ref.current.innerText.replace(/\n+$/, '');
    if (text !== lastCommitted.current) {
      lastCommitted.current = text;
      onCommit(text);
    }
  }, [onCommit]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!multiline && e.key === 'Enter') {
        e.preventDefault();
        ref.current?.blur();
      }
      if (e.key === 'Escape') {
        ref.current.innerText = lastCommitted.current ?? '';
        ref.current.blur();
      }
    },
    [multiline]
  );

  const wrapperStyle = resizableWidth
    ? {
        resize: 'horizontal',
        overflow: 'hidden',
        display: 'inline-block',
        minWidth: '60px',
        maxWidth: '100%',
        ...style,
      }
    : style;

  return (
    <Tag
      ref={ref}
      className={`cv-editable ${className}`}
      contentEditable={editable}
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      style={wrapperStyle}
      {...props} 
    />
  );
}
