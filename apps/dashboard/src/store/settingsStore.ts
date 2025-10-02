import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PriceVariationSettings } from '../types';

interface SettingsState {
  priceVariation: PriceVariationSettings;
  updatePriceVariationSettings: (settings: Partial<PriceVariationSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      priceVariation: {
        minPriceDifference: 5,
        historicalPeriodDays: 30,
        usePercentageBased: false,
        minPriceVariationPercentage: 2,
      },
      updatePriceVariationSettings: (settings) =>
        set((state) => ({
          priceVariation: {
            ...state.priceVariation,
            ...settings,
          },
        })),
    }),
    {
      name: 'settings-storage',
    }
  )
);