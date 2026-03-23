const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String, required: true,
    trim: true, maxlength: 200, default: 'Untitled Document',
  },
  yjsState: { type: Buffer, default: null },
  content:  { type: String, default: '' },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true,
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId, ref: 'User',
  }],
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

documentSchema.index({ ownerId: 1 });
documentSchema.index({ collaborators: 1 });

// Helper: works whether ownerId/collaborators are raw ObjectIds OR populated User objects
function toIdString(val) {
  if (!val) return '';
  // After .populate(), val is a User object with ._id
  // Before populate, val is an ObjectId — both have .toString() but ObjectId gives the hex string
  return (val._id || val).toString();
}

documentSchema.methods.isAccessibleBy = function (userId) {
  if (this.isPublic) return true;
  const id = userId.toString();
  return toIdString(this.ownerId) === id ||
    this.collaborators.some(c => toIdString(c) === id);
};

documentSchema.methods.isEditableBy = function (userId) {
  const id = userId.toString();
  return toIdString(this.ownerId) === id ||
    this.collaborators.some(c => toIdString(c) === id);
};

module.exports = mongoose.model('Document', documentSchema);