const http     = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Client   = require('socket.io-client');
const jwt      = require('jsonwebtoken');
const app      = require('../src/app');
const { initSocket } = require('../src/socket');
const User     = require('../src/models/User');
const Document = require('../src/models/Document');

let server, io, clientA, clientB, docId, tokenA, tokenB;

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

const waitFor = (socket, event) =>
  new Promise((res) => socket.once(event, res));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Create two users
  const userA = await User.create({
    username: 'socketUserA', email: 'socketA@test.com', password: 'password123',
  });
  const userB = await User.create({
    username: 'socketUserB', email: 'socketB@test.com', password: 'password123',
  });

  tokenA = makeToken(userA._id);
  tokenB = makeToken(userB._id);

  // Create a shared document
  const doc = await Document.create({
    title: 'Socket Test Doc',
    ownerId: userA._id,
    collaborators: [userB._id],
  });
  docId = doc._id.toString();

  // Boot server
  server = http.createServer(app);
  io     = initSocket(server);
  await new Promise(res => server.listen(0, res));
  const { port } = server.address();
  const url = `http://localhost:${port}`;

  // Connect two clients
  clientA = Client(url, { auth: { token: tokenA }, forceNew: true });
  clientB = Client(url, { auth: { token: tokenB }, forceNew: true });

  await Promise.all([
    waitFor(clientA, 'connect'),
    waitFor(clientB, 'connect'),
  ]);
});

afterAll(async () => {
  clientA.disconnect();
  clientB.disconnect();
  await new Promise(res => server.close(res));
  await User.deleteMany({ email: /socketA@test|socketB@test/ });
  await Document.deleteMany({ title: 'Socket Test Doc' });
  await mongoose.connection.close();
});

describe('Socket.IO — join-document', () => {
  it('loads the document on join', async () => {
    clientA.emit('join-document', { documentId: docId });
    const payload = await waitFor(clientA, 'load-document');
    expect(payload.title).toBe('Socket Test Doc');
  });

  it('broadcasts user-joined to room members', async () => {
    // clientA already in room; clientB joins — clientA should hear user-joined
    const joinedPromise = waitFor(clientA, 'user-joined');
    clientB.emit('join-document', { documentId: docId });
    const { username } = await joinedPromise;
    expect(username).toBe('socketUserB');
  });
});

describe('Socket.IO — real-time changes', () => {
  it('broadcasts a Yjs update from A to B', async () => {
    const fakeUpdate = Buffer.from([1, 2, 3]).toString('base64');
    const changePromise = waitFor(clientB, 'receive-changes');
    clientA.emit('send-changes', { documentId: docId, update: fakeUpdate });
    const { update } = await changePromise;
    expect(update).toBe(fakeUpdate);
  });
});

describe('Socket.IO — cursor presence', () => {
  it('broadcasts cursor-move from A to B', async () => {
    const cursorPromise = waitFor(clientB, 'cursor-move');
    clientA.emit('cursor-move', { documentId: docId, position: { index: 10, length: 0 } });
    const payload = await cursorPromise;
    expect(payload.username).toBe('socketUserA');
    expect(payload.position.index).toBe(10);
  });
});

describe('Socket.IO — title change', () => {
  it('broadcasts title-changed from A to B', async () => {
    const titlePromise = waitFor(clientB, 'title-changed');
    clientA.emit('title-change', { documentId: docId, title: 'Updated Title' });
    const { title } = await titlePromise;
    expect(title).toBe('Updated Title');
  });
});

describe('Socket.IO — access control', () => {
  it('rejects join for a document the user cannot access', async () => {
    const stranger = await User.create({
      username: 'stranger', email: 'stranger@test.com', password: 'password123',
    });
    const strangerToken = makeToken(stranger._id);
    const strangerClient = Client(
      `http://localhost:${server.address().port}`,
      { auth: { token: strangerToken }, forceNew: true }
    );
    await waitFor(strangerClient, 'connect');

    strangerClient.emit('join-document', { documentId: docId });
    const { message } = await waitFor(strangerClient, 'error');
    expect(message).toMatch(/access denied/i);

    strangerClient.disconnect();
    await User.deleteOne({ email: 'stranger@test.com' });
  });
});
