import request from 'supertest';
import { createApp } from '../../src/app';

describe('Programmes routes', () => {
  const app = createApp();

  it('creates a programme and adds a member to it', async () => {
    const created = await request(app).post('/api/programmes').send({
      storeId: 'store-1',
      name: 'Holiday Rollout',
    });
    expect(created.status).toBe(201);

    const addMember = await request(app)
      .post(`/api/programmes/${created.body.data.id}/members`)
      .send({ userId: 'user-1', role: 'ASSOCIATE' });
    expect(addMember.status).toBe(201);
    expect(addMember.body.data.members).toHaveLength(1);
  });

  it('rejects duplicate membership', async () => {
    const created = await request(app).post('/api/programmes').send({
      storeId: 'store-1',
      name: 'Store Refit',
    });
    await request(app)
      .post(`/api/programmes/${created.body.data.id}/members`)
      .send({ userId: 'user-2', role: 'ASSOCIATE' });
    const dup = await request(app)
      .post(`/api/programmes/${created.body.data.id}/members`)
      .send({ userId: 'user-2', role: 'ASSOCIATE' });
    expect(dup.status).toBe(400);
  });
});
