import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ResolvedAlert {
  id: string;
  resolvedAt: Date;
  reason: string;
  note?: string;
}

interface AlertState {
  resolvedAlerts: ResolvedAlert[];
  resolveAlert: (alert: ResolvedAlert) => void;
  unresolveAlert: (alertId: string) => void;
  isResolved: (alertId: string) => boolean;
  getResolution: (alertId: string) => ResolvedAlert | undefined;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      resolvedAlerts: [],
      resolveAlert: (alert) =>
        set((state) => ({
          resolvedAlerts: [...state.resolvedAlerts, alert],
        })),
      unresolveAlert: (alertId) =>
        set((state) => ({
          resolvedAlerts: state.resolvedAlerts.filter((a) => a.id !== alertId),
        })),
      isResolved: (alertId) =>
        get().resolvedAlerts.some((a) => a.id === alertId),
      getResolution: (alertId) =>
        get().resolvedAlerts.find((a) => a.id === alertId),
    }),
    {
      name: 'alert-storage',
    }
  )
);