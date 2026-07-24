import EditableText from '../EditableText';
import { useCVStore } from '../../store/cvStore';

/** A single paragraph of free text, e.g. the Summary section. */
export default function TextSection({ sectionId, body, editing }) {
  const updateSectionField = useCVStore((s) => s.updateSectionField);

  return (
    <EditableText
      as="p"
      className="cv-text-body"
      value={body}
      onCommit={(v) => updateSectionField(sectionId, 'body', v)}
      editable={editing}
      placeholder="Write a short paragraph here."
    />
  );
}
