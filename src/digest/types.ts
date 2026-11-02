// The night's run log is runs/<night>.jsonl: one JSON object per line with `at`, `job`,
// `status`, `owner` and an optional `error`.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null;
  // Every line for the job that parses; each attempt counts.
  runs: number;
  // Lines for the job with status `retry`.
  retries: number;
  lastStatus: RunStatus;
  // The most recent error seen for the job, even when its last status is `ok`.
  lastError: string | null;
  // Times as the log wrote them, offset included; never converted to UTC.
  firstAt: string;
  lastAt: string;
};

// The night's parsed lines counted by status.
export type StatusCounts = Record<RunStatus, number>;

export type Night =
  | { found: false }
  | {
      found: true;
      rows: DigestRow[];
      counts: StatusCounts;
      // Lines that did not parse; counted, never thrown.
      badLines: number;
    };

// `found: false` means runs/<night>.jsonl does not exist. An empty file is `found: true`
// with no rows.
export type ReadNight = (runsDir: string, night: string) => Night;
