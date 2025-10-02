import React, { useState } from 'react';
import { FileUp, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { read, utils } from 'xlsx';
import { toast } from 'sonner';
import { useLocations } from '@/hooks/data';
import { PaxRecord } from '@/hooks/data';

interface PaxImportProps {
  onImport: (records: Array<Omit<PaxRecord, 'pax_id' | 'created_at' | 'updated_at'>>) => Promise<any>;
}

export const PaxImport: React.FC<PaxImportProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { data: locations } = useLocations();

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      setError('Please upload an XLSX or CSV file');
      setStatus('error');
      return;
    }
    
    setStatus('processing');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = utils.sheet_to_json(worksheet);

      // Create a map of location names to IDs for quick lookup
      const locationMap = new Map(locations?.map(loc => [loc.name.toLowerCase(), loc.location_id]) || []);

      // Transform the data to match the PAX table structure
      const paxRecords = data.map((row: PaxRecord) => {
        // Normalize column names to handle different formats
        const normalizedRow = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key.toLowerCase().trim(), value])
        );

        // Extract date, location, and pax count
        const dateValue = normalizedRow.date || normalizedRow.date_id || '';
        const locationValue = normalizedRow.location || normalizedRow.location_name || '';
        const paxValue = normalizedRow.pax || normalizedRow.pax_count || 0;

        // Parse date
        let dateId: string;
        if (typeof dateValue === 'string') {
          // Handle different date formats
          const dateParts = dateValue.split(/[-/]/);
          if (dateParts.length === 3) {
            // Assume DD-MM-YYYY or YYYY-MM-DD format
            const isYearFirst = dateParts[0].length === 4;
            const year = isYearFirst ? dateParts[0] : dateParts[2];
            const month = isYearFirst ? dateParts[1] : dateParts[1];
            const day = isYearFirst ? dateParts[2] : dateParts[0];
            dateId = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            // Use current date if format is unrecognized
            dateId = new Date().toISOString().split('T')[0];
          }
        } else if (dateValue instanceof Date) {
          dateId = dateValue.toISOString().split('T')[0];
        } else {
          // Use current date as fallback
          dateId = new Date().toISOString().split('T')[0];
        }

        // Find location ID
        const locationName = String(locationValue).trim();
        const locationId = locationMap.get(locationName.toLowerCase());

        if (!locationId) {
          throw new Error(`Location "${locationName}" not found. Please ensure the location exists in the system.`);
        }

        // Parse PAX count
        const paxCount = typeof paxValue === 'number' 
          ? paxValue 
          : parseInt(String(paxValue).replace(/[^\d]/g, ''));

        if (isNaN(paxCount) || paxCount < 0) {
          throw new Error(`Invalid PAX count for ${locationName} on ${dateId}: ${paxValue}`);
        }

        return {
          date_id: dateId,
          location_id: locationId,
          pax_count: paxCount
        };
      });

      if (paxRecords.length === 0) {
        throw new Error('No valid PAX records found in the file');
      }

      // Import the records
      await onImport(paxRecords);
      setStatus('success');
      toast.success(`Successfully imported ${paxRecords.length} PAX records`);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setStatus('error');
      toast.error(`Failed to import data: ${e.message}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
  };

  return (
    <div
      className={`max-w-2xl mx-auto p-8 border-2 border-dashed rounded-lg transition-colors duration-200 ${
        isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <div className="text-center">
        {status === 'idle' && (
          <>
            <FileUp className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Drag and drop your PAX data file</h3>
            <p className="mt-1 text-sm text-gray-500">Or</p>
            <label className="mt-4 inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              <Upload className="h-5 w-5 mr-2 text-gray-400" />
              Select file
              <input
                type="file"
                className="sr-only"
                accept=".xlsx,.csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </>
        )}

        {status === 'processing' && (
          <>
            <RefreshCw className="mx-auto h-12 w-12 text-emerald-500 animate-spin" />
            <p className="mt-4 text-sm text-gray-500">Processing your file...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <p className="mt-4 text-sm font-medium text-emerald-600">File uploaded successfully!</p>
            <button className="mt-4 text-sm text-emerald-600 hover:text-emerald-700" onClick={reset}>Upload another file</button>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
            <button className="mt-4 text-sm text-gray-500 hover:text-gray-700" onClick={reset}>Try again</button>
          </>
        )}
      </div>
    </div>
  );
};

