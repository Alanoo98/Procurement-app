// pages/ImportData.tsx
import React from 'react';
import { ImportGuidelines } from '@/components/features/import/ImportGuidelines';
import { DropZone } from '@/components/features/import/DropZone';
import { ProcessedTrackerManager } from '@/components/features/import/ProcessedTrackerManager';
import { PinProtection } from '@/components/features/auth/PinProtection';

export const ImportData: React.FC = () => {
  return (
    <PinProtection>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose how you'd like to import procurement data into the system
          </p>
        </div>

        {/* Document Processing Manager */}
        <ProcessedTrackerManager />

        {/* Import Options at Bottom - Commented out for now */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Import from File</h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload data manually from an Excel (.xlsx) file exported from your systems.
            </p>
            <DropZone />
          </div>
          
          <div>
            <ImportGuidelines />
          </div>
        </div> */}

        {/* <ImportGuidelines /> */}
      </div>
    </PinProtection>
  );
};

export default ImportData;

