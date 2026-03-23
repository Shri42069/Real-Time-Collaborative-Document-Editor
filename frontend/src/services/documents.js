import api from './api';

export const documentService = {
  list:   ()           => api.get('/documents').then(r => r.data),
  create: (title)      => api.post('/documents', { title }).then(r => r.data),
  get:    (id)         => api.get(`/documents/${id}`).then(r => r.data),
  update: (id, data)   => api.patch(`/documents/${id}`, data).then(r => r.data),
  remove: (id)         => api.delete(`/documents/${id}`).then(r => r.data),

  addCollaborator:    (id, userId) => api.post(`/documents/${id}/collaborators`, { userId }).then(r => r.data),
  removeCollaborator: (id, userId) => api.delete(`/documents/${id}/collaborators/${userId}`).then(r => r.data),

  getVersions:    (id)            => api.get(`/documents/${id}/versions`).then(r => r.data),
  restoreVersion: (id, versionId) => api.post(`/documents/${id}/restore/${versionId}`).then(r => r.data),
};
