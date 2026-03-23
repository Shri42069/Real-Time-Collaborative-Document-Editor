import React, { useState } from 'react';
import './VersionHistory.css';

export default function VersionHistory({ versions, onRestore, onClose }) {
  const [restoring, setRestoring] = useState(null);

  const handleRestore = async (vId) => {
    if (!window.confirm('Restore this version? Current content will be overwritten.')) return;
    setRestoring(vId);
    try {
      await onRestore(vId);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="vh-panel">
      <div className="vh-header">
        <span className="vh-title">Version History</span>
        <button className="vh-close" onClick={onClose}>✕</button>
      </div>
      <div className="vh-list">
        {versions.length === 0 && (
          <p className="vh-empty">No versions saved yet.</p>
        )}
        {versions.map((v) => (
          <div key={v._id} className="vh-item">
            <div className="vh-item-meta">
              <span className="vh-version">v{v.versionNumber}</span>
              <span className="vh-date">
                {new Date(v.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="vh-preview">
              {v.content?.slice(0, 80) || '(empty)'}
              {v.content?.length > 80 && '…'}
            </p>
            <button
              className="vh-restore-btn"
              onClick={() => handleRestore(v._id)}
              disabled={restoring === v._id}
            >
              {restoring === v._id ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
