import { UpIcon, DownIcon, TrashIcon } from '../Icons';

/** The move-up / move-down / remove button trio repeated by every item list
 * (entries, skills, labels). Callers own the wrapping element and its layout
 * since that differs per section type. */
export default function MoveRemoveButtons({ onMoveUp, onMoveDown, onRemove, disableUp, disableDown, removeTitle = 'Remove' }) {
  return (
    <>
      <button className="icon-btn" title="Move up" onClick={onMoveUp} disabled={disableUp}>
        <UpIcon />
      </button>
      <button className="icon-btn" title="Move down" onClick={onMoveDown} disabled={disableDown}>
        <DownIcon />
      </button>
      <button className="icon-btn danger" title={removeTitle} onClick={onRemove}>
        <TrashIcon />
      </button>
    </>
  );
}
