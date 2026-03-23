const cron            = require('node-cron');
const Document        = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const logger          = require('./logger');

const INTERVAL         = parseInt(process.env.SNAPSHOT_INTERVAL || '30');
const MAX_VERSIONS     = parseInt(process.env.MAX_VERSIONS_PER_DOC || '50');

// Track which docs were recently edited  { docId -> lastEditedAt }
const dirtyDocs = new Map();

function markDirty(docId) {
  dirtyDocs.set(docId.toString(), Date.now());
}

async function takeSnapshots() {
  if (dirtyDocs.size === 0) return;

  const ids = [...dirtyDocs.keys()];
  dirtyDocs.clear();

  for (const docId of ids) {
    try {
      const doc = await Document.findById(docId);
      if (!doc) continue;

      const lastVersion = await DocumentVersion.findOne(
        { documentId: docId },
        {},
        { sort: { versionNumber: -1 } }
      );
      const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      await DocumentVersion.create({
        documentId:    docId,
        content:       doc.content,
        yjsState:      doc.yjsState,
        versionNumber,
      });

      // Prune old versions beyond MAX_VERSIONS
      const count = await DocumentVersion.countDocuments({ documentId: docId });
      if (count > MAX_VERSIONS) {
        const oldest = await DocumentVersion.find({ documentId: docId })
          .sort({ versionNumber: 1 })
          .limit(count - MAX_VERSIONS)
          .select('_id');
        await DocumentVersion.deleteMany({ _id: { $in: oldest.map(v => v._id) } });
      }

      logger.debug(`Snapshot v${versionNumber} saved for doc ${docId}`);
    } catch (err) {
      logger.error(`Snapshot failed for doc ${docId}: ${err.message}`);
    }
  }
}

function startSnapshotJob() {
  cron.schedule(`*/${INTERVAL} * * * * *`, takeSnapshots);
  logger.info(`Snapshot job started — every ${INTERVAL}s`);
}

module.exports = { startSnapshotJob, markDirty };
