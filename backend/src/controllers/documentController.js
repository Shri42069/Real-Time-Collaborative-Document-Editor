const { validationResult } = require('express-validator');
const Document        = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const logger          = require('../utils/logger');

// GET /api/documents
exports.list = async (req, res, next) => {
  try {
    const docs = await Document.find({
      $or: [{ ownerId: req.user._id }, { collaborators: req.user._id }],
    }).select('title ownerId collaborators updatedAt createdAt').lean();
    res.json(docs);
  } catch (err) { next(err); }
};

// POST /api/documents
exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const doc = await Document.create({
      title: req.body.title || 'Untitled Document',
      ownerId: req.user._id,
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
};

// GET /api/documents/:id
exports.get = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('ownerId', 'username email color')
      .populate('collaborators', 'username email color');

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Debug log — shows exactly who is asking and who owns the doc
    logger.info(`[DOC ACCESS] docId=${req.params.id} | requestedBy=${req.user._id} (${req.user.email}) | owner=${doc.ownerId?._id} (${doc.ownerId?.email}) | collaborators=[${doc.collaborators.map(c => c.email).join(', ')}]`);

    if (!doc.isAccessibleBy(req.user._id)) {
      logger.warn(`[DOC ACCESS] DENIED — user ${req.user.email} is not owner or collaborator`);
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(doc);
  } catch (err) { next(err); }
};

// PATCH /api/documents/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only the owner can update settings' });

    const { title, isPublic } = req.body;
    if (title    !== undefined) doc.title    = title;
    if (isPublic !== undefined) doc.isPublic = isPublic;
    await doc.save();
    res.json(doc);
  } catch (err) { next(err); }
};

// DELETE /api/documents/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only the owner can delete' });

    await Document.deleteOne({ _id: doc._id });
    await DocumentVersion.deleteMany({ documentId: doc._id });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

// POST /api/documents/:id/collaborators
exports.addCollaborator = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Owner only' });

    const { userId } = req.body;
    if (!doc.collaborators.map(c => c.toString()).includes(userId)) {
      doc.collaborators.push(userId);
      await doc.save();
    }
    res.json(doc);
  } catch (err) { next(err); }
};

// DELETE /api/documents/:id/collaborators/:userId
exports.removeCollaborator = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Owner only' });

    doc.collaborators = doc.collaborators.filter(
      c => c.toString() !== req.params.userId
    );
    await doc.save();
    res.json(doc);
  } catch (err) { next(err); }
};

// GET /api/documents/:id/versions
exports.getVersions = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.isAccessibleBy(req.user._id))
      return res.status(403).json({ error: 'Access denied' });

    const versions = await DocumentVersion.find({ documentId: doc._id })
      .sort({ versionNumber: -1 })
      .limit(50)
      .select('-yjsState')
      .lean();
    res.json(versions);
  } catch (err) { next(err); }
};

// POST /api/documents/:id/restore/:versionId
exports.restoreVersion = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.isEditableBy(req.user._id))
      return res.status(403).json({ error: 'Access denied' });

    const version = await DocumentVersion.findById(req.params.versionId);
    if (!version || version.documentId.toString() !== doc._id.toString())
      return res.status(404).json({ error: 'Version not found' });

    doc.content  = version.content;
    doc.yjsState = version.yjsState;
    await doc.save();

    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      io.to(doc._id.toString()).emit('document-restored', {
        content:   version.content,
        versionId: version._id,
      });
    }

    res.json({ message: 'Restored', version });
  } catch (err) { next(err); }
};