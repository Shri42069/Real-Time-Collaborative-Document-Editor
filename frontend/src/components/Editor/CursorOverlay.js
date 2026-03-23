import React, { useEffect, useState } from 'react';

/**
 * Renders coloured cursor flags for all remote users.
 * Uses Quill's getBounds() to position carets accurately.
 */
export default function CursorOverlay({ cursors, editorId }) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    const editor = document.querySelector(`#${editorId} .ql-editor`);
    if (!editor) return;

    const quill = document.querySelector(`#${editorId} .quill`)?.__quill;

    const mapped = {};
    Object.entries(cursors).forEach(([userId, { username, color, position }]) => {
      if (!position || !quill) return;
      try {
        const bounds = quill.getBounds(position.index, position.length);
        if (bounds) {
          mapped[userId] = { username, color, top: bounds.top, left: bounds.left };
        }
      } catch { /* selection outside current doc length */ }
    });
    setPositions(mapped);
  }, [cursors, editorId]);

  return (
    <>
      {Object.entries(positions).map(([userId, { username, color, top, left }]) => (
        <div
          key={userId}
          className="cursor-flag"
          style={{ top: top + 'px', left: left + 'px' }}
        >
          <div className="cursor-caret" style={{ background: color }} />
          <span className="cursor-label" style={{ background: color }}>{username}</span>
        </div>
      ))}
    </>
  );
}
