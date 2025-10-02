import React, { useState } from 'react';
import { Pencil, Trash2, Save, X, Search, ArrowUpDown } from 'lucide-react';
import { PaxRecord } from '@/hooks/data';
import { Pagination } from '@/components/shared/ui/Pagination';
import { usePagination } from '@/hooks/ui/usePagination';
import { toast } from 'sonner';

interface PaxTableProps {
  data: PaxRecord[];
  onUpdate: (pax_id: string, updates: Partial<PaxRecord>) => Promise<PaxRecord>;
  onDelete: (pax_id: string) => Promise<void>;
}

export const PaxTable: React.FC<PaxTableProps> = ({ data, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPaxCount, setEditingPaxCount] = useState<string>('');
  const [sortField, setSortField] = useState<'date' | 'location' | 'pax'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedData = React.useMemo(() => {
    return [...data]
      .filter(record => {
        const locationName = record.location?.name || '';
        return locationName.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          return sortDirection === 'asc' 
            ? a.date_id.localeCompare(b.date_id)
            : b.date_id.localeCompare(a.date_id);
        } else if (sortField === 'location') {
          const aName = a.location?.name || '';
          const bName = b.location?.name || '';
          return sortDirection === 'asc'
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        } else {
          return sortDirection === 'asc'
            ? a.pax_count - b.pax_count
            : b.pax_count - a.pax_count;
        }
      });
  }, [data, searchTerm, sortField, sortDirection]);

  const {
    currentPage,
    paginatedItems,
    pageSize,
    goToPage,
    totalItems,
  } = usePagination(filteredAndSortedData, 10);

  const handleSort = (field: 'date' | 'location' | 'pax') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleStartEdit = (record: PaxRecord) => {
    setEditingId(record.pax_id);
    setEditingPaxCount(record.pax_count.toString());
  };

  const handleSaveEdit = async (record: PaxRecord) => {
    try {
      const paxCount = parseInt(editingPaxCount);
      if (isNaN(paxCount) || paxCount < 0) {
        toast.error('PAX count must be a positive number');
        return;
      }

      await onUpdate(record.pax_id, { pax_count: paxCount });
      setEditingId(null);
      toast.success('PAX record updated successfully');
    } catch (error) {
      toast.error('Failed to update PAX record');
      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = async (pax_id: string) => {
    if (window.confirm('Are you sure you want to delete this PAX record?')) {
      try {
        await onDelete(pax_id);
        toast.success('PAX record deleted successfully');
      } catch (error) {
        toast.error('Failed to delete PAX record');
        console.error(error);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">PAX Records</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  className="flex items-center gap-1"
                  onClick={() => handleSort('date')}
                >
                  Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  className="flex items-center gap-1"
                  onClick={() => handleSort('location')}
                >
                  Location
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  className="flex items-center gap-1"
                  onClick={() => handleSort('pax')}
                >
                  PAX
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedItems.map((record) => (
              <tr key={record.pax_id} className={editingId === record.pax_id ? 'bg-emerald-50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(record.date_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.locations?.name || `- (ID: ${record.location_id})`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingId === record.pax_id ? (
                    <input
                      type="number"
                      value={editingPaxCount}
                      onChange={(e) => setEditingPaxCount(e.target.value)}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      min="0"
                    />
                  ) : (
                    record.pax_count.toLocaleString()
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingId === record.pax_id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveEdit(record)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(record)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.pax_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {paginatedItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  {data.length === 0 ? 'No PAX records found' : 'No matching records found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={goToPage}
      />
    </div>
  );
};

