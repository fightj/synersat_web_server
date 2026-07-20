import { NextRequest, NextResponse } from 'next/server';

const INFLUX_HOST = 'http://10.10.10.20:8086';
const INFLUX_DB = 'wifiusage';
const TIMEOUT_MS = 10_000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get('user');
  const vesselImo = searchParams.get('vessel_imo');
  const startAt = searchParams.get('startAt');
  const endAt = searchParams.get('endAt');

  if (!vesselImo || !startAt || !endAt) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const formattedStart = startAt.endsWith('Z') ? startAt : `${startAt}Z`;
  const formattedEnd = endAt.endsWith('Z') ? endAt : `${endAt}Z`;

  const userCondition = user ? `AND "user"='${user}'` : '';

  const query = `SELECT SUM("in_bytes"), SUM("out_bytes"), SUM("total_bytes") FROM "wifi_usage" WHERE "vessel_imo"='${vesselImo}' ${userCondition} AND time >= '${formattedStart}' AND time <= '${formattedEnd}' GROUP BY time(1d), "user" ORDER BY time DESC`;

  const url = `${INFLUX_HOST}/query?db=${INFLUX_DB}&q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[crew/daily] InfluxDB error', res.status, body);
      return NextResponse.json(
        { error: 'InfluxDB query failed', detail: body },
        { status: res.status }
      );
    }

    const data = await res.json();

    const series = data?.results?.[0]?.series ?? [];

    const result = series.flatMap((s: any) => {
      const userName = s.tags?.user ?? 'unknown';
      return (s.values as any[][])
        .filter((row) => row[1] !== null || row[2] !== null || row[3] !== null)
        .map((row) => ({
          date: (row[0] as string).split('T')[0],
          user: userName,
          in_bytes: row[1] ?? 0,
          out_bytes: row[2] ?? 0,
          total_bytes: row[3] ?? 0,
        }));
    });

    return NextResponse.json(result);

  } catch (error: any) {
    clearTimeout(timer);
    const isTimeout = error.name === 'AbortError';

    console.error('[crew/daily]', isTimeout ? 'timeout' : 'fetch error', error.message);

    return NextResponse.json(
      {
        error: isTimeout ? 'InfluxDB connection timed out' : 'InfluxDB unreachable',
        detail: error.message,
      },
      { status: 503 }
    );
  }
}
