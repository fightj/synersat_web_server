export const ENV = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL, 
  USER_ROLE: process.env.NEXT_PUBLIC_USER_ROLE || "sktelink-admin"
} as const;

