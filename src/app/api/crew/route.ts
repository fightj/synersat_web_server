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

  // 1. 필수 파라미터 체크
  if (!user || !vesselImo || !startAt || !endAt) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }


  const formattedStart = startAt.endsWith('Z') ? startAt : `${startAt}Z`;
  const formattedEnd = endAt.endsWith('Z') ? endAt : `${endAt}Z`;

  const query = `SELECT * FROM "wifi_usage" WHERE "user"='${user}' AND "vessel_imo"='${vesselImo}' AND time >= '${formattedStart}' AND time <= '${formattedEnd}' ORDER BY time DESC`;

  const url = `${INFLUX_HOST}/query?db=${INFLUX_DB}&q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store' // 실시간 데이터를 위해 캐시 비활성화 추천
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[crew/route] InfluxDB error', res.status, body);
      return NextResponse.json(
        { error: 'InfluxDB query failed', detail: body },
        { status: res.status }
      );
    }

    const data = await res.json();

    // InfluxDB는 데이터가 없어도 200 OK를 반환하므로 결과 구조 확인이 필요할 수 있습니다.
    return NextResponse.json(data);

  } catch (error: any) {
    clearTimeout(timer);
    const isTimeout = error.name === 'AbortError';

    console.error('[crew/route]', isTimeout ? 'timeout' : 'fetch error', error.message);

    return NextResponse.json(
      {
        error: isTimeout ? 'InfluxDB connection timed out' : 'InfluxDB unreachable',
        detail: error.message
      },
      { status: 503 }
    );
  }
}