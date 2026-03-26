import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y            from 'yjs';
import { QuillBinding }  from 'y-quill';
import { getSocket }     from '../services/socket';
import { documentService } from '../services/documents';
import { uint8ToBase64, base64ToUint8 } from '../utils/base64';

const CURSOR_THROTTLE_MS = 30;

export function useDocument(documentId) {
  const [title,       setTitleState]  = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors,     setCursors]     = useState({});
  const [connected,   setConnected]   = useState(false);
  const [error,       setError]       = useState(null);
  const [versions,    setVersions]    = useState([]);

  const quillRef      = useRef(null);
  const ydocRef       = useRef(null);
  const bindingRef    = useRef(null);
  const lastCursor    = useRef(0);
  const pendingUpdate = useRef(null);

  const initEditor = useCallback((quill) => {
    if (!quill || bindingRef.current) return;
    quillRef.current = quill;

    const ydoc  = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('quill');
    bindingRef.current = new QuillBinding(ytext, quill);

    if (pendingUpdate.current) {
      Y.applyUpdate(ydoc, pendingUpdate.current, 'remote');
      pendingUpdate.current = null;
    }

    ydoc.on('update', (update, origin) => {
      if (origin === 'remote') return;
      const socket = getSocket();
      if (socket?.connected && documentId) {
        socket.emit('send-changes', {
          documentId,
          update: uint8ToBase64(update),
        });
      }
    });

    // Cursor broadcast — emit on EVERY selection change, no throttle skip on first move
    quill.on('selection-change', (range, oldRange, source) => {
      if (source !== 'user') return; // only broadcast user-initiated moves
      const now = Date.now();
      if (now - lastCursor.current < CURSOR_THROTTLE_MS) return;
      lastCursor.current = now;
      const socket = getSocket();
      if (socket?.connected) {
        const pos = range || { index: 0, length: 0 };
        console.log('[CURSOR] emitting cursor-move, position:', JSON.stringify(pos));
        socket.emit('cursor-move', { documentId, position: pos });
      }
    });
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join-document', { documentId });
    setConnected(true);

    socket.on('load-document', ({ yjsUpdate, title: t }) => {
      setTitleState(t || '');
      if (!yjsUpdate) return;
      const bytes = base64ToUint8(yjsUpdate);
      if (bytes.length <= 2) return;
      if (bindingRef.current && ydocRef.current) {
        Y.applyUpdate(ydocRef.current, bytes, 'remote');
      } else {
        pendingUpdate.current = bytes;
      }
    });

    socket.on('receive-changes', ({ update }) => {
      if (ydocRef.current) {
        Y.applyUpdate(ydocRef.current, base64ToUint8(update), 'remote');
      }
    });

    socket.on('user-joined', ({ activeUsers: au }) => setActiveUsers(au));

    socket.on('user-left', ({ userId }) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      setCursors(prev => { const n = { ...prev }; delete n[userId]; return n; });
    });

    socket.on('cursor-move', ({ userId, username, color, position }) => {
      console.log('[CURSOR] received cursor-move from', username, 'position:', JSON.stringify(position));
      setCursors(prev => ({
        ...prev,
        [userId]: { username, color, position },
      }));
    });

    socket.on('title-changed', ({ title: t }) => setTitleState(t));

    socket.on('document-restored', ({ content }) => {
      if (quillRef.current) {
        quillRef.current.setContents(
          quillRef.current.clipboard.convert(content)
        );
      }
    });

    socket.on('error', ({ message }) => setError(message));

    return () => {
      setConnected(false);
      pendingUpdate.current = null;
      ['load-document','receive-changes','user-joined','user-left',
       'cursor-move','title-changed','document-restored','error']
        .forEach(ev => socket.off(ev));
      bindingRef.current?.destroy();
      bindingRef.current = null;
      ydocRef.current?.destroy();
      ydocRef.current = null;
    };
  }, [documentId]);

  const updateTitle = useCallback((newTitle) => {
    setTitleState(newTitle);
    const socket = getSocket();
    if (socket?.connected) socket.emit('title-change', { documentId, title: newTitle });
    documentService.update(documentId, { title: newTitle }).catch(() => {});
  }, [documentId]);

  const loadVersions = useCallback(async () => {
    const v = await documentService.getVersions(documentId);
    setVersions(v);
    return v;
  }, [documentId]);

  const restoreVersion = useCallback(async (versionId) => {
    await documentService.restoreVersion(documentId, versionId);
  }, [documentId]);

  return {
    title, setTitle: updateTitle,
    activeUsers, cursors,
    connected, error,
    versions, loadVersions, restoreVersion,
    initEditor,
  };
}