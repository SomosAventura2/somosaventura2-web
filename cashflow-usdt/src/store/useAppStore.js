import { create } from 'zustand'

export const useAppStore = create((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  /** Incrementar tras guardar operación para que el dashboard vuelva a cargar datos. */
  dashboardNonce: 0,
  bumpDashboard: () => set((s) => ({ dashboardNonce: s.dashboardNonce + 1 })),
}))
