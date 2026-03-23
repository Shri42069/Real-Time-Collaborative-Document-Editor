import React, { useState } from 'react';
import api from '../../services/api';
import { documentService } from '../../services/documents';
import './ShareModal.css';

export default function ShareModal({ document, currentUser, onClose, onUpdate }) {
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [removing, setRemoving] = useState(null);

  // Fix: compare as strings — MongoDB ObjectIds are objects, === always false
  const ownerId = document?.ownerId?._id?.toString() || document?.ownerId?.toString();
  const meId    = currentUser?._id?.toString();
  const isOwner = ownerId && meId && ownerId === meId;

  const addCollaborator = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/profile/lookup?email=${encodeURIComponent(email.trim())}`);
      const targetId = data.user._id.toString();

      // Prevent adding yourself
      if (targetId === meId) {
        setError("You can't add yourself as a collaborator.");
        return;
      }

      // Prevent adding someone already on the list
      const already = (document?.collaborators || []).some(
        c => (c._id?.toString() || c.toString()) === targetId
      );
      if (already) {
        setError(`${data.user.username} is already a collaborator.`);
        return;
      }

      await documentService.addCollaborator(document._id, targetId);
      setSuccess(`${data.user.username} added successfully.`);
      setEmail('');
      onUpdate?.();
    } catch (err) {
      setError(err.response?.data?.error || 'User not found. Make sure they have an account.');
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (userId, username) => {
    if (!window.confirm(`Remove ${username}?`)) return;
    setRemoving(userId);
    try {
      await documentService.removeCollaborator(document._id, userId);
      onUpdate?.();
    } catch {
      setError('Could not remove collaborator');
    } finally {
      setRemoving(null);
    }
  };

  const collaborators = document?.collaborators || [];

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-header">
          <span className="share-title">Share document</span>
          <button className="share-close" onClick={onClose}>✕</button>
        </div>

        <div className="share-doc-name">{document?.title || 'Untitled'}</div>

        {!document && (
          <p className="share-error">Loading document info…</p>
        )}

        {document && !isOwner && (
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            Only the owner can manage access.
          </p>
        )}

        {isOwner && (
          <form className="share-form" onSubmit={addCollaborator}>
            <input
              className="share-input"
              type="email"
              placeholder="Invite by email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button className="share-add-btn" type="submit" disabled={loading}>
              {loading ? '…' : 'Invite'}
            </button>
          </form>
        )}

        {error   && <p className="share-error">{error}</p>}
        {success && <p className="share-success">{success}</p>}

        <div className="share-section-label">People with access</div>

        <div className="share-people">
          {/* Owner row */}
          <div className="share-person">
            <div
              className="share-avatar"
              style={{ background: document?.ownerId?.color || '#534AB7' }}
            >
              {(document?.ownerId?.username || 'O')[0].toUpperCase()}
            </div>
            <div className="share-person-info">
              <span className="share-person-name">
                {document?.ownerId?.username || 'Owner'}
                {ownerId === meId && ' (you)'}
              </span>
              <span className="share-person-role">Owner</span>
            </div>
          </div>

          {/* Collaborators */}
          {collaborators.map(collab => {
            const id       = collab._id?.toString() || collab.toString();
            const username = collab.username || id;
            const color    = collab.color || '#888';
            return (
              <div key={id} className="share-person">
                <div className="share-avatar" style={{ background: color }}>
                  {username[0].toUpperCase()}
                </div>
                <div className="share-person-info">
                  <span className="share-person-name">
                    {username}
                    {id === meId && ' (you)'}
                  </span>
                  <span className="share-person-role">Editor</span>
                </div>
                {isOwner && id !== meId && (
                  <button
                    className="share-remove-btn"
                    onClick={() => removeCollaborator(id, username)}
                    disabled={removing === id}
                  >
                    {removing === id ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {collaborators.length === 0 && (
          <p className="share-empty">
            {isOwner ? 'No collaborators yet. Invite someone above.' : 'No other collaborators.'}
          </p>
        )}
      </div>
    </div>
  );
}