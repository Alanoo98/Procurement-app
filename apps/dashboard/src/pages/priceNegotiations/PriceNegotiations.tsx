import React, { useState, useMemo } from 'react';
import { Search, Plus, Upload } from 'lucide-react';
import { Pagination } from '@/components/shared/ui/Pagination';
import { usePagination } from '@/hooks/ui/usePagination';
import { usePriceNegotiations, PriceNegotiation } from '@/hooks/management/usePriceNegotiations';
import { toast } from 'sonner';
import { CreateNegotiationModal } from './CreateNegotiationModal';
import { UpdateNegotiationModal } from './UpdateNegotiationModal';
import { ConsolidatedNegotiationCard } from './ConsolidatedNegotiationCard';
import { PriceNegotiationsImport } from '@/components/features/import/PriceNegotiationsImport';
import { supabase } from '@/lib/supabase';

type SortDirection = 'asc' | 'desc';
type Tab = 'active' | 'resolved' | 'all';

interface PriceNegotiationImport {
  product_code: string;
  supplier?: string;
  target_price?: number;
  current_price?: number;
  effective_date?: string;
  comment?: string;
  description?: string;
}

interface ConsolidatedNegotiation {
  productCode: string;
  description: string;
  supplier: string;
  supplierId: string;
  unitType: string;
  unitSubtype?: string;
  negotiations: PriceNegotiation[];
  currentActive: PriceNegotiation | null;
  latestResolved: PriceNegotiation | null;
  overallStatus: 'active' | 'resolved' | 'mixed';
}

