const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../src/app');
const User     = require('../src/models/User');
const Document = require('../src/models/Document');

let token;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await request(app).post('/api/auth/register').send({
    username: 'docuser', email: 'docs@example.com', password: 'password123',
  });
  token = res.body.accessToken;
});

afterEach(async () => {
  await Document.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Document CRUD', () => {
  it('creates a document', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(auth())
      .send({ title: 'My Doc' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('My Doc');
  });

  it('lists own documents', async () => {
    await request(app).post('/api/documents').set(auth()).send({ title: 'Doc A' });
    await request(app).post('/api/documents').set(auth()).send({ title: 'Doc B' });
    const res = await request(app).get('/api/documents').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('gets a single document', async () => {
    const create = await request(app)
      .post('/api/documents').set(auth()).send({ title: 'Single' });
    const res = await request(app)
      .get(`/api/documents/${create.body._id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Single');
  });

  it('updates title', async () => {
    const create = await request(app)
      .post('/api/documents').set(auth()).send({ title: 'Old' });
    const res = await request(app)
      .patch(`/api/documents/${create.body._id}`)
      .set(auth())
      .send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
  });

  it('deletes a document', async () => {
    const create = await request(app)
      .post('/api/documents').set(auth()).send({ title: 'Delete me' });
    const res = await request(app)
      .delete(`/api/documents/${create.body._id}`).set(auth());
    expect(res.status).toBe(200);
    const check = await request(app)
      .get(`/api/documents/${create.body._id}`).set(auth());
    expect(check.status).toBe(404);
  });
});
