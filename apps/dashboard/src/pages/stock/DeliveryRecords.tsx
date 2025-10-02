import React, { useState, useEffect } from 'react';
import { useStock } from '@/contexts/StockContext';
import { useLocations } from '@/hooks/data/useLocations';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDataAccess } from '@/hooks/auth/useDataAccess';
import { 
  Plus, 
  Truck, 
  MapPin, 
  Calendar, 
  FileText, 
  Edit3, 
  Trash2, 
  Search,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface DeliveryRecordFormData {
  invoice_number: string;
  invoice_date: string;
  delivery_date: string;
  location_id: string;
  supplier_id: string;
  total_amount: number;
  status: 'pending' | 'received' | 'verified';
}

export const DeliveryRecords: React.FC = () => {
  const { 
    deliveryRecords, 
    loadingDeliveryRecords,
    createDeliveryRecord,
    updateDeliveryRecord,
    getStockItemsByLocation
  } = useStock();
  
  const { data: locations } = useLocations();
  const { currentOrganization } = useOrganization();
  const access = useDataAccess();
  const isAdmin = ['owner', 'admin', 'super-admin'].includes(access.currentRole || '');

  const availableLocations = React.useMemo(() => {
    if (!locations) return [] as typeof locations;
    if (isAdmin) return locations;
    const allowedIds = new Set((access.accessibleLocations || []).map(l => l.location_id));
    return locations.filter(l => allowedIds.has(l.location_id));
  }, [locations, access.accessibleLocations, isAdmin]);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  
  const [formData, setFormData] = useState<DeliveryRecordFormData>({
    invoice_number: '',
    invoice_date: '',
    delivery_date: '',
    location_id: '',
    supplier_id: '',
    total_amount: 0,
    status: 'pending'
  });

  const [filteredRecords, setFilteredRecords] = useState(deliveryRecords);

  // Filter records based on search and filters
  useEffect(() => {
    let filtered = isAdmin
      ? deliveryRecords
      : deliveryRecords.filter(r => (access.accessibleLocations || []).some(l => l.location_id === r.location_id));

    // Filter by location
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(record => record.location_id === selectedLocation);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(record => 
        new Date(record.delivery_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(record => 
        new Date(record.delivery_date) <= new Date(dateRange.end)
      );
    }

    setFilteredRecords(filtered);
  }, [deliveryRecords, selectedLocation, selectedStatus, searchTerm, dateRange]);

  const handleCreateRecord = async () => {
    if (!formData.invoice_number || !formData.invoice_date || !formData.delivery_date || !formData.location_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createDeliveryRecord(formData);
      setFormData({
        invoice_number: '',
        invoice_date: '',
        delivery_date: '',
        location_id: '',
        supplier_id: '',
        total_amount: 0,
        status: 'pending'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating delivery record:', error);
    }
  };

  const handleUpdateRecord = async (recordId: string) => {
    try {
      await updateDeliveryRecord(recordId, formData);
      setEditingRecord(null);
      setFormData({
        invoice_number: '',
        invoice_date: '',
        delivery_date: '',
        location_id: '',
        supplier_id: '',
        total_amount: 0,
        status: 'pending'
      });
    } catch (error) {
      console.error('Error updating delivery record:', error);
    }
  };

  const getLocationName = (locationId: string) => {
    const location = locations?.find(l => l.location_id === locationId);
    return location?.name || 'Unknown Location';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'received': return 'text-blue-600 bg-blue-100';
      case 'verified': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'received': return <CheckCircle className="h-4 w-4" />;
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (deliveryDate: string) => {
    return new Date(deliveryDate) < new Date();
  };

  if (loadingDeliveryRecords) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Delivery Records</h1>
              <p className="mt-2 text-gray-600">
                Track invoice deliveries and manage delivery dates
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Delivery Record
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoices..."
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
            {isAdmin && <option value="all">All Locations</option>}
            {availableLocations?.map((location) => (
                  <option key={location.location_id} value={location.location_id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="verified">Verified</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Delivery Record</h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Number *
                    </label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter invoice number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Date *
                    </label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <select
                      value={formData.location_id}
                      onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a location</option>
                      {locations?.map((location) => (
                        <option key={location.location_id} value={location.location_id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount
                    </label>
                    <input
                      type="number"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="received">Received</option>
                      <option value="verified">Verified</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRecord}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Records List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Delivery Records ({filteredRecords.length})
            </h3>
            
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery records found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding a new delivery record.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.invoice_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {getLocationName(record.location_id)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(record.invoice_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className={isOverdue(record.delivery_date) ? 'text-red-600' : ''}>
                              {formatDate(record.delivery_date)}
                            </span>
                            {isOverdue(record.delivery_date) && (
                              <AlertTriangle className="h-4 w-4 text-red-400 ml-1" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(record.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                            {getStatusIcon(record.status)}
                            <span className="ml-1">{record.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingRecord(record.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Record"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {/* TODO: Implement delete */}}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
