import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let runsDir: string;

const line = (job: string, status: string, at: string) =>
  JSON.stringify({ at, job, status, owner: 'rook' });

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  mkdirSync(runsDir, { recursive: true });
  writeFileSync(
    join(runsDir, '2026-01-02.jsonl'),
    [line('a/job', 'ok', '2026-01-02T01:00:00+01:00'), line('b/job', 'fail', '2026-01-02T02:00:00+01:00')].join('\n') + '\n',
  );
  writeFileSync(join(runsDir, '2026-01-03.jsonl'), '');
  writeFileSync(
    join(runsDir, '2026-01-04.jsonl'),
    [line('a/job', 'ok', '2026-01-04T01:00:00+01:00'), '{this is not json', line('b/job', 'retry', '2026-01-04T02:00:00+01:00')].join('\n') + '\n',
  );
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

const app = () =>
  createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });

describe('GET /digest/:night', () => {
  it('200 for a night with a file', async () => {
    const res = await app().request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
  });

  it('404 for a night with no file', async () => {
    const res = await app().request('/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for the empty night', async () => {
    const res = await app().request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still 200 when a line does not parse', async () => {
    const res = await app().request('/digest/2026-01-04');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
  });

  it.each(['yesterday', '2026-1-5', '20260105'])('404 for a :night that is not a date (%s)', async (night) => {
    const res = await app().request(`/digest/${night}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with rows for a night with a file', async () => {
    const res = await app().request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[] };
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
  });

  it('404 for a night with no file', async () => {
    const res = await app().request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('has rows: [] for the empty night', async () => {
    const res = await app().request('/api/digest/2026-01-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: unknown[] };
    expect(body.rows).toEqual([]);
  });

  it('still 200 when a line does not parse, and counts it', async () => {
    const res = await app().request('/api/digest/2026-01-04');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: unknown[]; badLines: number };
    expect(body.rows).toHaveLength(2);
    expect(body.badLines).toBe(1);
  });

  it.each(['yesterday', '2026-1-5', '20260105'])('404 for a :night that is not a date (%s)', async (night) => {
    const res = await app().request(`/api/digest/${night}`);
    expect(res.status).toBe(404);
  });
});
