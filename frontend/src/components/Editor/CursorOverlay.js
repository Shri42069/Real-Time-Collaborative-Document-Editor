import { useEffect, useRef } from 'react';

export default function CursorOverlay({ cursors, quillRef }) {
  const containerRefs = useRef({});
  const highlightRefs = useRef({});

  useEffect(() => {
    // Read quill from the ref directly — always gets the latest value
    const quill = quillRef?.current?.getEditor ? quillRef.current.getEditor() : null;

    if (!quill) return;

    const editorEl        = quill.root;
    const editorContainer = editorEl.parentElement;

    Object.entries(cursors).forEach(([userId, { username, color, position }]) => {
      if (!position) return;

      // Create container once per user
      if (!containerRefs.current[userId]) {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute;
          pointer-events: none;
          z-index: 1000;
          top: 0; left: 0;
          width: 100%; height: 100%;
        `;
        editorContainer.style.position = 'relative';
        editorContainer.appendChild(div);
        containerRefs.current[userId] = div;
      }

      // Create highlight container once per user
      if (!highlightRefs.current[userId]) {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute;
          pointer-events: none;
          z-index: 999;
          top: 0; left: 0;
          width: 100%; height: 100%;
        `;
        editorContainer.appendChild(div);
        highlightRefs.current[userId] = div;
      }

      try {
        const index  = position.index  ?? 0;
        const length = position.length ?? 0;
        const bounds = quill.getBounds(index, length);
        if (!bounds) return;

        // ── Draw caret + name label ───────────────────
        containerRefs.current[userId].innerHTML = `
          <div style="
            position: absolute;
            top: ${bounds.top}px;
            left: ${bounds.left}px;
            height: ${bounds.height}px;
            width: 2px;
            background: ${color};
            border-radius: 1px;
          ">
            <div style="
              position: absolute;
              top: -24px;
              left: 0;
              background: ${color};
              color: #fff;
              font-size: 11px;
              font-weight: 600;
              font-family: Inter, system-ui, sans-serif;
              padding: 2px 8px;
              border-radius: 4px;
              white-space: nowrap;
              line-height: 1.6;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            ">${username}</div>
          </div>
        `;

        // ── Draw selection highlight ──────────────────
        const hl = highlightRefs.current[userId];
        if (length > 0) {
          const startB = quill.getBounds(index, 0);
          const endB   = quill.getBounds(index + length, 0);
          if (startB && endB) {
            const singleLine = Math.abs(startB.top - endB.top) < 5;
            hl.innerHTML = singleLine
              ? `<div style="
                    position:absolute;
                    top:${startB.top}px;
                    left:${startB.left}px;
                    width:${Math.max(endB.left - startB.left, 4)}px;
                    height:${startB.height}px;
                    background:${color}33;
                    border-radius:2px;
                  "></div>`
              : `<div style="
                    position:absolute;
                    top:${startB.top}px;
                    left:0;
                    width:100%;
                    height:${endB.top + endB.height - startB.top}px;
                    background:${color}22;
                    border-radius:2px;
                  "></div>`;
          }
        } else {
          hl.innerHTML = '';
        }

      } catch {
        // index out of range — skip
      }
    });

    // Remove cursors for users who left
    Object.keys(containerRefs.current).forEach(userId => {
      if (!cursors[userId]) {
        containerRefs.current[userId]?.remove();
        delete containerRefs.current[userId];
        highlightRefs.current[userId]?.remove();
        delete highlightRefs.current[userId];
      }
    });

  }, [cursors, quillRef]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(containerRefs.current).forEach(el => el?.remove());
      Object.values(highlightRefs.current).forEach(el => el?.remove());
      containerRefs.current = {};
      highlightRefs.current = {};
    };
  }, []);

  return null;
}