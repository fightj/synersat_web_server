// Open-Meteo 기반 전 세계 바람 격자 데이터 fetch
// 15도 간격: 11×24 = 264 포인트 (API 키 불필요)

const LA1 = 75;   // top latitude
const LO1 = -180; // left longitude
const DX  = 15;   // longitude step
const DY  = 15;   // latitude step
export const NX = 24; // -180 to 165 inclusive
export const NY = 11; // 75 to -75 inclusive

export async function fetchWindGrid(): Promise<object[]> {
  const lats: number[] = [];
  const lons: number[] = [];

  for (let row = 0; row < NY; row++) {
    const lat = LA1 - row * DY;
    for (let col = 0; col < NX; col++) {
      lons.push(LO1 + col * DX);
      lats.push(lat);
    }
  }

  const url =
    "https://api.open-meteo.com/v1/forecast?" +
    `latitude=${lats.join(",")}&longitude=${lons.join(",")}&` +
    "current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=UTC";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

  const results: any[] = await res.json();

  const uData = new Array(NY * NX).fill(0) as number[];
  const vData = new Array(NY * NX).fill(0) as number[];

  results.forEach((pt: any, i: number) => {
    const speed = pt.current?.wind_speed_10m ?? 0;
    const rad   = ((pt.current?.wind_direction_10m ?? 0) * Math.PI) / 180;
    // 기상 방향(바람이 불어오는 방향) → 수학 벡터(바람이 향하는 방향)
    uData[i] = -speed * Math.sin(rad);
    vData[i] = -speed * Math.cos(rad);
  });

  const header = {
    parameterCategory: 2,
    lo1: LO1,
    la1: LA1,
    dx: DX,
    dy: DY,
    nx: NX,
    ny: NY,
  };

  return [
    { header: { ...header, parameterNumber: 2 }, data: uData },
    { header: { ...header, parameterNumber: 3 }, data: vData },
  ];
}
