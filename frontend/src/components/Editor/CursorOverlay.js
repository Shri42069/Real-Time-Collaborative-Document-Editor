import React, { useEffect, useRef } from 'react';

/**
 * Renders remote user cursors directly into the Quill editor:
 * - A coloured blinking caret at their cursor position
 * - A name tooltip above the caret
 * - A coloured highlight over any selected text
 *
 * Uses Quill's own getBounds() for pixel-accurate positioning,
 * and addContainer() to inject highlights into the editor scroll layer.
 */
export default function CursorOverlay({ cursors, quill }) {
  // One container div per remote user, injected into the Quill editor DOM
  const containerRefs = useRef({});
  // One highlight <span> per user for selection ranges
  const highlightRefs = useRef({});

  useEffect(() => {
    if (!quill) return;

    const editorEl = quill.root; // the contenteditable div
    const editorContainer = editorEl.parentElement; // .ql-container

    Object.entries(cursors).forEach(([userId, { username, color, position }]) => {
      if (!position) return;

      // ── Create or reuse the cursor container ──────────
      if (!containerRefs.current[userId]) {
        const div = document.createElement('div');
        div.className = 'ql-cursor-container';
        div.style.cssText = `
          position: absolute;
          pointer-events: none;
          z-index: 100;
          top: 0; left: 0;
        `;
        editorContainer.appendChild(div);
        containerRefs.current[userId] = div;
      }

      // ── Create or reuse the highlight span ────────────
      if (!highlightRefs.current[userId]) {
        const span = document.createElement('span');
        span.className = 'ql-cursor-highlight';
        editorEl.appendChild(span);
        highlightRefs.current[userId] = span;
      }

      try {
        const bounds = quill.getBounds(position.index, Math.max(position.length, 0));
        if (!bounds) return;

        const container = containerRefs.current[userId];

        // Position the caret at cursor location
        container.innerHTML = `
          <div style="
            position: absolute;
            top: ${bounds.top}px;
            left: ${bounds.left}px;
            height: ${bounds.height}px;
            width: 2px;
            background: ${color};
            border-radius: 1px;
            animation: ql-cursor-blink 1.2s ease-in-out infinite;
          ">
            <div style="
              position: absolute;
              top: -22px;
              left: 0;
              background: ${color};
              color: #fff;
              font-size: 11px;
              font-weight: 600;
              font-family: Inter, system-ui, sans-serif;
              padding: 2px 7px;
              border-radius: 4px;
              white-space: nowrap;
              line-height: 1.6;
              box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            ">${username}</div>
          </div>
        `;

        // ── Highlight selected text ───────────────────
        const highlight = highlightRefs.current[userId];
        if (position.length > 0) {
          // Selection exists — draw a highlight box
          const startBounds = quill.getBounds(position.index, 0);
          const endBounds   = quill.getBounds(position.index + position.length, 0);

          // Single-line selection
          if (Math.abs(startBounds.top - endBounds.top) < 5) {
            highlight.style.cssText = `
              position: absolute;
              top: ${startBounds.top}px;
              left: ${startBounds.left}px;
              width: ${endBounds.left - startBounds.left}px;
              height: ${startBounds.height}px;
              background: ${color}33;
              pointer-events: none;
              border-radius: 2px;
            `;
          } else {
            // Multi-line — just shade the full bounds rectangle
            highlight.style.cssText = `
              position: absolute;
              top: ${startBounds.top}px;
              left: 0;
              width: 100%;
              height: ${endBounds.top + endBounds.height - startBounds.top}px;
              background: ${color}22;
              pointer-events: none;
              border-radius: 2px;
            `;
          }
        } else {
          highlight.style.cssText = 'display: none;';
        }
      } catch {
        // Position outside current doc length — skip silently
      }
    });

    // ── Clean up cursors for users who left ──────────
    Object.keys(containerRefs.current).forEach(userId => {
      if (!cursors[userId]) {
        containerRefs.current[userId]?.remove();
        delete containerRefs.current[userId];
        highlightRefs.current[userId]?.remove();
        delete highlightRefs.current[userId];
      }
    });

  }, [cursors, quill]);

  // Clean up all DOM nodes when component unmounts
  useEffect(() => {
    return () => {
      Object.values(containerRefs.current).forEach(el => el?.remove());
      Object.values(highlightRefs.current).forEach(el => el?.remove());
      containerRefs.current = {};
      highlightRefs.current = {};
    };
  }, []);

  // Nothing rendered in React tree — all DOM work is done imperatively above
  return null;
}