const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../src/app');
const User     = require('../src/models/User');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email:    'test@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'user1', email: 'dup@example.com', password: 'password123',
    });
    const res = await request(app).post('/api/auth/register').send({
      username: 'user2', email: 'dup@example.com', password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'user3', email: 'short@example.com', password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      username: 'loginuser', email: 'login@example.com', password: 'password123',
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com', password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com', password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/profile', () => {
  it('returns profile with valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      username: 'profileuser', email: 'profile@example.com', password: 'password123',
    });
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('profile@example.com');
  });

  it('rejects missing token', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });
});
