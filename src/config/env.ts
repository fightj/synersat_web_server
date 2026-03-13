export const ENV = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL, 
  USER_ROLE: process.env.USER_ROLE || "synersat-admin"
} as const;

