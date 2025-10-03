// pages/ImportData.tsx
import React from 'react';
import { ImportGuidelines } from '@/components/features/import/ImportGuidelines';
import { DropZone } from '@/components/features/import/DropZone';
import { ProcessedTrackerManager } from '@/components/features/import/ProcessedTrackerManager';
import { PinProtection } from '@/components/features/auth/PinProtection';

export const ImportData: React.FC = () => {
  return (
    <PinProtection 
      pin="1998" 
      maxAttempts={3} 
      lockoutDuration={5}
    >
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Secure access granted. Choose how you'd like to import procurement data into the system
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

