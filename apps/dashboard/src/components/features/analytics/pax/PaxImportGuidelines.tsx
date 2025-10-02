import React from 'react';
import { FileText, Info } from 'lucide-react';

export const PaxImportGuidelines: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-medium text-gray-900">Import Guidelines</h2>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-lg">
          <Info className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Important Notes</h3>
            <ul className="mt-2 text-sm text-amber-700 space-y-1">
              <li>• Location names must match existing locations in the system</li>
              <li>• Dates should be in YYYY-MM-DD or DD-MM-YYYY format</li>
              <li>• PAX values must be positive numbers</li>
              <li>• Duplicate date/location combinations will be rejected</li>
            </ul>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">File Format</h3>
          <p className="text-sm text-gray-600">
            Your Excel or CSV file should contain the following columns:
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Example</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">date</td>
                  <td className="px-4 py-2 text-sm text-gray-500">Date of the PAX count</td>
                  <td className="px-4 py-2 text-sm text-gray-500">2025-05-15 or 15-05-2025</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">location</td>
                  <td className="px-4 py-2 text-sm text-gray-500">Name of the location</td>
                  <td className="px-4 py-2 text-sm text-gray-500">Restaurant Copenhagen</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">pax</td>
                  <td className="px-4 py-2 text-sm text-gray-500">Number of guests</td>
                  <td className="px-4 py-2 text-sm text-gray-500">120</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Example File</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-xs text-gray-600 overflow-x-auto">
              date,location,pax<br/>
              2025-05-01,Restaurant Copenhagen,120<br/>
              2025-05-01,Restaurant Aarhus,85<br/>
              2025-05-02,Restaurant Copenhagen,145<br/>
              2025-05-02,Restaurant Aarhus,92
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

