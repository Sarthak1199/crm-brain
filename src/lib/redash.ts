const BASE_URL = process.env.REDASH_BASE_URL;
const API_KEY = process.env.REDASH_API_KEY;

export type RedashRow = Record<string, string | number | boolean | null>;

type JobResponse = {
  job: {
    id: string;
    status: number; // 1=waiting, 2=started, 3=success, 4=failed
    error: string;
    query_result_id: number | null;
  };
};

type ResultResponse = {
  query_result: {
    id: number;
    data: {
      columns: { name: string; type: string }[];
      rows: RedashRow[];
    };
  };
};

function requireConfig() {
  if (!BASE_URL || !API_KEY) {
    throw new Error(
      "Redash is not configured. Set REDASH_BASE_URL and REDASH_API_KEY in .env."
    );
  }
  return { BASE_URL, API_KEY };
}

// Redash queries against live production tables can legitimately take over a
// minute for wide date ranges — 90 attempts at 2s apiece gives ~3 minutes of
// headroom before giving up.
async function pollJob(jobId: string, base: string, apiKey: string): Promise<number> {
  for (let attempt = 0; attempt < 90; attempt++) {
    const res = await fetch(`${base}/api/jobs/${jobId}?api_key=${apiKey}`, {
      cache: "no-store",
    });
    const body = (await res.json()) as JobResponse;
    if (body.job.status === 3 && body.job.query_result_id) {
      return body.job.query_result_id;
    }
    if (body.job.status === 4) {
      throw new Error(`Redash job failed: ${body.job.error}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Redash job ${jobId} timed out`);
}

/**
 * Executes a saved Redash query by id and returns its result rows.
 * Uses the query's cached result when younger than `maxAgeSeconds`,
 * otherwise triggers a fresh run and polls until it completes.
 */
export async function runRedashQuery(
  queryId: number,
  parameters: Record<string, unknown> = {},
  maxAgeSeconds = 900
): Promise<RedashRow[]> {
  const { BASE_URL: base, API_KEY: apiKey } = requireConfig();

  const res = await fetch(`${base}/api/queries/${queryId}/results?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parameters, max_age: maxAgeSeconds }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Redash query ${queryId} request failed: ${res.status}`);
  }

  const body = (await res.json()) as JobResponse | ResultResponse;

  let resultId: number;
  if ("query_result" in body) {
    resultId = body.query_result.id;
  } else {
    resultId = await pollJob(body.job.id, base, apiKey);
  }

  const resultRes = await fetch(`${base}/api/query_results/${resultId}?api_key=${apiKey}`, {
    cache: "no-store",
  });
  if (!resultRes.ok) {
    throw new Error(`Failed to fetch Redash result ${resultId}: ${resultRes.status}`);
  }
  const resultBody = (await resultRes.json()) as ResultResponse;
  return resultBody.query_result.data.rows;
}

export function isRedashConfigured() {
  return !!BASE_URL && !!API_KEY;
}
