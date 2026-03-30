import { ENV } from "../config/env";

export const BASE_URL = ENV.BASE_URL;

export const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

export function withTestUser(options: RequestInit = {}): RequestInit {
  const existingHeaders = new Headers(options.headers);
  existingHeaders.set("Authorization", ENV.USER_ROLE);
  return {
    ...options,
    headers: existingHeaders,
  };
}
