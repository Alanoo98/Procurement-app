import React from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { useMappingStore } from '@/store/mappingStore';
import { RestaurantConfig } from '../../../types';

export const CurrencySettings: React.FC = () => {
  const {
    restaurantConfigs,
    addRestaurantConfig,
    removeRestaurantConfig,
    updateRestaurantConfig,
    refreshData,
  } = useMappingStore();

  const handleAddNewRestaurantConfig = () => {
    const newConfig: RestaurantConfig = {
      id: Date.now().toString(),
      name: '',
      currency: { code: '', symbol: '' },
    };
    addRestaurantConfig(newConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Restaurant Currencies</h2>
        <div className="flex gap-2">
          <button
            onClick={refreshData}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
          <button
            onClick={handleAddNewRestaurantConfig}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {restaurantConfigs.map((config) => (
          <div key={config.id} className="bg-white shadow rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                value={config.name}
                onChange={(e) =>
                  updateRestaurantConfig({ ...config, name: e.target.value })
                }
                placeholder="Restaurant Name"
                className="border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="text"
                value={config.currency.code}
                onChange={(e) =>
                  updateRestaurantConfig({
                    ...config,
                    currency: { ...config.currency, code: e.target.value },
                  })
                }
                placeholder="Currency Code (e.g., DKK)"
                className="border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="text"
                value={config.currency.symbol}
                onChange={(e) =>
                  updateRestaurantConfig({
                    ...config,
                    currency: { ...config.currency, symbol: e.target.value },
                  })
                }
                placeholder="Currency Symbol (e.g., kr.)"
                className="border-gray-300 rounded-md shadow-sm focus:ring-emeral-500 focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => removeRestaurantConfig(config.id)}
              className="mt-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

