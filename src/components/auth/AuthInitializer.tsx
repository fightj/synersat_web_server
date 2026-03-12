"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export default function AuthInitializer() {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, []);

  return null; // UI 없음
}
