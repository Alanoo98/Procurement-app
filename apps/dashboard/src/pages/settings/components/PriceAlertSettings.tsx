import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

export const PriceAlertSettings: React.FC = () => {
  const { priceVariation, updatePriceVariationSettings } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Price Alert Settings</h2>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="text-sm text-gray-500">Configure price variation detection</span>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Alert Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Alert Detection Method
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="alertType"
                checked={!priceVariation.usePercentageBased}
                onChange={() => updatePriceVariationSettings({ usePercentageBased: false })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Fixed Amount (kr.)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="alertType"
                checked={priceVariation.usePercentageBased}
                onChange={() => updatePriceVariationSettings({ usePercentageBased: true })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Percentage (%)</span>
            </label>
          </div>
        </div>

        {/* Fixed Amount Settings */}
        {!priceVariation.usePercentageBased && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Price Difference (kr.)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={priceVariation.minPriceDifference}
                onChange={(e) => updatePriceVariationSettings({
                  minPriceDifference: Number(e.target.value)
                })}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 min-w-[60px]">
                {priceVariation.minPriceDifference} kr.
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Minimum price difference to trigger a price alert
            </p>
          </div>
        )}

        {/* Percentage Settings */}
        {priceVariation.usePercentageBased && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Price Variation (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.1"
                max="50"
                step="0.1"
                value={priceVariation.minPriceVariationPercentage}
                onChange={(e) => updatePriceVariationSettings({
                  minPriceVariationPercentage: Number(e.target.value)
                })}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 min-w-[60px]">
                {priceVariation.minPriceVariationPercentage}%
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Minimum percentage variation to trigger a price alert
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Historical Period (days)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="120"
              step="1"
              value={priceVariation.historicalPeriodDays}
              onChange={(e) => updatePriceVariationSettings({
                historicalPeriodDays: Number(e.target.value)
              })}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-900 min-w-[60px]">
              {priceVariation.historicalPeriodDays} days
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Period to consider for historical price variations
          </p>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Price Alert Rules</h4>
              <ul className="mt-2 text-sm text-amber-700 space-y-1">
                <li>• Price variations are compared across all historical data within the set period</li>
                <li>• Only prices for the same unit type are compared</li>
                <li>• {priceVariation.usePercentageBased ? 'Percentage-based alerts compare current price to previous prices' : 'Fixed amount alerts compare prices on the same day'}</li>
                <li>• Historical variations within the set period are shown as subtle indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

