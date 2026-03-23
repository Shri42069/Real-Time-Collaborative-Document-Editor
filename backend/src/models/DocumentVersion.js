const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document', required: true,
  },
  content:       { type: String, default: '' },
  yjsState:      { type: Buffer, default: null },
  versionNumber: { type: Number, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', default: null,
  },
}, { timestamps: true });

versionSchema.index({ documentId: 1, versionNumber: -1 });

module.exports = mongoose.model('DocumentVersion', versionSchema);
