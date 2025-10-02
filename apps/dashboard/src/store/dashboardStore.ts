import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RestaurantComparison {
  id: string;
  name: string;
  description?: string;
  restaurantIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardConfig {
  // Restaurant comparison groups
  restaurantComparisons: RestaurantComparison[];
  
  // Dashboard preferences
  showPriceAlerts: boolean;
  showInefficientProducts: boolean;
  showSupplierConsolidation: boolean;
  showProductTargets: boolean;
  
  // KPI thresholds
  inefficientProductThreshold: number; // percentage difference to flag as inefficient
  priceAlertThreshold: number; // price difference threshold for alerts
  timeBasedEfficiencyThreshold: number; // minimum data points required for time-based analysis
  volatilityThreshold: number; // volatility threshold for flagging products
  
  // Last refresh time
  lastRefreshTime?: Date;
}

interface DashboardState extends DashboardConfig {
  // Actions
  addRestaurantComparison: (comparison: Omit<RestaurantComparison, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRestaurantComparison: (id: string, comparison: Partial<RestaurantComparison>) => void;
  removeRestaurantComparison: (id: string) => void;
  
  // Dashboard config actions
  updateDashboardConfig: (config: Partial<DashboardConfig>) => void;
  toggleDashboardSection: (section: keyof Pick<DashboardConfig, 'showPriceAlerts' | 'showInefficientProducts' | 'showSupplierConsolidation' | 'showProductTargets'>) => void;
  
  // Utility functions
  getComparisonById: (id: string) => RestaurantComparison | undefined;
  getComparisonsByRestaurantId: (restaurantId: string) => RestaurantComparison[];
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Default state
      restaurantComparisons: [],
      showPriceAlerts: true,
      showInefficientProducts: true,
      showSupplierConsolidation: true,
      showProductTargets: true,
      inefficientProductThreshold: 20, // 20% difference
      priceAlertThreshold: 10, // 10% difference
      timeBasedEfficiencyThreshold: 3, // minimum 3 data points for trend analysis
      volatilityThreshold: 20, // 20% volatility threshold
      
      // Actions
      addRestaurantComparison: (comparison) => {
        const newComparison: RestaurantComparison = {
          ...comparison,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          restaurantComparisons: [...state.restaurantComparisons, newComparison],
        }));
      },
      
      updateRestaurantComparison: (id, updates) => {
        set((state) => ({
          restaurantComparisons: state.restaurantComparisons.map((comp) =>
            comp.id === id
              ? { ...comp, ...updates, updatedAt: new Date() }
              : comp
          ),
        }));
      },
      
      removeRestaurantComparison: (id) => {
        set((state) => ({
          restaurantComparisons: state.restaurantComparisons.filter((comp) => comp.id !== id),
        }));
      },
      
      updateDashboardConfig: (config) => {
        set((state) => ({
          ...state,
          ...config,
        }));
      },
      
      toggleDashboardSection: (section) => {
        set((state) => ({
          [section]: !state[section],
        }));
      },
      
      // Utility functions
      getComparisonById: (id) => {
        return get().restaurantComparisons.find((comp) => comp.id === id);
      },
      
      getComparisonsByRestaurantId: (restaurantId) => {
        return get().restaurantComparisons.filter((comp) =>
          comp.restaurantIds.includes(restaurantId)
        );
      },
    }),
    {
      name: 'dashboard-config',
    }
  )
); 