import { describe, expect, it } from 'vitest';
import { parseRunLine, readNight } from '../src/digest/read-night.js';

describe('readNight', () => {
  it('reads 2026-10-28 into one row per job, sorted by job', () => {
    const night = readNight('runs', '2026-10-28');
    if (!night.found) throw new Error('night not found');
    expect(night.badLines).toBe(1);
    expect(night.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(
      night.rows.map(({ job, owner, runs, retries, lastStatus, lastError }) => ({
        job,
        owner,
        runs,
        retries,
        lastStatus,
        lastError,
      })),
    ).toEqual([
      { job: 'digest/render', owner: null, runs: 1, retries: 0, lastStatus: 'ok', lastError: null },
      { job: 'fixtures/refresh', owner: 'rook', runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503' },
      { job: 'lane/sync', owner: 'rook', runs: 8, retries: 1, lastStatus: 'ok', lastError: 'lock held' },
      { job: 'notes/backup', owner: 'lane-07', runs: 1, retries: 0, lastStatus: 'fail', lastError: 'quota exceeded' },
      { job: 'rig/rotate-logs', owner: 'lane-07', runs: 1, retries: 0, lastStatus: 'ok', lastError: null },
    ]);
  });

  it('keeps times as the log wrote them', () => {
    const night = readNight('runs', '2026-10-28');
    if (!night.found) throw new Error('night not found');
    const fixtures = night.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fixtures?.firstAt).toBe('2026-10-29T01:30:00+01:00');
    expect(fixtures?.lastAt).toBe('2026-10-29T01:37:00+01:00');
  });

  it('counts 2026-10-27 with no bad lines', () => {
    const night = readNight('runs', '2026-10-27');
    if (!night.found) throw new Error('night not found');
    expect(night.counts).toEqual({ ok: 7, retry: 0, fail: 0 });
    expect(night.badLines).toBe(0);
  });

  it('reports a missing night as not found', () => {
    expect(readNight('runs', '1999-01-01')).toEqual({ found: false });
  });
});

describe('parseRunLine', () => {
  it('rejects malformed lines', () => {
    expect(parseRunLine('{"at":"x","job":"lane/sy')).toBeNull();
    expect(parseRunLine('{"at":"x","job":"a","status":"skipped","owner":"r"}')).toBeNull();
    expect(parseRunLine('{"at":"x","job":"a","status":"ok"}')).toBeNull();
    expect(parseRunLine('[]')).toBeNull();
  });

  it('keeps a null owner and defaults a missing error to null', () => {
    expect(parseRunLine('{"at":"x","job":"a","status":"ok","owner":null}')).toEqual({
      at: 'x',
      job: 'a',
      status: 'ok',
      owner: null,
      error: null,
    });
  });
});
