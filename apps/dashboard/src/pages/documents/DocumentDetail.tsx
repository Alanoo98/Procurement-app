import React, { useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Package, Pencil, Save, X, FileText } from 'lucide-react';
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from '@/utils/format';
import { useNavigationState } from '@/hooks/ui';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { useTableColumns } from '@/hooks/ui';
import { useDocumentDetail } from '@/hooks/data/useDocumentDetail';
import { transformDocument } from '@/utils/transformDocument';
import { QUERY_KEYS } from '@/hooks/utils/queryConfig';
import { supabase } from '@/lib/supabase';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { goBack } = useNavigationState();
  const { data, refetch } = useDocumentDetail(id);
  const queryClient = useQueryClient();

  const invoice = useMemo(() => transformDocument(data), [data]);

  type HeaderEdit = { invoiceNumber: string; invoiceDate: string; dueDate: string; documentType: string };
  type AmountsEdit = { subtotal: number | string; tax: number | string; total: number | string };
  type DocumentItem = {
    id: string;
    description?: string;
    quantity?: number;
    unitType?: string;
    unitSubtype?: string;
    subquantity?: number;
    unitPrice?: number | null;
    unitPriceOriginal?: number | null;
    total?: number | null;
    totalOriginal?: number | null;
    productCode?: string | null;
    hasDiscount?: boolean;
  };
  type ItemEdit = Partial<{
    description: string;
    quantity: number | string;
    unitType: string;
    unitSubtype: string;
    subquantity: number | string;
    unitPrice: number | string;
    unitPriceOriginal: number | string;
    total: number | string;
    totalOriginal: number | string;
    productCode: string;
  }>;

  const [isEditing, setIsEditing] = useState(false);
  const [editedHeader, setEditedHeader] = useState<HeaderEdit | null>(null);
  const [editedItems, setEditedItems] = useState<Record<string, ItemEdit>>({});
  const [editedAmounts, setEditedAmounts] = useState<AmountsEdit | null>(null);

  const { columns, handleColumnResize } = useTableColumns([
    { id: 'description', width: 300 },
    { id: 'productCode', width: 150 },
    { id: 'quantity', width: 200 },
    { id: 'unitType', width: 150 },
    { id: 'unitPrice', width: 150 },
    { id: 'total', width: 150 },
  ]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleBack = () => {
    if (location.state?.from) {
      goBack(location.state.from);
    } else {
      goBack('/documents');
    }
  };

  const startEdit = () => {
    if (!invoice) return;
    setIsEditing(true);
    setEditedHeader({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.dates.invoice,
      dueDate: invoice.dates.due || '',
      documentType: invoice.documentType
    });
    setEditedItems({});
    setEditedAmounts({
      subtotal: invoice.amounts.subtotal || 0,
      tax: invoice.amounts.tax || 0,
      total: invoice.amounts.total || 0
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditedHeader(null);
    setEditedItems({});
    setEditedAmounts(null);
  };

  const updateItemField = (id: string, field: keyof ItemEdit, value: ItemEdit[keyof ItemEdit]) => {
    setEditedItems(prev => {
      const currentItem = invoice?.items.find(item => item.id === id);
      if (!currentItem) return prev;

      const updatedChanges = {
        ...prev[id],
        [field]: value
      };

      // Auto-calculate totals when unit prices or quantity change
      if (field === 'unitPrice' || field === 'unitPriceOriginal' || field === 'quantity') {
        const quantity = field === 'quantity' ? Number(value) : (updatedChanges.quantity || Number(currentItem.quantity));
        const unitPrice = field === 'unitPrice' ? Number(value) : (updatedChanges.unitPrice || currentItem.unitPrice);
        const unitPriceOriginal = field === 'unitPriceOriginal' ? Number(value) : (updatedChanges.unitPriceOriginal || currentItem.unitPriceOriginal);

        // Calculate total_price_after_discount
        if (unitPrice && quantity) {
          updatedChanges.total = Number((Number(unitPrice) * Number(quantity)).toFixed(2));
        }

        // Calculate total_price (original)
        if (unitPriceOriginal && quantity) {
          updatedChanges.totalOriginal = Number((Number(unitPriceOriginal) * Number(quantity)).toFixed(2));
        }
      }

      return {
        ...prev,
        [id]: updatedChanges
      };
    });
  };

  const updateAmountField = (field: keyof AmountsEdit, value: number | string) => {
    setEditedAmounts(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const saveChanges = async () => {
    if (!invoice) return;

    const updates: Array<Promise<unknown>> = [];

    // If invoice number, dates, or document type changed, update all rows for this invoice
    if (editedHeader) {
      const headerChanged = editedHeader.invoiceNumber !== invoice.invoiceNumber || 
                           editedHeader.invoiceDate !== invoice.dates.invoice || 
                           (editedHeader.dueDate || '') !== (invoice.dates.due || '') ||
                           editedHeader.documentType !== invoice.documentType;
      if (headerChanged) {
        updates.push((async () => {
          await supabase
            .from('invoice_lines')
            .update({
              invoice_number: editedHeader.invoiceNumber,
              invoice_date: editedHeader.invoiceDate,
              due_date: editedHeader.dueDate || null,
              document_type: editedHeader.documentType,
            })
            .eq('invoice_number', invoice.invoiceNumber);
        })());
      }
    }

    // If amounts changed, update all rows for this invoice
    if (editedAmounts) {
      const amountsChanged = editedAmounts.subtotal !== (invoice.amounts.subtotal || 0) ||
                             editedAmounts.tax !== (invoice.amounts.tax || 0) ||
                             editedAmounts.total !== (invoice.amounts.total || 0);
      if (amountsChanged) {
        updates.push((async () => {
          await supabase
            .from('invoice_lines')
            .update({
              subtotal: Number(editedAmounts.subtotal),
              total_tax: Number(editedAmounts.tax),
              total_amount: Number(editedAmounts.total),
            })
            .eq('invoice_number', invoice.invoiceNumber);
        })());
      }
    }

    // Update edited line items by id
    (invoice.items as DocumentItem[]).forEach((item) => {
      const changes = editedItems[item.id];
      if (changes) {
        const payload: Record<string, unknown> = {};
        if ('description' in changes) payload.description = changes.description;
        if ('quantity' in changes) payload.quantity = Number(changes.quantity);
        if ('unitType' in changes) payload.unit_type = changes.unitType;
        if ('unitSubtype' in changes) payload.unit_subtype = changes.unitSubtype;
        if ('subquantity' in changes) payload.sub_quantity = Number(changes.subquantity);
        if ('unitPrice' in changes) payload.unit_price_after_discount = Number(changes.unitPrice);
        if ('unitPriceOriginal' in changes) payload.unit_price = Number(changes.unitPriceOriginal);
        if ('productCode' in changes) payload.product_code = changes.productCode;
        
        // Always include calculated totals if they exist in changes
        if ('total' in changes) payload.total_price_after_discount = Number(changes.total);
        if ('totalOriginal' in changes) payload.total_price = Number(changes.totalOriginal);
        
        // Always recalculate totals based on current unit prices and quantity
        const quantity = changes.quantity || Number(item.quantity);
        const unitPrice = changes.unitPrice || item.unitPrice;
        const unitPriceOriginal = changes.unitPriceOriginal || item.unitPriceOriginal;
        
        // Always calculate and update total_price_after_discount
        if (unitPrice && quantity) {
          const calculatedTotalAfterDiscount = Number((Number(unitPrice) * Number(quantity)).toFixed(2));
          payload.total_price_after_discount = calculatedTotalAfterDiscount;
          console.log('Updating total_price_after_discount:', {
            unitPrice,
            quantity,
            calculatedTotal: calculatedTotalAfterDiscount,
            itemId: item.id,
            oldTotalAfterDiscount: item.total
          });
        }
        
        // Always calculate and update total_price (original)
        if (unitPriceOriginal && quantity) {
          const calculatedTotalOriginal = Number((Number(unitPriceOriginal) * Number(quantity)).toFixed(2));
          payload.total_price = calculatedTotalOriginal;
          console.log('Updating total_price:', {
            unitPriceOriginal,
            quantity,
            calculatedTotal: calculatedTotalOriginal,
            itemId: item.id,
            oldTotalOriginal: item.totalOriginal
          });
        }
        
        console.log('Saving payload for item', item.id, ':', payload);
        updates.push((async () => {
          const { error } = await supabase
            .from('invoice_lines')
            .update(payload)
            .eq('id', item.id);
          
          if (error) {
            console.error('Error updating invoice line:', error);
          } else {
            console.log('Successfully updated invoice line', item.id);
          }
        })());
      }
    });

    await Promise.all(updates);
    
    // Refetch data to show changes immediately
    await refetch();
    
    // Invalidate Documents cache to refresh the Documents table
    queryClient.invalidateQueries({ 
      queryKey: [QUERY_KEYS.DOCUMENTS] 
    });
    
    setIsEditing(false);
    setEditedHeader(null);
    setEditedItems({});
    setEditedAmounts(null);

    if (editedHeader && editedHeader.invoiceNumber !== invoice.invoiceNumber) {
      navigate(`/documents/${encodeURIComponent(editedHeader.invoiceNumber)}`);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-economic-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ invoiceNumber: invoice.invoiceNumber })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const { filename, fileBase64 } = await res.json();
      const blob = base64ToBlob(fileBase64, 'application/pdf');
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filename || `invoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Failed to download PDF');
    }
  };

  const base64ToBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [] as Uint8Array[];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  if (!invoice) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Document not found</h2>
          <p className="mt-2 text-gray-500">The document you're looking for doesn't exist.</p>
          <button
            onClick={handleBack}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View detailed invoice information
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={startEdit} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </button>
          ) : (
            <>
              <button onClick={saveChanges} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
              <button onClick={cancelEdit} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </>
          )}
          <button onClick={handleDownloadPdf} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Supplier</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="text-sm font-medium text-gray-900">{invoice.supplier.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Address</div>
              <div className="text-sm font-medium text-gray-900">{invoice.supplier.address}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tax ID</div>
              <div className="text-sm font-medium text-gray-900">{invoice.supplier.tax_id}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Restaurant</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="text-sm font-medium text-gray-900">{invoice.receiver.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Address</div>
              <div className="text-sm font-medium text-gray-900">{invoice.receiver.address}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Dates & Payment</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Invoice Date</div>
              {!isEditing ? (
                <div className="text-sm font-medium text-gray-900">{formatDate(invoice.dates.invoice)}</div>
              ) : (
                <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm" value={editedHeader?.invoiceDate || ''} onChange={e => setEditedHeader(h => ({ ...(h as HeaderEdit), invoiceDate: e.target.value }))} />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">Due Date</div>
              {!isEditing ? (
                <div className="text-sm font-medium text-gray-900">{formatDate(invoice.dates.due)}</div>
              ) : (
                <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm" value={editedHeader?.dueDate || ''} onChange={e => setEditedHeader(h => ({ ...(h as HeaderEdit), dueDate: e.target.value }))} />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">Document Type</div>
              {!isEditing ? (
                <div className="text-sm font-medium text-gray-900">{invoice.documentType}</div>
              ) : (
                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm" value={editedHeader?.documentType || ''} onChange={e => setEditedHeader(h => ({ ...(h as HeaderEdit), documentType: e.target.value }))} />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">Invoice Number</div>
              {!isEditing ? (
                <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
              ) : (
                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm" value={editedHeader?.invoiceNumber || ''} onChange={e => setEditedHeader(h => ({ ...(h as HeaderEdit), invoiceNumber: e.target.value }))} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Items</h2>
          </div>
        </div>
        <ResizableTable
          columns={columns}
          onColumnResize={handleColumnResize}
          className="min-w-full divide-y divide-gray-200"
        >
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {!isEditing ? (
                    <>{item.description}</>
                  ) : (
                    <input className="w-full rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.description ?? item.description ?? ''} onChange={e => updateItemField(item.id, 'description', e.target.value)} />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {!isEditing ? (
                    <>{item.productCode || '—'}</>
                  ) : (
                    <input className="w-full rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.productCode ?? item.productCode ?? ''} onChange={e => updateItemField(item.id, 'productCode', e.target.value)} />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {!isEditing ? (
                    <>
                      {item.quantity} {item.unitType}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.01" className="w-24 rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.quantity ?? item.quantity ?? ''} onChange={e => updateItemField(item.id, 'quantity', e.target.value)} />
                      <input type="text" className="w-24 rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.unitType ?? item.unitType ?? ''} onChange={e => updateItemField(item.id, 'unitType', e.target.value)} />
                    </div>
                  )}
                  {item.unitSubtype && (
                    <span className="text-gray-500 ml-1">
                      ({item.subquantity} {item.unitSubtype})
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {!isEditing ? (
                    <>
                      {item.unitType}
                      {item.unitSubtype && <div className="text-sm text-gray-500">{item.unitSubtype}</div>}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="text" className="w-24 rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.unitSubtype ?? item.unitSubtype ?? ''} onChange={e => updateItemField(item.id, 'unitSubtype', e.target.value)} />
                      <input type="number" step="0.01" className="w-24 rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.subquantity ?? item.subquantity ?? ''} onChange={e => updateItemField(item.id, 'subquantity', e.target.value)} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {!isEditing ? (
                    <div>
                      <div>{formatCurrency(item.unitPrice || 0)}</div>
                      {item.hasDiscount && item.unitPriceOriginal && (
                        <div className="text-xs text-gray-500 line-through">
                          {formatCurrency(item.unitPriceOriginal)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">After Discount</div>
                      <input type="number" step="0.01" className="w-full rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.unitPrice ?? item.unitPrice ?? ''} onChange={e => updateItemField(item.id, 'unitPrice', e.target.value)} />
                      <div className="text-xs text-gray-500">Original</div>
                      <input type="number" step="0.01" className="w-full rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.unitPriceOriginal ?? item.unitPriceOriginal ?? ''} onChange={e => updateItemField(item.id, 'unitPriceOriginal', e.target.value)} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {!isEditing ? (
                    <div>
                      <div title={`Database total_price_after_discount: ${item.total}`}>
                        {formatCurrency(item.total || 0)}
                      </div>
                      {item.hasDiscount && item.totalOriginal && (
                        <div className="text-xs text-gray-500 line-through" title={`Database total_price: ${item.totalOriginal}`}>
                          {formatCurrency(item.totalOriginal)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">After Discount</div>
                      <input type="number" step="0.01" className="w-full rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.total ?? item.total ?? ''} onChange={e => updateItemField(item.id, 'total', e.target.value)} />
                      <div className="text-xs text-gray-500">Original</div>
                      <input type="number" step="0.01" className="w-full rounded-md border-gray-300 text-sm" value={editedItems[item.id]?.totalOriginal ?? item.totalOriginal ?? ''} onChange={e => updateItemField(item.id, 'totalOriginal', e.target.value)} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">Subtotal</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {!isEditing ? (
                  formatCurrency(invoice.amounts.subtotal || 0)
                ) : (
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full rounded-md border-gray-300 text-sm font-medium" 
                    value={editedAmounts?.subtotal ?? invoice.amounts.subtotal ?? 0} 
                    onChange={e => updateAmountField('subtotal', e.target.value)} 
                  />
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">Tax</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {!isEditing ? (
                  formatCurrency(invoice.amounts.tax || 0)
                ) : (
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full rounded-md border-gray-300 text-sm font-medium" 
                    value={editedAmounts?.tax ?? invoice.amounts.tax ?? 0} 
                    onChange={e => updateAmountField('tax', e.target.value)} 
                  />
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={5} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">Total</td>
              <td className="px-6 py-4 text-sm font-bold text-gray-900">
                {!isEditing ? (
                  formatCurrency(invoice.amounts.total || 0)
                ) : (
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full rounded-md border-gray-300 text-sm font-bold" 
                    value={editedAmounts?.total ?? invoice.amounts.total ?? 0} 
                    onChange={e => updateAmountField('total', e.target.value)} 
                  />
                )}
              </td>
            </tr>
          </tfoot>
        </ResizableTable>
      </div>
    </div>
  );
};

