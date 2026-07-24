import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCVStore } from '../store/cvStore';
import { sectionTypeDefs, sectionTypeOrder } from '../data/sectionTypes';
import { GripIcon, PlusIcon, CopyIcon, TrashIcon } from './Icons';

/**
 * The Sections panel is the ONLY place layout can be rearranged, and even
 * there, dragging is constrained to reordering within a fixed vertical list
 * per column (dnd-kit's sortable list), never free x/y placement. This
 * satisfies "movable but not Canva-style drag-anywhere" — every drop slot
 * snaps to the same grid the renderer uses.
 */
export default function SectionsPanel({ selectedSectionId, onSelectSection }) {
  const cv = useCVStore((s) => s.cv);
  const theme = useCVStore((s) => s.theme);
  const moveSection = useCVStore((s) => s.moveSection);
  const [menuOpen, setMenuOpen] = useState(null); // 'leftColumn' | 'rightColumn' | null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(column) {
    return (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const list = cv.layout[column];
      const oldIndex = list.indexOf(active.id);
      const newIndex = list.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(list, oldIndex, newIndex);
      // Re-derive target index after move and commit via store action so it's undoable.
      moveSection(active.id, column, reordered.indexOf(active.id));
    };
  }

  return (
    <aside className="side-panel">
      <div className="panel-header">
        <h2>Sections</h2>
        <p>Drag within a column to reorder, or move sections between columns.</p>
      </div>
      <div className="panel-content panel-scroll">
        <ColumnList
          title={theme.twoColumn ? 'Left column' : 'Page (top to bottom)'}
          column="leftColumn"
          ids={cv.layout.leftColumn}
          sections={cv.sections}
          sensors={sensors}
          onDragEnd={handleDragEnd('leftColumn')}
          selectedSectionId={selectedSectionId}
          onSelectSection={onSelectSection}
          menuOpen={menuOpen === 'leftColumn'}
          onToggleMenu={() => setMenuOpen(menuOpen === 'leftColumn' ? null : 'leftColumn')}
          onCloseMenu={() => setMenuOpen(null)}
        />
        {theme.twoColumn && (
          <ColumnList
            title="Right column"
            column="rightColumn"
            ids={cv.layout.rightColumn}
            sections={cv.sections}
            sensors={sensors}
            onDragEnd={handleDragEnd('rightColumn')}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            menuOpen={menuOpen === 'rightColumn'}
            onToggleMenu={() => setMenuOpen(menuOpen === 'rightColumn' ? null : 'rightColumn')}
            onCloseMenu={() => setMenuOpen(null)}
          />
        )}
        {!theme.twoColumn && cv.layout.rightColumn.length > 0 && (
          <ColumnList
            title="Continued"
            column="rightColumn"
            ids={cv.layout.rightColumn}
            sections={cv.sections}
            sensors={sensors}
            onDragEnd={handleDragEnd('rightColumn')}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            menuOpen={menuOpen === 'rightColumn'}
            onToggleMenu={() => setMenuOpen(menuOpen === 'rightColumn' ? null : 'rightColumn')}
            onCloseMenu={() => setMenuOpen(null)}
          />
        )}
      </div>
    </aside>
  );
}

function ColumnList({
  title,
  column,
  ids,
  sections,
  sensors,
  onDragEnd,
  selectedSectionId,
  onSelectSection,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
}) {
  const addSection = useCVStore((s) => s.addSection);

  return (
    <div className="column-block">
      <div className="column-block-label">{title}</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.map((id) => {
            const section = sections[id];
            if (!section) return null;
            return (
              <SortableSectionCard
                key={id}
                section={section}
                selected={selectedSectionId === id}
                onSelect={() => onSelectSection(id)}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      <div className="add-section-menu">
        <button className="btn btn-ghost btn-sm btn-block" onClick={onToggleMenu}>
          <PlusIcon /> Add section
        </button>
        {menuOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 25 }}
              onClick={onCloseMenu}
            />
            <div className="menu-popover">
              {sectionTypeOrder.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    addSection(type, column);
                    onCloseMenu();
                  }}
                >
                  {sectionTypeDefs[type].label}
                  <span className="menu-desc">{sectionTypeDefs[type].description}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SortableSectionCard({ section, selected, onSelect }) {
  const removeSection = useCVStore((s) => s.removeSection);
  const duplicateSection = useCVStore((s) => s.duplicateSection);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const itemCount = section.items?.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`section-card ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <span className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">
        <GripIcon />
      </span>
      <div className="section-card-main" onClick={onSelect}>
        <span className="section-card-title">{section.title || 'Untitled section'}</span>
        <span className="section-card-meta">
          {sectionTypeDefs[section.type]?.label}
          {typeof itemCount === 'number' ? ` · ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      <div className="section-card-actions">
        <button className="icon-btn" title="Duplicate section" onClick={() => duplicateSection(section.id)}>
          <CopyIcon />
        </button>
        <button className="icon-btn danger" title="Delete section" onClick={() => removeSection(section.id)}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
