import request from 'supertest';
import { createApp } from '../../src/app';

describe('Shared error handling contract', () => {
  const app = createApp();

  it('DELETE on an unknown activity returns 404 NOT_FOUND, never a raw 500', async () => {
    const res = await request(app).delete('/api/activities/unknown-id');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('Staff auth', () => {
  const app = createApp();

  it('logs in a known demo user', async () => {
    const res = await request(app).post('/api/staff/login').send({ userId: 'demo-user' });
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe('demo-user');
  });

  it('rejects an unknown user with 401 UNAUTHORIZED', async () => {
    const res = await request(app).post('/api/staff/login').send({ userId: 'ghost' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
