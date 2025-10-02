import React, { useState } from 'react';
import { FileUp, CheckCircle2, AlertCircle, RefreshCw, Download, Database } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PriceNegotiationImport {
  product_code: string;
  supplier?: string;
  target_price?: number;
  current_price?: number;
  effective_date?: string;
  comment?: string;
  description?: string;
}

interface ImportResult {
  success: boolean;
  total_processed: number;
  successful: number;
  failed: number;
  results: Array<{
    row: number;
    id: string;
    product_code: string;
    status: string;
  }>;
  errors: Array<{
    row: number;
    product_code: string;
    error: string;
  }>;
}

interface DatabaseMatch {
  product_code?: boolean;
  supplier?: boolean;
  description?: boolean;
  suggestions?: {
    product_codes?: string[];
    suppliers?: string[];
    descriptions?: string[];
  };
}

interface PriceNegotiationsImportProps {
  onImport: (negotiations: PriceNegotiationImport[]) => Promise<ImportResult>;
}

export const PriceNegotiationsImport: React.FC<PriceNegotiationsImportProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'preview' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<PriceNegotiationImport[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{row: number, field: string, error: string}>>([]);
  const [databaseMatches, setDatabaseMatches] = useState<Array<{row: number, matches: DatabaseMatch}>>([]);
  const [isValidatingDatabase, setIsValidatingDatabase] = useState(false);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Record<string, string>>({});
  const [skipDatabaseValidation, setSkipDatabaseValidation] = useState(false);

  const acceptSuggestion = (rowIndex: number, field: 'product_code' | 'supplier', suggestedValue: string) => {
    const key = `${rowIndex}-${field}`;
    setAcceptedSuggestions(prev => ({
      ...prev,
      [key]: suggestedValue
    }));
  };

  const rejectSuggestion = (rowIndex: number, field: 'product_code' | 'supplier') => {
    const key = `${rowIndex}-${field}`;
    setAcceptedSuggestions(prev => {
      const newAccepted = { ...prev };
      delete newAccepted[key];
      return newAccepted;
    });
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Check if one contains the other
    if (s2.includes(s1) || s1.includes(s2)) {
      return 100;
    }
    
    const minLength = Math.min(s1.length, s2.length);
    if (minLength === 0) return 0;
    
    let matchingChars = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) {
        matchingChars++;
      }
    }
    
    return (matchingChars / minLength) * 100;
  };

  const validateNegotiations = (negotiations: PriceNegotiationImport[]) => {
    const errors: Array<{row: number, field: string, error: string}> = [];
    
    negotiations.forEach((negotiation, index) => {
      const rowNumber = index + 1;
      
      // Validate required fields
      if (!negotiation.product_code || negotiation.product_code.trim() === '') {
        errors.push({ row: rowNumber, field: 'product_code', error: 'Product code is required' });
      }
      
      // Validate prices
      if (negotiation.target_price !== undefined) {
        const targetPrice = parseFloat(String(negotiation.target_price));
        if (isNaN(targetPrice) || targetPrice < 0) {
          errors.push({ row: rowNumber, field: 'target_price', error: 'Target price must be a positive number' });
        }
      }
      
      if (negotiation.current_price !== undefined) {
        const currentPrice = parseFloat(String(negotiation.current_price));
        if (isNaN(currentPrice) || currentPrice < 0) {
          errors.push({ row: rowNumber, field: 'current_price', error: 'Current price must be a positive number' });
        }
      }
      
      // Validate date
      if (negotiation.effective_date) {
        const date = new Date(negotiation.effective_date);
        if (isNaN(date.getTime())) {
          errors.push({ row: rowNumber, field: 'effective_date', error: 'Effective date must be a valid date' });
        }
      }
    });
    
    return errors;
  };

  const validateAgainstDatabase = async (negotiations: PriceNegotiationImport[]) => {
    setIsValidatingDatabase(true);
    const matches: Array<{row: number, matches: DatabaseMatch}> = [];

    try {
      // Get current user's organization
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      const { data: userData, error: userDataError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (userDataError || !userData?.organization_id) {
        throw new Error('User organization not found');
      }

      const organization_id = userData.organization_id;

      // Batch fetch all unique product codes
      const uniqueProductCodes = [...new Set(negotiations.map(n => n.product_code).filter(Boolean))];
      const { data: allProducts } = await supabase
        .from("invoice_lines")
        .select("product_code")
        .eq("organization_id", organization_id)
        .in("product_code", uniqueProductCodes);

      const existingProductCodes = new Set(allProducts?.map(p => p.product_code) || []);

      // Batch fetch all unique suppliers
      const uniqueSuppliers = [...new Set(negotiations.map(n => n.supplier).filter(Boolean))];
      const { data: allSuppliers } = await supabase
        .from("suppliers")
        .select("name")
        .eq("organization_id", organization_id)
        .in("name", uniqueSuppliers);

      const existingSuppliers = new Set(allSuppliers?.map(s => s.name) || []);

      // Get all product codes for suggestions
      const { data: allProductCodes } = await supabase
        .from("invoice_lines")
        .select("product_code")
        .eq("organization_id", organization_id)
        .limit(1000);

      const allProductCodesSet = new Set(allProductCodes?.map(p => p.product_code).filter(Boolean) || []);

      // Get all suppliers for suggestions
      const { data: allSupplierNames } = await supabase
        .from("suppliers")
        .select("name")
        .eq("organization_id", organization_id)
        .limit(1000);

      const allSupplierNamesSet = new Set(allSupplierNames?.map(s => s.name).filter(Boolean) || []);

      // Process each negotiation
      for (let i = 0; i < negotiations.length; i++) {
        const negotiation = negotiations[i];
        const rowNumber = i + 1;
        const match: DatabaseMatch = {};

        // Check product code matches
        if (negotiation.product_code) {
          match.product_code = existingProductCodes.has(negotiation.product_code);

          // Get similar product codes if no exact match
          if (!match.product_code) {
            const similarCodes = Array.from(allProductCodesSet)
              .map(code => {
                if (!code || !negotiation.product_code) return null;
                
                const importCode = negotiation.product_code.toLowerCase();
                const dbCode = code.toLowerCase();
                
                // Check if one contains the other (like 8014726 in HOW8014726)
                if (dbCode.includes(importCode) || importCode.includes(dbCode)) {
                  return { code, score: 100 }; // Perfect match
                }
                
                // Only suggest if the codes are reasonably similar in length
                const lengthDiff = Math.abs(importCode.length - dbCode.length);
                if (lengthDiff > 3 || dbCode.length < 4) {
                  return null; // Too different in length or too short
                }
                
                // Check for partial matches with stricter criteria
                const minLength = Math.min(importCode.length, dbCode.length);
                if (minLength >= 4) {
                  let matchingChars = 0;
                  for (let i = 0; i < Math.min(importCode.length, dbCode.length); i++) {
                    if (importCode[i] === dbCode[i]) {
                      matchingChars++;
                    }
                  }
                  const similarity = (matchingChars / minLength) * 100;
                  // Much stricter: at least 85% of characters must match
                  if (similarity >= 85) {
                    return { code, score: similarity };
                  }
                }
                
                return null;
              })
              .filter((item): item is { code: string; score: number } => item !== null)
              .sort((a, b) => b.score - a.score) // Sort by similarity score
              .slice(0, 3) // Only show top 3 most similar
              .map(item => item.code);
            
            match.suggestions = {
              ...match.suggestions,
              product_codes: similarCodes
            };
          }
        }

        // Check supplier matches
        if (negotiation.supplier) {
          match.supplier = existingSuppliers.has(negotiation.supplier);

          // Get similar suppliers if no exact match
          if (!match.supplier) {
            const similarSuppliers = Array.from(allSupplierNamesSet)
              .filter(supplier => {
                if (!supplier || !negotiation.supplier) return false;
                
                const importSupplier = negotiation.supplier.toLowerCase().trim();
                const dbSupplier = supplier.toLowerCase().trim();
                
                // Check if one contains the other
                if (dbSupplier.includes(importSupplier) || importSupplier.includes(dbSupplier)) {
                  return true;
                }
                
                // Check for word-based similarity (split by spaces and common separators)
                const importWords = importSupplier.split(/[\s\-_&]+/).filter((w: string) => w.length > 2);
                const dbWords = dbSupplier.split(/[\s\-_&]+/).filter((w: string) => w.length > 2);
                
                if (importWords.length > 0 && dbWords.length > 0) {
                  const matchingWords = importWords.filter((importWord: string) => 
                    dbWords.some((dbWord: string) => 
                      dbWord.includes(importWord) || importWord.includes(dbWord)
                    )
                  );
                  // Much stricter: at least 80% of words must match
                  return (matchingWords.length / importWords.length) >= 0.8;
                }
                
                return false;
              })
              .slice(0, 5);
            
            match.suggestions = {
              ...match.suggestions,
              suppliers: similarSuppliers
            };
          }
        }

        matches.push({ row: rowNumber, matches: match });
      }

      setDatabaseMatches(matches);
    } catch (error) {
      console.error('Database validation error:', error);
      toast.error('Failed to validate against database');
      // Set empty matches to prevent UI errors
      setDatabaseMatches([]);
    } finally {
      setIsValidatingDatabase(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      setError('Please upload an XLSX or CSV file');
      setStatus('error');
      return;
    }
    
    setStatus('processing');
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (data.length === 0) {
        throw new Error('No data found in the file');
      }

      // Normalize column names to handle different formats
      const normalizedData = data.map((row: Record<string, unknown>) => {
        const normalized: Record<string, unknown> = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
          normalized[normalizedKey] = row[key];
        });
        return normalized;
      });

      // Transform the data to match the price negotiations structure
      const negotiations: PriceNegotiationImport[] = normalizedData.map((row: Record<string, unknown>, index: number) => {
        // Required field validation
        if (!row.product_code && !row.productcode) {
          throw new Error(`Row ${index + 2}: product_code is required`);
        }

        // Parse prices
        const parsePrice = (value: unknown): number | undefined => {
          if (value === null || value === undefined || value === '') return undefined;
          const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'));
          return isNaN(num) ? undefined : num;
        };

        // Parse date
        const parseDate = (value: unknown): string | undefined => {
          if (!value) return undefined;
          if (typeof value === 'string') {
            // Try to parse various date formats
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          return undefined;
        };

        return {
          product_code: String(row.product_code || row.productcode || ''),
          supplier: row.supplier ? String(row.supplier) : row.supplier_name ? String(row.supplier_name) : undefined,
          target_price: parsePrice(row.target_price || row.targetprice),
          current_price: parsePrice(row.current_price || row.currentprice),
          effective_date: parseDate(row.effective_date || row.effectivedate),
          comment: row.comment ? String(row.comment) : row.notes ? String(row.notes) : undefined,
          description: row.description ? String(row.description) : row.product_description ? String(row.product_description) : undefined
        };
      });

      if (negotiations.length === 0) {
        throw new Error('No valid price negotiations found in the file');
      }

      // Validate the data
      const errors = validateNegotiations(negotiations);
      setValidationErrors(errors);
      setPreviewData(negotiations);
      
      // Validate against database (skip for large files)
      if (negotiations.length <= 100 || !skipDatabaseValidation) {
        await validateAgainstDatabase(negotiations);
      } else {
        setSkipDatabaseValidation(true);
      }
      
      setStatus('preview');
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
      toast.error(`Failed to import data: ${errorMessage}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    try {
      setStatus('processing');
      
      // Apply accepted suggestions to the data before importing
      const dataWithSuggestions = previewData.map((negotiation, index) => {
        const productCodeKey = `${index}-product_code`;
        const supplierKey = `${index}-supplier`;
        
        return {
          ...negotiation,
          product_code: acceptedSuggestions[productCodeKey] || negotiation.product_code,
          supplier: acceptedSuggestions[supplierKey] || negotiation.supplier
        };
      });
      
      const result = await onImport(dataWithSuggestions);
      setImportResults(result);
      setStatus('success');
      
      if (result.success) {
        toast.success(`Successfully imported ${result.successful} price negotiations`);
      } else {
        toast.warning(`Imported ${result.successful} negotiations, ${result.failed} failed`);
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
      toast.error(`Failed to import data: ${errorMessage}`);
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setImportResults(null);
    setPreviewData([]);
    setValidationErrors([]);
    setDatabaseMatches([]);
    setIsValidatingDatabase(false);
    setSkipDatabaseValidation(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'product_code': '151232',
        'supplier': 'Wulff & Co',
        'target_price': 2460,
        'current_price': 0,
        'effective_date': '2025-08-01',
        'comment': 'Price negotiation for beef fillet',
        'description': 'Storfe Ytrefilet Arg.Skivet 250 Gr . Kød 24'
      },
      {
        'product_code': '151451',
        'supplier': 'Wulff & Co',
        'target_price': 299,
        'current_price': 0,
        'effective_date': '2025-08-01',
        'comment': 'Price negotiation for tri tip',
        'description': 'Storfe Tri Tip Angus Uy Grain'
      }
    ];

    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Price Negotiations');
    writeFile(wb, 'price_negotiations_template.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Download Template</h3>
            <p className="text-sm text-blue-700 mt-1">
              Download the Excel template to see the required format
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : status === 'processing'
            ? 'border-yellow-400 bg-yellow-50'
            : status === 'success'
            ? 'border-green-400 bg-green-50'
            : status === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        
        <label htmlFor="file-upload" className="cursor-pointer">
          {status === 'processing' ? (
            <RefreshCw className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          ) : status === 'error' ? (
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          ) : (
            <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          )}
        </label>

        <div className="space-y-2">
          {status === 'idle' && (
            <>
              <p className="text-lg font-medium text-gray-900">
                Drop your Excel file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports .xlsx and .csv files
              </p>
            </>
          )}

          {status === 'processing' && (
            <>
              <p className="text-lg font-medium text-yellow-700">
                Processing your file...
              </p>
              <p className="text-sm text-yellow-600">
                Please wait while we import your price negotiations
              </p>
            </>
          )}

          {status === 'preview' && (
            <>
              <p className="text-lg font-medium text-blue-700">
                Preview your data
              </p>
              <p className="text-sm text-blue-600">
                Review the data before importing. {validationErrors.length > 0 && `${validationErrors.length} validation errors found.`}
                {isValidatingDatabase && (
                  <span className="flex items-center gap-2 mt-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating against database... This may take a moment for large files.
                  </span>
                )}
                {skipDatabaseValidation && (
                  <span className="flex items-center gap-2 mt-2 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    Database validation skipped for large file. Import will proceed without database checks.
                  </span>
                )}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <p className="text-lg font-medium text-green-700">
                Import completed successfully!
              </p>
              <p className="text-sm text-green-600">
                {importResults?.successful} negotiations imported
                {importResults?.failed && importResults.failed > 0 && `, ${importResults.failed} failed`}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-lg font-medium text-red-700">
                Import failed
              </p>
              <p className="text-sm text-red-600">
                {error}
              </p>
            </>
          )}
        </div>

        {status === 'preview' && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleImport}
              disabled={validationErrors.length > 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Import {previewData.length} Negotiations
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Upload Another File
            </button>
          </div>
        )}

        {status !== 'idle' && status !== 'preview' && (
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Upload Another File
          </button>
        )}
      </div>

      {/* Preview Data */}
      {status === 'preview' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Data Preview</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Code</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((negotiation, index) => {
                  const rowNumber = index + 1;
                  const rowErrors = validationErrors.filter(error => error.row === rowNumber);
                  const rowMatches = databaseMatches.find(m => m.row === rowNumber);
                  const hasErrors = rowErrors.length > 0;
                  
                  return (
                    <tr key={index} className={hasErrors ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rowNumber}
                      </td>
                      <td className={`px-3 py-2 text-sm ${hasErrors && rowErrors.some(e => e.field === 'product_code') ? 'text-red-600' : rowMatches?.matches.product_code === false ? 'text-orange-600' : 'text-gray-900'}`}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {negotiation.product_code}
                            {rowMatches?.matches.product_code === true && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                            {rowMatches?.matches.product_code === false && (
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                          {rowMatches?.matches.suggestions?.product_codes && rowMatches.matches.suggestions.product_codes.length > 0 && (
                            <div className="text-xs">
                              <div className="text-gray-600 mb-1">Suggestions:</div>
                              <div className="flex flex-wrap gap-1">
                                {rowMatches.matches.suggestions.product_codes.slice(0, 3).map((suggestion, idx) => {
                                  const key = `${index}-product_code`;
                                  const isAccepted = acceptedSuggestions[key] === suggestion;
                                  return (
                                    <div key={idx} className="flex items-center gap-1">
                                      <button
                                        onClick={() => acceptSuggestion(index, 'product_code', suggestion)}
                                        className={`px-2 py-1 text-xs rounded ${
                                          isAccepted 
                                            ? 'bg-green-100 text-green-800 border border-green-300' 
                                            : 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'
                                        }`}
                                        title={`Similarity: ${Math.round(calculateSimilarity(negotiation.product_code, suggestion))}%`}
                                      >
                                        {suggestion}
                                      </button>
                                      {isAccepted && (
                                        <button
                                          onClick={() => rejectSuggestion(index, 'product_code')}
                                          className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-sm ${rowMatches?.matches.supplier === false ? 'text-orange-600' : 'text-gray-900'}`}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {negotiation.supplier || '-'}
                            {rowMatches?.matches.supplier === true && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                            {rowMatches?.matches.supplier === false && (
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                          {rowMatches?.matches.suggestions?.suppliers && rowMatches.matches.suggestions.suppliers.length > 0 && (
                            <div className="text-xs">
                              <div className="text-gray-600 mb-1">Suggestions:</div>
                              <div className="flex flex-wrap gap-1">
                                {rowMatches.matches.suggestions.suppliers.slice(0, 3).map((suggestion, idx) => {
                                  const key = `${index}-supplier`;
                                  const isAccepted = acceptedSuggestions[key] === suggestion;
                                  return (
                                    <div key={idx} className="flex items-center gap-1">
                                      <button
                                        onClick={() => acceptSuggestion(index, 'supplier', suggestion)}
                                        className={`px-2 py-1 text-xs rounded ${
                                          isAccepted 
                                            ? 'bg-green-100 text-green-800 border border-green-300' 
                                            : 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'
                                        }`}
                                      >
                                        {suggestion}
                                      </button>
                                      {isAccepted && (
                                        <button
                                          onClick={() => rejectSuggestion(index, 'supplier')}
                                          className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm ${hasErrors && rowErrors.some(e => e.field === 'target_price') ? 'text-red-600' : 'text-gray-900'}`}>
                        {negotiation.target_price || '-'}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm ${hasErrors && rowErrors.some(e => e.field === 'current_price') ? 'text-red-600' : 'text-gray-900'}`}>
                        {negotiation.current_price || '-'}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm ${hasErrors && rowErrors.some(e => e.field === 'effective_date') ? 'text-red-600' : 'text-gray-900'}`}>
                        {negotiation.effective_date || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {hasErrors ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {rowErrors.length} error{rowErrors.length > 1 ? 's' : ''}
                          </span>
                        ) : rowMatches?.matches.product_code === false || rowMatches?.matches.supplier === false ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Database className="w-3 h-3 mr-1" />
                            No match
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-700 mb-2">Validation Errors:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Row {error.row}, {error.field}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {databaseMatches.some(m => m.matches.product_code === false || m.matches.supplier === false) && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database Validation Results
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {databaseMatches.map((match, index) => {
                  if (match.matches.product_code === false || match.matches.supplier === false) {
                    return (
                      <div key={index} className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        <div className="font-medium">Row {match.row}:</div>
                        {match.matches.product_code === false && (
                          <div className="ml-2">
                            • Product code not found in database
                            {match.matches.suggestions?.product_codes && match.matches.suggestions.product_codes.length > 0 && (
                              <div className="ml-4 text-gray-600">
                                Similar: {match.matches.suggestions.product_codes.slice(0, 3).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                        {match.matches.supplier === false && (
                          <div className="ml-2">
                            • Supplier not found in database
                            {match.matches.suggestions?.suppliers && match.matches.suggestions.suppliers.length > 0 && (
                              <div className="ml-4 text-gray-600">
                                Similar: {match.matches.suggestions.suppliers.slice(0, 3).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Accepted Suggestions Summary */}
          {Object.keys(acceptedSuggestions).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Accepted Suggestions
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {Object.entries(acceptedSuggestions).map(([key, value]) => {
                  const [rowIndex, field] = key.split('-');
                  const rowNumber = parseInt(rowIndex) + 1;
                  return (
                    <div key={key} className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      Row {rowNumber} {field}: <span className="font-medium">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Import Results</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{importResults.total_processed}</div>
              <div className="text-sm text-gray-500">Total Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{importResults.successful}</div>
              <div className="text-sm text-gray-500">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>

                {importResults?.errors && importResults.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-700 mb-2">Errors:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importResults.errors.map((error, index: number) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Row {error.row}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Required Columns</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>product_code</strong> (required) - Product identifier</div>
          <div><strong>supplier</strong> (optional) - Supplier name</div>
          <div><strong>target_price</strong> (optional) - Target price for negotiation</div>
          <div><strong>current_price</strong> (optional) - Current price</div>
          <div><strong>effective_date</strong> (optional) - Date when negotiation becomes effective (YYYY-MM-DD)</div>
          <div><strong>comment</strong> (optional) - Additional notes</div>
          <div><strong>description</strong> (optional) - Product description</div>
        </div>
      </div>
    </div>
  );
};
