// components/ImportGuidelines.tsx
export const ImportGuidelines: React.FC = () => (
  <div className="max-w-2xl mx-auto mt-8">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Guidelines</h2>
    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
      <li>File must be in XLSX format</li>
      <li>Required sheets: Extractions</li>
      <li>Optional sheets: Prisaftaler (price agreements), PAX (guest counts)</li>
      <li>Dates should be in DD-MM-YYYY format</li>
      <li>Amounts should use comma (,) as decimal separator</li>
      <li>All monetary values should be in DKK</li>
      <li>Column names are case-insensitive</li>
    </ul>
  </div>
);

