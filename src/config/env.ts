export const ENV = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  APP_KEY: process.env.NEXT_PUBLIC_API_APP_KEY || "",
} as const