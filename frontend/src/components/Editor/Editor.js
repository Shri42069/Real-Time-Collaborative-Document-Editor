import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './Editor.css';
import CursorOverlay   from './CursorOverlay';
import ActiveUsers     from './ActiveUsers';
import VersionHistory  from './VersionHistory';
import ShareModal      from './ShareModal';
import { useDocument }     from '../../hooks/useDocument';
import { useAuth }         from '../../context/AuthContext';
import { documentService } from '../../services/documents';
import { getCurrentToken } from '../../services/api';

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ color: [] }, { background: [] }],
  ['link', 'blockquote', 'code-block'],
  ['clean'],
];

export default function Editor({ documentId }) {
  const { user, accessToken } = useAuth();
  const {
    title, setTitle,
    activeUsers, cursors,
    connected, error,
    versions, loadVersions, restoreVersion,
    initEditor,
  } = useDocument(documentId);

  const [showHistory,  setShowHistory]  = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [docMeta,      setDocMeta]      = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [titleInput,   setTitleInput]   = useState(title);

  const titleTimer = useRef(null);
  const quillRef   = useRef(null);
  const inited     = useRef(false);

  useEffect(() => { setTitleInput(title); }, [title]);

  // Init Yjs<->Quill as soon as Quill mounts
  useEffect(() => {
    if (inited.current) return;
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    if (!quill) return;
    inited.current = true;
    console.log('[EDITOR] Quill ready — calling initEditor');
    initEditor(quill);
  });

  useEffect(() => {
    inited.current = false;
  }, [documentId]);

  const onTitleChange = (e) => {
    const val = e.target.value;
    setTitleInput(val);
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => setTitle(val), 600);
  };

  const openShare = async () => {
    console.log('[SHARE] openShare clicked');
    console.log('[SHARE] accessToken from useAuth:', accessToken ? `SET (${accessToken.slice(0,20)}...)` : 'NULL');
    console.log('[SHARE] getCurrentToken() from api module:', getCurrentToken() ? `SET (${getCurrentToken().slice(0,20)}...)` : 'NULL');
    console.log('[SHARE] documentId:', documentId);

    setShareLoading(true);
    try {
      console.log('[SHARE] Calling documentService.get(', documentId, ')');
      const doc = await documentService.get(documentId);
      console.log('[SHARE] documentService.get succeeded:', doc.title);
      setDocMeta(doc);
    } catch (err) {
      console.error('[SHARE] documentService.get FAILED:', err.response?.status, err.response?.data);
      setDocMeta(null);
    } finally {
      setShareLoading(false);
      setShowShare(true);
    }
  };

  const refreshDocMeta = async () => {
    try {
      const doc = await documentService.get(documentId);
      setDocMeta(doc);
    } catch { /* ignore */ }
  };

  if (error) return (
    <div className="editor-error">
      <p>⚠ {error}</p>
      <button onClick={() => window.location.href = '/dashboard'}
        style={{ marginTop: 12, padding: '8px 18px', borderRadius: 8,
          border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
        Back to dashboard
      </button>
    </div>
  );

  return (
    <div className="editor-shell">
      <div className="editor-topbar">
        <button className="btn-back" onClick={() => window.location.href = '/dashboard'} title="Back">←</button>

        <input
          className="editor-title"
          value={titleInput}
          onChange={onTitleChange}
          placeholder="Untitled Document"
          maxLength={200}
        />

        <div className="editor-topbar-right">
          <span className={`editor-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● Live' : '○ Offline'}
          </span>
          <ActiveUsers users={activeUsers} currentUserId={user?._id} />
          <button className="btn-secondary" onClick={openShare} disabled={shareLoading}>
            {shareLoading ? '…' : 'Share'}
          </button>
          <button className="btn-secondary" onClick={() => {
            setShowHistory(h => !h);
            if (!showHistory) loadVersions();
          }}>
            History
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-paper" id="editor-paper">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            modules={{ toolbar: TOOLBAR }}
            placeholder="Start writing…"
          />
          <CursorOverlay cursors={cursors} editorId="editor-paper" />
        </div>

        {showHistory && (
          <VersionHistory
            versions={versions}
            onRestore={async (vId) => { await restoreVersion(vId); setShowHistory(false); }}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>

      {showShare && (
        <ShareModal
          document={docMeta}
          currentUser={user}
          onClose={() => setShowShare(false)}
          onUpdate={refreshDocMeta}
        />
      )}
    </div>
  );
}