// config/env.ts

const isBrowser = typeof window !== "undefined";

const getBaseUrl = () => {
  // 1. 서버 사이드(SSR) 환경일 때 (Node.js 환경)
  // Route Handler나 Server Component에서 사용할 기본 백엔드 주소
  if (!isBrowser) {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://10.8.0.227:8080";
  }

  // 2. 브라우저 환경 (클라이언트 사이드)
  const hostname = window.location.hostname;

  // 로컬 개발 환경이거나 배포된 VPN망 사이트(229)에서 접속할 때
  if (
    hostname === "localhost" || 
    hostname === "127.0.0.1" || 
    hostname === "10.8.0.229"
  ) {
    return "http://10.8.0.227:8080";
  } 
  
  // 내부망 접속 시 (프론트 10.10.10.9 -> 백엔드 10.10.10.7)
  else if (hostname === "10.10.10.9") {
    return "http://10.10.10.7:8080";
  }

  // 그 외 기본값
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://10.8.0.227:8080";
};

export const ENV = {
  // 호출 시점에 getBaseUrl()이 실행되도록 getter 형식으로 설정하거나 
  // 상수로 즉시 할당 (단, 이 파일이 임포트되는 시점에 결정됨)
  BASE_URL: getBaseUrl(),
  APP_KEY: process.env.NEXT_PUBLIC_API_APP_KEY || "YOUR_DEFAULT_APP_KEY",
} as const;