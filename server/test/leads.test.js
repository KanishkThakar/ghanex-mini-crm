import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db.js';

async function withServer(run) {
  const db = openDatabase(':memory:');
  const server = createApp(db).listen(0);
  const { port } = server.address();
  try {
    await run({ base: `http://127.0.0.1:${port}` });
  } finally {
    server.close();
    db.close();
  }
}

const sample = {
  name: 'Test Lead',
  email: 'Test.Lead@Example.com',
  phone: '+91 90000 00000',
  company: 'Example Co',
  source: 'Website',
  status: 'New',
  notes: 'Came from the pricing page',
  value: 25000,
};

const post = (base, body) =>
  fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('creates a lead and normalises the email', async () => {
  await withServer(async ({ base }) => {
    const res = await post(base, sample);
    assert.equal(res.status, 201);
    const { data } = await res.json();
    assert.equal(data.email, 'test.lead@example.com');
    assert.equal(data.status, 'New');
    assert.equal(data.value, 25000);
    assert.ok(data.id > 0);
    assert.ok(data.createdAt);
  });
});

test('rejects an invalid email with field-level details', async () => {
  await withServer(async ({ base }) => {
    const res = await post(base, { ...sample, email: 'not-an-email' });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.details.email, 'Enter a valid email address');
  });
});

test('rejects an unknown status', async () => {
  await withServer(async ({ base }) => {
    const res = await post(base, { ...sample, status: 'Lost' });
    assert.equal(res.status, 422);
    assert.ok((await res.json()).error.details.status);
  });
});

test('lists, searches and filters leads', async () => {
  await withServer(async ({ base }) => {
    await post(base, sample);
    await post(base, { ...sample, name: 'Second Lead', email: 'second@example.com', status: 'Qualified', company: 'Other Co' });

    const all = await (await fetch(`${base}/api/leads`)).json();
    assert.equal(all.total, 2);

    const search = await (await fetch(`${base}/api/leads?search=other`)).json();
    assert.equal(search.total, 1);
    assert.equal(search.data[0].name, 'Second Lead');

    const filtered = await (await fetch(`${base}/api/leads?status=Qualified`)).json();
    assert.equal(filtered.total, 1);

    const paged = await (await fetch(`${base}/api/leads?limit=1&offset=1`)).json();
    assert.equal(paged.data.length, 1);
    assert.equal(paged.total, 2);
  });
});

test('reads, updates and deletes one lead', async () => {
  await withServer(async ({ base }) => {
    const created = await (await post(base, sample)).json();
    const id = created.data.id;

    const one = await (await fetch(`${base}/api/leads/${id}`)).json();
    assert.equal(one.data.name, 'Test Lead');

    await new Promise((r) => setTimeout(r, 5));
    const patched = await fetch(`${base}/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'Converted', value: 40000 }),
    });
    assert.equal(patched.status, 200);
    const updated = (await patched.json()).data;
    assert.equal(updated.status, 'Converted');
    assert.equal(updated.value, 40000);
    assert.equal(updated.name, 'Test Lead');
    assert.notEqual(updated.updatedAt, updated.createdAt);

    const del = await fetch(`${base}/api/leads/${id}`, { method: 'DELETE' });
    assert.equal(del.status, 204);

    const gone = await fetch(`${base}/api/leads/${id}`);
    assert.equal(gone.status, 404);
  });
});

test('update and delete of a missing lead answer 404', async () => {
  await withServer(async ({ base }) => {
    const patched = await fetch(`${base}/api/leads/999`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'Contacted' }),
    });
    assert.equal(patched.status, 404);
    const del = await fetch(`${base}/api/leads/999`, { method: 'DELETE' });
    assert.equal(del.status, 404);
  });
});

test('stats count leads by status and compute conversion', async () => {
  await withServer(async ({ base }) => {
    await post(base, sample);
    await post(base, { ...sample, email: 'b@example.com', status: 'Converted', value: 100000 });
    await post(base, { ...sample, email: 'c@example.com', status: 'Converted', value: 50000 });

    const { data } = await (await fetch(`${base}/api/stats`)).json();
    assert.equal(data.total, 3);
    assert.equal(data.byStatus.New, 1);
    assert.equal(data.byStatus.Converted, 2);
    assert.equal(data.byStatus.Qualified, 0);
    assert.equal(data.conversionRate, 66.7);
    assert.equal(data.pipelineValue, 175000);
    assert.equal(data.bySource[0].source, 'Website');
  });
});

test('unknown api route answers json 404', async () => {
  await withServer(async ({ base }) => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.message, 'Endpoint not found');
  });
});
