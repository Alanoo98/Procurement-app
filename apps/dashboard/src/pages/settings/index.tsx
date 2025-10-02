import React, { useState } from 'react';
import { AlertTriangle, SettingsIcon, Link } from 'lucide-react';
import { PriceAlertSettings } from './components/PriceAlertSettings';
import { CurrencySettings } from './components/CurrencySettings';
import { MappingSettings } from './components/MappingSettings';
import { PendingMappingsSettings } from './components/PendingMappingsSettings';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'price-alerts' | 'locations' | 'standardization' | 'currencies' | 'mappings' | 'pending'>('price-alerts');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure mappings and system settings
        </p>
      </div>

      <div className="mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          {[
            { key: 'price-alerts', label: 'Price Alerts', icon: AlertTriangle },
            { key: 'mappings', label: 'Mappings', icon: Link },
            { key: 'pending', label: 'Pending', icon: AlertTriangle },
            { key: 'currencies', label: 'Currencies', icon: SettingsIcon },
          ]
          .map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-2 text-sm font-medium rounded-md inline-flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'price-alerts' && <PriceAlertSettings />}
      {activeTab === 'currencies' && <CurrencySettings />}
      {activeTab === 'mappings' && <MappingSettings />}
      {activeTab === 'pending' && <PendingMappingsSettings />}
    </div>
  );
};

