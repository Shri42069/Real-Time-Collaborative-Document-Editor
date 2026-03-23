const { Server }   = require('socket.io');
const jwt          = require('jsonwebtoken');
const Y            = require('yjs');
const User         = require('../models/User');
const Document     = require('../models/Document');
const logger       = require('../utils/logger');
const { markDirty } = require('../utils/snapshotJob');
const { activeWebSockets, documentEdits } = require('../utils/metrics');

let io;

// In-memory Yjs docs per room  { docId -> Y.Doc }
const yDocs = new Map();

function getYDoc(docId) {
  if (!yDocs.has(docId)) yDocs.set(docId, new Y.Doc());
  return yDocs.get(docId);
}

// Extract plain text from a Yjs doc for DB content field
function yjsDocToText(ydoc) {
  try {
    return ydoc.getText('quill').toString();
  } catch {
    return '';
  }
}

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.id).select('-password -refreshTokenHash');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user.username} (${socket.id})`);
    activeWebSockets.inc();

    // ── Join document room ────────────────────────────
    socket.on('join-document', async ({ documentId }) => {
      try {
        const doc = await Document.findById(documentId);
        if (!doc) return socket.emit('error', { message: 'Document not found' });
        if (!doc.isAccessibleBy(socket.user._id))
          return socket.emit('error', { message: 'Access denied' });

        socket.join(documentId);
        socket.currentDocId = documentId;

        const ydoc = getYDoc(documentId);

        // Seed Yjs doc from DB on first load into memory
        if (doc.yjsState && ydoc.store.clients.size === 0) {
          const state = new Uint8Array(doc.yjsState);
          Y.applyUpdate(ydoc, state);
        }

        const stateVector = Y.encodeStateAsUpdate(ydoc);
        socket.emit('load-document', {
          yjsUpdate: Buffer.from(stateVector).toString('base64'),
          content:   doc.content,
          title:     doc.title,
        });

        // Build active users list for this room
        const room = io.sockets.adapter.rooms.get(documentId);
        const activeUsers = [];
        if (room) {
          for (const sid of room) {
            const s = io.sockets.sockets.get(sid);
            if (s?.user) activeUsers.push({
              userId:   s.user._id,
              username: s.user.username,
              color:    s.user.color,
            });
          }
        }

        io.to(documentId).emit('user-joined', {
          userId:      socket.user._id,
          username:    socket.user.username,
          color:       socket.user.color,
          activeUsers,
        });

        logger.info(`${socket.user.username} joined document ${documentId}`);
      } catch (err) {
        logger.error('join-document error ' + err.message);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // ── Yjs update from client ────────────────────────
    socket.on('send-changes', async ({ documentId, update }) => {
      try {
        const ydoc = getYDoc(documentId);
        const updateBytes = Buffer.from(update, 'base64');
        Y.applyUpdate(ydoc, updateBytes);

        // Broadcast to all other clients in the room
        socket.to(documentId).emit('receive-changes', { update });

        // Persist both the binary Yjs state AND plain-text content
        const stateUpdate  = Y.encodeStateAsUpdate(ydoc);
        const plainContent = yjsDocToText(ydoc);

        await Document.findByIdAndUpdate(documentId, {
          yjsState: Buffer.from(stateUpdate),
          content:  plainContent,
        });

        markDirty(documentId);
        documentEdits.inc({ documentId });
      } catch (err) {
        logger.error('send-changes error ' + err.message);
      }
    });

    // ── Cursor presence ───────────────────────────────
    socket.on('cursor-move', ({ documentId, position }) => {
      socket.to(documentId).emit('cursor-move', {
        userId:   socket.user._id,
        username: socket.user.username,
        color:    socket.user.color,
        position,
      });
    });

    // ── Title change ──────────────────────────────────
    socket.on('title-change', async ({ documentId, title }) => {
      try {
        await Document.findByIdAndUpdate(documentId, { title });
        socket.to(documentId).emit('title-changed', { title });
      } catch (err) {
        logger.error('title-change error ' + err.message);
      }
    });

    // ── Disconnect ────────────────────────────────────
    socket.on('disconnect', () => {
      const docId = socket.currentDocId;
      if (docId) {
        socket.to(docId).emit('user-left', {
          userId:   socket.user._id,
          username: socket.user.username,
        });
      }
      activeWebSockets.dec();
      logger.info(`Socket disconnected: ${socket.user.username}`);
    });
  });

  return io;
}

function getIO() { return io; }

module.exports = { initSocket, getIO, getYDoc };