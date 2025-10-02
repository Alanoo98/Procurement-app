import React, { useState } from 'react';
import { Settings, Save, X, Bell, Layers, Wrench } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
// import { useLocationComparisons } from '@/hooks/useRestaurantComparisons';
import { LocationComparisonManager } from './RestaurantComparisonManager';

interface DashboardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'sections', label: 'Dashboard Sections', icon: Layers },
  { id: 'alerts', label: 'Alert Settings', icon: Bell },
  { id: 'advanced', label: 'Advanced', icon: Wrench },
];

type SectionKey = 'showPriceAlerts' | 'showInefficientProducts' | 'showProductTargets';

export const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    showPriceAlerts,
    showInefficientProducts,
    showProductTargets,
    inefficientProductThreshold,
    priceAlertThreshold,
    updateDashboardConfig,
    toggleDashboardSection,
  } = useDashboardStore();
  // const { comparisonGroups } = useLocationComparisons(); // not used in new UI

  const [showComparisonManager, setShowComparisonManager] = useState(false);
  const [thresholds, setThresholds] = useState({
    inefficientProduct: inefficientProductThreshold,
    priceAlert: priceAlertThreshold,
  });
  const [activeTab, setActiveTab] = useState('sections');

  const handleSaveThresholds = () => {
    updateDashboardConfig({
      inefficientProductThreshold: thresholds.inefficientProduct,
      priceAlertThreshold: thresholds.priceAlert,
    });
  };

  const handleToggleSection = (section: SectionKey) => {
    toggleDashboardSection(section);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Dashboard Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-gray-50">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-emerald-600'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Dashboard Sections Tab */}
            {activeTab === 'sections' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Show/Hide Dashboard Sections</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Section toggles as cards */}
                  {[{
                    key: 'showPriceAlerts',
                    label: 'Price Alerts',
                    desc: 'Show price variation alerts and potential savings',
                    enabled: showPriceAlerts
                  }, {
                    key: 'showInefficientProducts',
                    label: 'Inefficient Products',
                    desc: 'Show products with price inefficiencies across locations',
                    enabled: showInefficientProducts
                  }, {
                    key: 'showProductTargets',
                    label: 'Product Targets',
                    desc: 'Show product targets and progress tracking',
                    enabled: showProductTargets
                  }].map(section => (
                    <div key={section.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{section.label}</p>
                        <p className="text-xs text-gray-500">{section.desc}</p>
                      </div>
                                              <button
                          onClick={() => handleToggleSection(section.key as SectionKey)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                            section.enabled ? 'bg-emerald-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                              section.enabled ? 'translate-x-1' : 'translate-x-6'
                            }`}
                          />
                        </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alert Settings Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Alert Thresholds</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inefficient Product Threshold (%)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={thresholds.inefficientProduct}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        inefficientProduct: Number(e.target.value)
                      }))}
                      className="w-full accent-emerald-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1%</span>
                      <span>{thresholds.inefficientProduct}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Alert Threshold (%)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={thresholds.priceAlert}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        priceAlert: Number(e.target.value)
                      }))}
                      className="w-full accent-emerald-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1%</span>
                      <span>{thresholds.priceAlert}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSaveThresholds}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Thresholds
                </button>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Comparison Groups</p>
                      <p className="text-xs text-gray-500">Manage restaurant comparison groups for efficiency analysis</p>
                    </div>
                    <button
                      onClick={() => setShowComparisonManager(true)}
                      className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 text-sm font-medium"
                    >
                      Manage
                    </button>
                  </div>
                  {/* Add more advanced settings here as needed */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Group Manager Modal */}
      {showComparisonManager && (
        <LocationComparisonManager
          isOpen={showComparisonManager}
          onClose={() => setShowComparisonManager(false)}
        />
      )}
    </>
  );
}; 

