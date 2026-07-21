import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getAuth, AuthInfo } from "@/api/auth";

interface AuthState {
  user: AuthInfo | null;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      fetchUser: async () => {
        // ✅ 이미 있으면 API 호출 안 함
        if (get().user) return;

        set({ isLoading: true });
        try {
          const data = await getAuth();
          if (data && !Array.isArray(data.userAcct)) {
            data.userAcct = [data.userAcct as unknown as string];
          }
          set({ user: data });
        } catch {
          set({ user: null });
        } finally {
          set({ isLoading: false });
        }
      },

      clear: () => {
        set({ user: null });
      },
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.user && !Array.isArray(state.user.userAcct)) {
          state.user.userAcct = [state.user.userAcct as unknown as string];
        }
      },
    }
  )
);