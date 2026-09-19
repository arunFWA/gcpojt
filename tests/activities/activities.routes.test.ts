import request from 'supertest';
import { createApp } from '../../src/app';

describe('Activities routes', () => {
  const app = createApp();

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('POST /api/activities creates a task, then GET /api/activities/:id returns it', async () => {
    const created = await request(app).post('/api/activities').send({
      storeId: 'store-1',
      title: 'Reset planogram - aisle 4',
      priority: 'MEDIUM',
      category: 'PLANOGRAM',
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const fetched = await request(app).get(`/api/activities/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.title).toBe('Reset planogram - aisle 4');
  });

  it('POST /api/activities with no title returns a 400 with a typed VALIDATION_ERROR body', async () => {
    const res = await request(app).post('/api/activities').send({
      storeId: 'store-1',
      priority: 'LOW',
      category: 'GENERAL',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/activities/:id for an unknown id returns a 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/activities/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Sprint-1 demo: PATCH /api/activities/bulk-status updates multiple tasks with partial failure', async () => {
    const t1 = await request(app).post('/api/activities').send({
      storeId: 'store-1',
      title: 'Audit backroom',
      priority: 'HIGH',
      category: 'AUDIT',
    });
    const t2 = await request(app).post('/api/activities').send({
      storeId: 'store-1',
      title: 'Compliance walk',
      priority: 'HIGH',
      category: 'COMPLIANCE',
    });

    const res = await request(app)
      .patch('/api/activities/bulk-status')
      .send({
        items: [
          { id: t1.body.data.id, status: 'DONE' },
          { id: t2.body.data.id, status: 'BLOCKED' },
          { id: 'missing-id', status: 'DONE' },
        ],
      });

    expect(res.status).toBe(207);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.failures).toEqual([{ id: 'missing-id', reason: 'NOT_FOUND' }]);
  });

  it('Sprint-1 demo: POST /api/activities/sla-sweep detects an overdue CRITICAL task', async () => {
    const created = await request(app).post('/api/activities').send({
      storeId: 'store-1',
      title: 'Fix freezer unit 3',
      priority: 'CRITICAL',
      category: 'COMPLIANCE',
      departmentLeadId: 'lead-9',
      dueDate: new Date(Date.now() - 60_000).toISOString(),
    });

    const sweep = await request(app).post('/api/activities/sla-sweep').send({});
    expect(sweep.status).toBe(200);
    expect(sweep.body.data.breached).toContain(created.body.data.id);
  });
});
