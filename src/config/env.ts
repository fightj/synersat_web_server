// config/env.ts

const isBrowser = typeof window !== "undefined";

const getBaseUrl = () => {
  // 서버 사이드 렌더링(SSR) 중이거나 브라우저 환경이 아닐 때 기본값
  if (!isBrowser) return process.env.NEXT_PUBLIC_API_BASE_URL || "http://10.10.10.7:8080";

  const hostname = window.location.hostname;

  // 1. VPN망 접속 시 (프론트 10.8.0.229 -> 백엔드 10.8.0.227)
  if (hostname === "10.8.0.229") {
    return "http://10.8.0.227:8080";
  } 
  // 2. 내부망 접속 시 (프론트 10.10.10.9 -> 백엔드 10.10.10.7)
  else if (hostname === "10.10.10.9") {
    return "http://10.10.10.7:8080";
  }
  // 3. 로컬 PC 개발 시 (localhost -> 백엔드 10.8.0.227 혹은 .7 중 선택)
  else if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://10.8.0.227:8080"; // 로컬에서 VPN 연결 상태라면 227이 유리
  }

  // 그 외 기본값 (공인 IP 등)
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://10.10.10.7:8080";
};

export const ENV = {
  BASE_URL: getBaseUrl(),
  APP_KEY: process.env.NEXT_PUBLIC_API_APP_KEY || "YOUR_DEFAULT_APP_KEY",
} as const;