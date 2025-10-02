// components/DropZone.tsx
import React, { useCallback, useState } from 'react';
import { FileUp, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useImportStore } from '@/store/importStore';
import { read, utils } from 'xlsx';
import { toast } from 'sonner';
import { extractionsSchema, paxDataSchema, priceAgreementsSchema } from '../../types';
import { processImportedData, processPaxData, processPriceAgreements } from '@/store/importStore';

export const DropZone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { status, error, setStatus, setError, setData, setPriceAgreements, setPaxData, reset } = useImportStore();

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setError('Please upload an XLSX file');
      return;
    }
    setStatus('processing');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);

      const extractionsSheet = workbook.Sheets['Extractions'];
      const priceAgreementsSheet = workbook.Sheets['Prisaftaler'];
      const paxSheet = workbook.Sheets['PAX'];

      if (!extractionsSheet) throw new Error('Required Extractions sheet not found');

      const normalize = (data: any[]) => data.map(row =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]))
      );

      const validate = async (data: any[], schema: any, name: string) => {
        try {
          return await schema.parse(normalize(data));
        } catch (e) {
          throw new Error(`Validation error in ${name} sheet`);
        }
      };

      const extractions = await validate(utils.sheet_to_json(extractionsSheet), extractionsSchema, 'Extractions');
      const priceAgreements = priceAgreementsSheet ? await validate(utils.sheet_to_json(priceAgreementsSheet), priceAgreementsSchema, 'Prisaftaler') : [];
      const pax = paxSheet ? await validate(utils.sheet_to_json(paxSheet), paxDataSchema, 'PAX') : [];

      setData(processImportedData({ extractions, priceAgreements }));
      setPriceAgreements(processPriceAgreements({ priceAgreements }));
      setPaxData(processPaxData(pax));

      setStatus('success');
      toast.success('Data imported successfully');
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setStatus('error');
      toast.error('Failed to import data');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  }, []);

  return (
    <div
      className={`max-w-2xl mx-auto mt-8 p-8 border-2 border-dashed rounded-lg transition-colors duration-200 ${
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
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Drag and drop your XLSX file</h3>
            <p className="mt-1 text-sm text-gray-500">Or</p>
            <label className="mt-4 inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              <Upload className="h-5 w-5 mr-2 text-gray-400" />
              Select file
              <input
                type="file"
                className="sr-only"
                accept=".xlsx"
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