export const PriceNegotiations: React.FC = () => {
  const { 
    negotiations, 
    isLoading, 
    error, 
    createNegotiation, 
    updateNegotiation, 
    deleteNegotiation
  } = usePriceNegotiations();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField] = useState<'requestedAt' | 'status'>('requestedAt');
  const [sortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNegotiation, setEditingNegotiation] = useState<PriceNegotiation | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);


  const filteredAndSortedNegotiations = useMemo(() => {
    if (!negotiations) return [];
    
    // Filter by tab
    let filtered = [...negotiations];
    if (activeTab === 'active') {
      filtered = filtered.filter(n => n.status === 'active');
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(n => n.status === 'resolved');
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.description.toLowerCase().includes(term) ||
        n.productCode.toLowerCase().includes(term) ||
        n.supplier.toLowerCase().includes(term)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortField === 'requestedAt') {
        return sortDirection === 'asc' 
          ? a.requestedAt.getTime() - b.requestedAt.getTime()
          : b.requestedAt.getTime() - a.requestedAt.getTime();
      } else {
        // Sort by status: active -> resolved
        const statusOrder = { active: 0, resolved: 1 };
        const aOrder = statusOrder[a.status];
        const bOrder = statusOrder[b.status];
        return sortDirection === 'asc' ? aOrder - bOrder : bOrder - aOrder;
      }
    });
    
    return filtered;
  }, [negotiations, searchTerm, sortField, sortDirection, activeTab]);

  // Consolidate negotiations by product + supplier combination
  const consolidatedNegotiations = useMemo(() => {
    if (!filteredAndSortedNegotiations.length) return [];
    
    const grouped = new Map<string, ConsolidatedNegotiation>();
    
    filteredAndSortedNegotiations.forEach(negotiation => {
      const key = `${negotiation.productCode}-${negotiation.supplierId}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          productCode: negotiation.productCode,
          description: negotiation.description,
          supplier: negotiation.supplier,
          supplierId: negotiation.supplierId,
          unitType: negotiation.unitType,
          unitSubtype: negotiation.unitSubtype,
          negotiations: [],
          currentActive: null,
          latestResolved: null,
          overallStatus: 'resolved'
        });
      }
      
      const consolidated = grouped.get(key)!;
      consolidated.negotiations.push(negotiation);
      
      // Sort negotiations by effective date (newest first)
      consolidated.negotiations.sort((a, b) => {
        const dateA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
        const dateB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
        return dateB - dateA;
      });
      
      // Find current active negotiation
      const currentDate = new Date();
      consolidated.currentActive = consolidated.negotiations.find(n => 
        n.status === 'active' && 
        (!n.effectiveDate || new Date(n.effectiveDate) <= currentDate)
      ) || null;
      
      // Find latest resolved negotiation
      consolidated.latestResolved = consolidated.negotiations.find(n => 
        n.status === 'resolved'
      ) || null;
      
      // For single negotiations, always use the first negotiation as current
      if (consolidated.negotiations.length === 1) {
        consolidated.currentActive = consolidated.negotiations[0];
      }
      
      // Determine overall status
      const hasActive = consolidated.negotiations.some(n => n.status === 'active');
      const hasResolved = consolidated.negotiations.some(n => n.status === 'resolved');
      
      if (hasActive && hasResolved) {
        consolidated.overallStatus = 'mixed';
      } else if (hasActive) {
        consolidated.overallStatus = 'active';
      } else {
        consolidated.overallStatus = 'resolved';
      }
    });
    
    return Array.from(grouped.values());
  }, [filteredAndSortedNegotiations]);


  const {
    currentPage,
    paginatedItems,
    pageSize,
    goToPage,
    changePageSize,
    totalItems,
  } = usePagination(consolidatedNegotiations, 5);


  const handleCreateNegotiation = async (negotiation: Omit<PriceNegotiation, 'id' | 'requestedAt' | 'status'>) => {
    try {
      await createNegotiation(negotiation);
      toast.success('Negotiation created successfully');
    } catch (err) {
      console.error('Error creating negotiation:', err);
      toast.error('Failed to create negotiation');
    }
  };

  const handleUpdateNegotiation = async (id: string, updates: Partial<PriceNegotiation>) => {
    try {
      await updateNegotiation(id, updates);
      toast.success('Negotiation updated successfully');
      setIsEditModalOpen(false);
      setEditingNegotiation(null);
    } catch (err) {
      console.error('Error updating negotiation:', err);
      toast.error('Failed to update negotiation');
    }
  };

  const handleDeleteNegotiation = async (id: string) => {
    try {
      await deleteNegotiation(id);
      toast.success('Negotiation deleted successfully');
    } catch (err) {
      console.error('Error deleting negotiation:', err);
      toast.error('Failed to delete negotiation');
    }
  };

  const handleEditNegotiation = (negotiation: PriceNegotiation) => {
    setEditingNegotiation(negotiation);
    setIsEditModalOpen(true);
  };

  const handleImportNegotiations = async (negotiations: PriceNegotiationImport[]) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Get user's organization
      const { data: userData, error: userDataError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (userDataError || !userData?.organization_id) {
        throw new Error('User organization not found');
      }

      const organization_id = userData.organization_id;
      const results = {
        success: true,
        total_processed: negotiations.length,
        successful: 0,
        failed: 0,
        results: [] as Array<{row: number, id: string, product_code: string, status: string}>,
        errors: [] as Array<{row: number, product_code: string, error: string}>
      };

      // Process each negotiation
      for (let i = 0; i < negotiations.length; i++) {
        const negotiation = negotiations[i];
        const rowNumber = i + 1;

        try {
          // Validate required fields
          if (!negotiation.product_code) {
            throw new Error("product_code is required");
          }

          // Parse and validate prices
          const target_price = negotiation.target_price ? parseFloat(String(negotiation.target_price)) : null;
          const current_price = negotiation.current_price ? parseFloat(String(negotiation.current_price)) : null;

          if (target_price !== null && (isNaN(target_price) || target_price < 0)) {
            throw new Error("target_price must be a positive number");
          }

          if (current_price !== null && (isNaN(current_price) || current_price < 0)) {
            throw new Error("current_price must be a positive number");
          }

          // Parse effective date
          let effective_date = null;
          if (negotiation.effective_date) {
            const parsedDate = new Date(negotiation.effective_date);
            if (isNaN(parsedDate.getTime())) {
              throw new Error("effective_date must be a valid date");
            }
            effective_date = parsedDate.toISOString().split('T')[0];
          }

          // Resolve supplier if provided
          let supplier_id = null;
          if (negotiation.supplier) {
            const { data: supplierData } = await supabase
              .from("suppliers")
              .select("supplier_id")
              .eq("organization_id", organization_id)
              .ilike("name", negotiation.supplier)
              .limit(1);

            if (supplierData && supplierData.length > 0) {
              supplier_id = supplierData[0].supplier_id;
            }
          }

          // Insert the price negotiation
          const { data: insertData, error: insertError } = await supabase
            .from("price_negotiations")
            .insert({
              organization_id,
              product_code: negotiation.product_code,
              supplier_id,
              requested_by: user.id,
              status: "active",
              target_price,
              current_price,
              effective_date,
              comment: negotiation.comment || null,
              supplier: negotiation.supplier || null,
              description: negotiation.description || null
            })
            .select('id')
            .single();

          if (insertError) {
            throw new Error(`Database error: ${insertError.message}`);
          }

          results.successful++;
          results.results.push({
            row: rowNumber,
            id: insertData?.id || '',
            product_code: negotiation.product_code || 'unknown',
            status: 'success'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({
            row: rowNumber,
            product_code: negotiation.product_code || 'unknown',
            error: errorMessage
          });
          results.results.push({
            row: rowNumber,
            id: '',
            product_code: negotiation.product_code || 'unknown',
            status: 'error'
          });
          results.failed++;
        }
      }

      if (results.successful > 0) {
        toast.success(`Successfully imported ${results.successful} price negotiations`);
        setIsImportModalOpen(false);
        // Refresh the negotiations list
        window.location.reload();
      } else {
        toast.warning(`Imported ${results.successful} negotiations, ${results.failed} failed`);
      }

      return results;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Import failed: ${errorMessage}`);
      throw err;
    }
  };


  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Price Agreements</h2>
          <p className="mt-2 text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Price Negotiations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and manage price negotiations with suppliers
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading price agreements...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Active</div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {consolidatedNegotiations.filter(n => n.overallStatus === 'active' || n.overallStatus === 'mixed').length}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Products with active negotiations
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Resolved</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">
                {consolidatedNegotiations.filter(n => n.overallStatus === 'resolved').length}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Successfully completed
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search negotiations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    activeTab === 'active' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('resolved')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    activeTab === 'resolved' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Resolved
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    activeTab === 'all' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
              </div>
              
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Negotiation
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {paginatedItems.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No negotiations found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? "No negotiations match your search criteria." 
                    : activeTab === 'active' 
                      ? "There are no active negotiations." 
                      : activeTab === 'resolved' 
                        ? "There are no resolved negotiations." 
                        : "There are no negotiations yet."}
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                >
                  Create Your First Negotiation
                </button>
              </div>
            ) : (
              paginatedItems.map(consolidated => (
                <ConsolidatedNegotiationCard
                  key={`${consolidated.productCode}-${consolidated.supplierId}`}
                  consolidated={consolidated}
                  onDelete={handleDeleteNegotiation}
                  onEdit={handleEditNegotiation}
                />
              ))
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </div>
        </>
      )}
      
      {isCreateModalOpen && (
        <CreateNegotiationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateNegotiation}
        />
      )}

      {isEditModalOpen && editingNegotiation && (
        <UpdateNegotiationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingNegotiation(null);
          }}
          onSubmit={handleUpdateNegotiation}
          negotiation={editingNegotiation}
        />
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Import Price Negotiations</h2>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PriceNegotiationsImport onImport={handleImportNegotiations} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

