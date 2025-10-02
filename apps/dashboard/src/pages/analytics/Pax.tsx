import React, { useState } from 'react';
import { Users, FileSpreadsheet, BarChart3, Database } from 'lucide-react';
import { usePaxData } from '@/hooks/data';
import { AddPaxForm } from '@/components/features/analytics/pax/AddPaxForm';
import { PaxTable } from '@/components/features/analytics/pax/PaxTable';
import { PaxImport } from '@/components/features/analytics/pax/PaxImport';
import { PaxImportGuidelines } from '@/components/features/analytics/pax/PaxImportGuidelines';
import { PaxGraphs } from '@/components/features/analytics/pax/PaxGraphs';
import { PaxPivotTable } from '@/components/features/analytics/pax/PaxPivotTable';
import { BookingSyncButton } from '@/components/features/analytics/pax/BookingSyncButton';
import { PinProtection } from '@/components/features/auth/PinProtection';
import { toast } from 'sonner';

export const Pax: React.FC = () => {
  const { data, isLoading, error, addPaxRecord, updatePaxRecord, deletePaxRecord, importPaxData } = usePaxData();
  const [activeTab, setActiveTab] = useState<'manage' | 'import' | 'booking-sync'>('manage');

  const handleAddRecord = async (record: Record<string, unknown>) => {
    try {
      await addPaxRecord(record);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        toast.error('A PAX record already exists for this date and location');
      } else {
        toast.error('Failed to add PAX record');
      }
      throw error;
    }
  };

  const handleImport = async (records: Record<string, unknown>[]) => {
    try {
      await importPaxData(records);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        toast.error('Some records could not be imported due to duplicate date/location combinations');
      } else {
        toast.error('Failed to import PAX records');
      }
      throw error;
    }
  };

  return (
    <PinProtection>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">PAX Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage guest count data for locations
          </p>
        </div>

      <div className="mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'manage'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="h-5 w-5" />
            Manage PAX
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileSpreadsheet className="h-5 w-5" />
            Import PAX Data
          </button>
          <button
            onClick={() => setActiveTab('booking-sync')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'booking-sync'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Database className="h-5 w-5" />
            Booking Sync
          </button>
        </div>
      </div>

      {activeTab === 'manage' ? (
        <>
          <AddPaxForm onAdd={handleAddRecord} />
          
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading PAX data...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-red-500">Error loading PAX data: {error.message}</p>
            </div>
          ) : (
            <>
              <PaxTable 
                data={data} 
                onUpdate={updatePaxRecord} 
                onDelete={deletePaxRecord} 
              />
              
              {data.length > 0 && (
               <>
                 <PaxPivotTable data={data} />
                <PaxGraphs data={data} />
               </>
              )}
            </>
          )}
        </>
      ) : activeTab === 'import' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-medium text-gray-900">Import PAX Data</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Upload an Excel or CSV file containing PAX data for multiple locations and dates.
              </p>
              <PaxImport onImport={handleImport} />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-medium text-gray-900">Why PAX Data Matters</h2>
              </div>
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  PAX (guest count) data is essential for accurate procurement efficiency analysis. 
                  It allows you to:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Calculate cost per guest across locations</li>
                  <li>Compare product usage efficiency between locations</li>
                  <li>Identify opportunities for cost optimization</li>
                  <li>Forecast future procurement needs based on guest trends</li>
                  <li>Benchmark performance against industry standards</li>
                </ul>
                <p className="text-emerald-600 font-medium">
                  Regular PAX data updates ensure your efficiency metrics remain accurate and actionable.
                </p>
              </div>
            </div>
          </div>
          
          <PaxImportGuidelines />
        </>
      ) : (
        <>
          <BookingSyncButton 
            organizationId="5c38a370-7d13-4656-97f8-0b71f4000703"
            onSyncComplete={() => {
              // Refresh PAX data after sync
              window.location.reload();
            }}
          />
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">How Booking Sync Works</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Connects to your configured source database</li>
              <li>• Fetches confirmed bookings from the specified date range</li>
              <li>• Aggregates guest counts by date and location</li>
              <li>• Inserts/updates PAX records in your database</li>
              <li>• Runs in GitHub Actions for reliability</li>
              <li>• Configurable for different business types and locations</li>
            </ul>
          </div>
        </>
      )}
      </div>
    </PinProtection>
  );
};

