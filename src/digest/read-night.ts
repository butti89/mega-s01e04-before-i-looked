import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunStatus, StatusCounts } from './types.js';

type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error: string | null;
};

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

function isRunStatus(value: unknown): value is RunStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

// Returns null for anything that is not a well-formed run line: bad JSON, a missing or
// mistyped field. `owner` must be present but may be null; `error` may be absent.
export function parseRunLine(text: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string' || o.job === '') return null;
  if (!isRunStatus(o.status)) return null;
  if (!('owner' in o) || (o.owner !== null && typeof o.owner !== 'string')) return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return { at: o.at, job: o.job, status: o.status, owner: o.owner, error: o.error ?? null };
}

// Lines are taken in file order: the log is appended as jobs run, so a later line is a
// later attempt. A job's owner, last status and times come from its lines in that order.
export const readNight: ReadNight = (runsDir, night) => {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { found: false };
    throw err;
  }

  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseRunLine(raw);
    if (line === null) {
      badLines += 1;
      continue;
    }
    counts[line.status] += 1;
    const row = byJob.get(line.job);
    if (row === undefined) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    row.owner = line.owner;
    row.runs += 1;
    if (line.status === 'retry') row.retries += 1;
    row.lastStatus = line.status;
    if (line.error !== null) row.lastError = line.error;
    row.lastAt = line.at;
  }

  // Code-unit order, not locale order, so the page and the JSON sort the same everywhere.
  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { found: true, rows, counts, badLines };
};
