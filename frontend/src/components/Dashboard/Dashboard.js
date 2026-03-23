import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../../context/AuthContext';
import { documentService } from '../../services/documents';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout }    = useAuth();
  const navigate            = useNavigate();
  const [docs,    setDocs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error,   setError]  = useState('');

  const load = useCallback(async () => {
    try {
      const data = await documentService.list();
      setDocs(data);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createDoc = async () => {
    setCreating(true);
    try {
      const doc = await documentService.create('Untitled Document');
      navigate(`/editor/${doc._id}`);
    } catch {
      setError('Could not create document');
      setCreating(false);
    }
  };

  const deleteDoc = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document?')) return;
    await documentService.remove(id);
    setDocs(d => d.filter(doc => doc._id !== id));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dash-shell">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="dash-sidebar">
        <div className="dash-brand">✦ CollabEditor</div>
        <nav className="dash-nav">
          <span className="dash-nav-item active">My Documents</span>
        </nav>
        <div className="dash-user">
          <div
            className="dash-avatar"
            style={{ background: user?.color || '#534AB7' }}
          >
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="dash-user-info">
            <span className="dash-user-name">{user?.username}</span>
            <span className="dash-user-email">{user?.email}</span>
          </div>
          <button className="dash-logout" onClick={handleLogout} title="Sign out">↩</button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────── */}
      <main className="dash-main">
        <div className="dash-topbar">
          <h1 className="dash-heading">My Documents</h1>
          <button className="dash-create-btn" onClick={createDoc} disabled={creating}>
            {creating ? 'Creating…' : '+ New Document'}
          </button>
        </div>

        {error && <div className="dash-error">{error}</div>}

        {loading ? (
          <div className="dash-loading">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="dash-empty">
            <p className="dash-empty-icon">📄</p>
            <p className="dash-empty-text">No documents yet</p>
            <button className="dash-create-btn" onClick={createDoc}>
              Create your first document
            </button>
          </div>
        ) : (
          <div className="dash-grid">
            {docs.map(doc => (
              <div
                key={doc._id}
                className="dash-doc-card"
                onClick={() => navigate(`/editor/${doc._id}`)}
              >
                <div className="dash-doc-icon">📝</div>
                <div className="dash-doc-info">
                  <p className="dash-doc-title">{doc.title || 'Untitled'}</p>
                  <p className="dash-doc-meta">
                    Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                  {doc.collaborators?.length > 0 && (
                    <p className="dash-doc-collab">
                      {doc.collaborators.length} collaborator{doc.collaborators.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <button
                  className="dash-doc-delete"
                  onClick={(e) => deleteDoc(e, doc._id)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
