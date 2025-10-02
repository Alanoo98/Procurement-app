import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Database, TrendingUp, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { PaxTable } from '@/components/features/analytics/pax/PaxTable';
import { AddPaxForm } from '@/components/features/analytics/pax/AddPaxForm';
import { PaxImport } from '@/components/features/analytics/pax/PaxImport';
import { BookingIntegrationTrigger } from '@/components/features/analytics/pax/BookingIntegrationTrigger';
import { PaxGraphs } from '@/components/features/analytics/pax/PaxGraphs';
import { LocationPaxGraph } from '@/components/features/analytics/pax/LocationPaxGraph';

import { usePax } from '@/hooks/data';
import { useBookingIntegration } from '@/hooks/useBookingIntegration';
import { PaxRecord } from '@/hooks/data';

export const PaxManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'view' | 'add' | 'import' | 'booking-sync'>('view');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const {
    paxData,
    loading,
    error,
    fetchPaxData,
    createPaxRecord,
    updatePaxRecord,
    deletePaxRecord,
    importPaxRecords
  } = usePax();

  const {
    syncStatus,
    isLoading: syncLoading,
    triggerBookingSync,
    getSyncStatus,
    testConnection,
    getRestaurants,
    getBookingSummary
  } = useBookingIntegration();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [bookingSummary, setBookingSummary] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  useEffect(() => {
    fetchPaxData();
    getSyncStatus();
    loadRestaurants();
    testDatabaseConnection();
  }, []);

  const loadRestaurants = async () => {
    try {
      const restaurantData = await getRestaurants();
      setRestaurants(restaurantData);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      const status = await testConnection();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus({ status: 'error', error: error.message });
    }
  };

  const handleBookingSync = async () => {
    try {
      await triggerBookingSync({
        days_back: 30,
        organization_id: 'dining-six-org-id'
      });
    } catch (error) {
      console.error('Error triggering booking sync:', error);
    }
  };

  const handleImportPax = async (records: Array<Omit<PaxRecord, 'pax_id' | 'created_at' | 'updated_at'>>) => {
    try {
      await importPaxRecords(records);
      await fetchPaxData();
      toast.success(`Successfully imported ${records.length} PAX records`);
    } catch (error) {
      console.error('Error importing PAX records:', error);
      throw error;
    }
  };

  const handleCreatePax = async (paxData: Omit<PaxRecord, 'pax_id' | 'created_at' | 'updated_at'>) => {
    try {
      await createPaxRecord(paxData);
      await fetchPaxData();
      toast.success('PAX record created successfully');
    } catch (error) {
      console.error('Error creating PAX record:', error);
      throw error;
    }
  };

  const handleUpdatePax = async (paxId: string, updates: Partial<PaxRecord>) => {
    try {
      await updatePaxRecord(paxId, updates);
      await fetchPaxData();
      toast.success('PAX record updated successfully');
    } catch (error) {
      console.error('Error updating PAX record:', error);
      throw error;
    }
  };

  const handleDeletePax = async (paxId: string) => {
    try {
      await deletePaxRecord(paxId);
      await fetchPaxData();
      toast.success('PAX record deleted successfully');
    } catch (error) {
      console.error('Error deleting PAX record:', error);
      throw error;
    }
  };

  const filteredPaxData = paxData.filter(record => {
    if (selectedLocation !== 'all' && record.location?.location_id !== selectedLocation) {
      return false;
    }
    
    const recordDate = new Date(record.date_id);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    return recordDate >= startDate && recordDate <= endDate;
  });

  const tabs = [
    { id: 'view', label: 'View PAX Data', icon: Users },
    { id: 'add', label: 'Add PAX Record', icon: Plus },
    { id: 'import', label: 'Import PAX Data', icon: RefreshCw },
    { id: 'booking-sync', label: 'Booking Integration', icon: Database }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PAX Management</h1>
        <p className="text-gray-600">
          Manage guest count data and integrate with DiningSix booking system
        </p>
      </div>

      {/* Connection Status */}
      {connectionStatus && (
        <div className={`mb-6 p-4 rounded-lg border ${
          connectionStatus.status === 'healthy' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            <Database className={`h-5 w-5 mr-2 ${
              connectionStatus.status === 'healthy' ? 'text-green-600' : 'text-red-600'
            }`} />
            <span className={`font-medium ${
              connectionStatus.status === 'healthy' ? 'text-green-800' : 'text-red-800'
            }`}>
              Database Connection: {connectionStatus.status}
            </span>
          </div>
          {connectionStatus.error && (
            <p className="text-red-700 text-sm mt-1">{connectionStatus.error}</p>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'view' && (
          <div className="p-6">
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Locations</option>
                  {/* Add location options here */}
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <PaxTable
              data={filteredPaxData}
              onUpdate={handleUpdatePax}
              onDelete={handleDeletePax}
            />

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PaxGraphs data={filteredPaxData} />
              <LocationPaxGraph data={filteredPaxData} />
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="p-6">
            <AddPaxForm onSubmit={handleCreatePax} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="p-6">
            <PaxImport onImport={handleImportPax} />
          </div>
        )}

        {activeTab === 'booking-sync' && (
          <div className="p-6">
            <BookingIntegrationTrigger
              onTriggerBookingSync={handleBookingSync}
              isTriggering={syncLoading}
              lastSyncTime={syncStatus.lastSync}
              syncStatus={syncStatus.status}
              errorMessage={syncStatus.error}
            />

            {/* Restaurant List */}
            {restaurants.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Available Restaurants
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restaurants.slice(0, 6).map((restaurant) => (
                    <div key={restaurant.placeID} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">{restaurant.placeName}</h4>
                      <p className="text-sm text-gray-600">{restaurant.restaurant}</p>
                      <p className="text-sm text-gray-500">{restaurant.country}</p>
                      <p className="text-sm text-blue-600 mt-2">
                        {restaurant.total_bookings} bookings (90 days)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
