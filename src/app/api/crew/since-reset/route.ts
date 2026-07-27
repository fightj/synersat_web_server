import { NextRequest, NextResponse } from 'next/server';

const INFLUX_HOST = process.env.INFLUX_HOST ?? 'http://10.10.10.20:8086';
const INFLUX_DB = 'wifiusage';
const TIMEOUT_MS = 15_000;

async function queryUser(
  vesselImo: string,
  userId: string,
  startAt: string,
  endAt: string,
): Promise<any[]> {
  const fmtStart = startAt.endsWith('Z') ? startAt : `${startAt}Z`;
  const fmtEnd = endAt.endsWith('Z') ? endAt : `${endAt}Z`;

  const query =
    `SELECT SUM("in_bytes"), SUM("out_bytes"), SUM("total_bytes") ` +
    `FROM "wifi_usage" ` +
    `WHERE "vessel_imo"='${vesselImo}' AND "user"='${userId}' ` +
    `AND time >= '${fmtStart}' AND time <= '${fmtEnd}' ` +
    `GROUP BY time(1d), "user" ORDER BY time DESC`;

  const url = `${INFLUX_HOST}/query?db=${INFLUX_DB}&q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[crew/since-reset] InfluxDB error for "${userId}":`, res.status);
      return [];
    }

    const data = await res.json();
    const series: any[] = data?.results?.[0]?.series ?? [];

    return series.flatMap((s) => {
      const user: string = s.tags?.user ?? userId;
      return (s.values as any[][])
        .filter((row) => row[1] !== null || row[2] !== null || row[3] !== null)
        .map((row) => ({
          date: (row[0] as string).split('T')[0],
          user,
          in_bytes: row[1] ?? 0,
          out_bytes: row[2] ?? 0,
          total_bytes: row[3] ?? 0,
        }));
    });
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name !== 'AbortError') {
      console.error(`[crew/since-reset] fetch error for "${userId}":`, error.message);
    }
    return [];
  }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vesselImo, users, resetMap = {} } = body as {
    vesselImo: string;
    users: string[];
    resetMap?: Record<string, string>; // userId → ISO timestamp (reset 시각)
  };

  if (!vesselImo || !Array.isArray(users) || users.length === 0) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const now = new Date();
  const endAt = now.toISOString().slice(0, 19);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);

  // 유저별로 개별 startAt 결정 후 병렬 쿼리
  const results = await Promise.all(
    users.map((userId) => {
      const startAt = resetMap[userId] ?? oneYearAgo;
      return queryUser(vesselImo, userId, startAt, endAt);
    }),
  );

  return NextResponse.json(results.flat());
}
