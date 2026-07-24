import { useCVStore } from '../../store/cvStore';

/**
 * Shared plumbing for the three item-list section renderers (entry-list,
 * skill-list, label-list): the store actions they all call, plus the
 * itemOffset -> globalIndex math needed to correctly disable the first/last
 * move buttons when `items` is a paginated slice rather than the full list
 * (see EntryListSection's doc comment for what itemOffset/totalItems are).
 */
export function useSectionItems(sectionId, itemOffset, totalItems, items) {
  const updateEntry = useCVStore((s) => s.updateEntry);
  const removeEntry = useCVStore((s) => s.removeEntry);
  const moveEntryStep = useCVStore((s) => s.moveEntryStep);

  const total = totalItems ?? items.length;
  const globalIndex = (idx) => idx + itemOffset;

  return {
    updateEntry: (entryId, patch) => updateEntry(sectionId, entryId, patch),
    removeEntry: (entryId) => removeEntry(sectionId, entryId),
    moveEntryStep: (entryId, direction) => moveEntryStep(sectionId, entryId, direction),
    globalIndex,
    isFirst: (idx) => globalIndex(idx) === 0,
    isLast: (idx) => globalIndex(idx) === total - 1,
  };
}
