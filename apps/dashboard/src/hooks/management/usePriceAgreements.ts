import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { getPriceValue } from '@/utils/getPriceValue';

type PriceAgreement = {
  id: string;
  productCode: string;
  description: string;
  unitType: string;
  unitSubtype?: string;
  price: number;
  supplier: string;
  startDate?: Date;
  endDate?: Date;
  totalSpend: number;
  organizationId: string;
};

type PriceOpportunity = {
  productCode: string;
  description: string;
  supplier: string;
  spend: number;
  transactions: number;
  avgPrice: number;
  unitType: string;
};

type PriceAgreementStats = {
  totalAgreements: number;
  totalTransactions: number;
  compliantTransactions: number;
  complianceRate: number;
  totalSavingsPotential: number;
  totalSpend: number;
  spendWithAgreements: number;
  spendCoverage: number;
  productsWithoutAgreements: PriceOpportunity[];
};

type InvoiceLine = {
  product_code: string;
  description: string;
  unit_type: string;
  unit_price: number;
  unit_price_after_discount: number;
  quantity: number;
  total_price: number;
  total_price_after_discount: number;
  supplier_id: string;
};

export const usePriceAgreements = () => {
  const { suppliers: supplierFilter, productSearch } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  
  const [agreements, setAgreements] = useState<PriceAgreement[]>([]);
  const [opportunities, setOpportunities] = useState<PriceOpportunity[]>([]);
  const [stats, setStats] = useState<PriceAgreementStats | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPriceAgreements = async () => {
      if (!currentOrganization) return;
      
      setLoading(true);
      setError(null);
      
      // If we have product search terms, show a toast to indicate filtering is in progress
      if (productSearch?.terms?.length > 0) {
        toast.info(`Filtering price agreements by ${productSearch.terms.length} search terms...`);
      }

      try {
        // First, get all unique supplier IDs from invoice lines
        let supplierIdsQuery = supabase
          .from('invoice_lines')
          .select('supplier_id')
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          supplierIdsQuery = supplierIdsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        const { data: supplierIdsData, error: supplierIdsError } = await supplierIdsQuery;

        if (supplierIdsError) throw supplierIdsError;

        // Get unique supplier IDs
        const uniqueSupplierIds = [...new Set((supplierIdsData || []).map(row => row.supplier_id))].filter(id => id !== null);

        // Fetch supplier details (only if we have valid supplier IDs)
        let suppliersData = [];
        let suppliersError = null;
        
        if (uniqueSupplierIds.length > 0) {
          const { data, error } = await supabase
            .from('suppliers')
            .select('supplier_id, name')
            .eq('organization_id', currentOrganization.id)
            .in('supplier_id', uniqueSupplierIds);
          
          suppliersData = data || [];
          suppliersError = error;
        }

        if (suppliersError) throw suppliersError;

        // Create a map of supplier names
        const suppliersMap = new Map(
          (suppliersData || []).map(supplier => [supplier.supplier_id, supplier.name])
        );

        // Fetch price agreements
        let agreementsQuery = supabase
          .from('price_negotiations')
          .select('*')
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          agreementsQuery = agreementsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }

        if (supplierFilter.length > 0) {
          agreementsQuery = agreementsQuery.in('supplier', supplierFilter);
        }

        const { data: agreementsData, error: agreementsError } = await agreementsQuery;
        if (agreementsError) throw agreementsError;

        // Fetch invoice data to calculate spend and compliance
        let invoiceQuery = supabase
          .from('invoice_lines')
          .select(`
            product_code,
            description,
            unit_type,
            unit_price,
            unit_price_after_discount,
            quantity,
            total_price,
            total_price_after_discount,
            supplier_id
          `)
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          invoiceQuery = invoiceQuery.eq('business_unit_id', currentBusinessUnit.id);
        }
        
        // Fetch all data using pagination (Supabase has a hard limit of 1000 rows per query)
        let allRows: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const offset = page * pageSize;
          
          const { data: pageRows, error: pageError } = await invoiceQuery
            .range(offset, offset + pageSize - 1);

          if (pageError) {
            throw pageError;
          }

          if (!pageRows || pageRows.length === 0) {
            hasMore = false;
          } else {
            allRows = allRows.concat(pageRows);
            
            // If we got less than pageSize, we've reached the end
            if (pageRows.length < pageSize) {
              hasMore = false;
            }
            
            page++;
          }
        }

        const invoiceData = allRows;

        // Process agreements with spend data
        let processedAgreements: PriceAgreement[] = (agreementsData || []).map(agreement => {
          const totalSpend = ((invoiceData || []) as InvoiceLine[])
            .filter(invoice => {
              const supplierName = suppliersMap.get(invoice.supplier_id) || '';
              return supplierName === agreement.supplier && invoice.product_code === agreement.product_code;
            })
            .reduce((sum, invoice) => sum + getPriceValue(invoice.total_price_after_discount, invoice.total_price), 0);

          return {
            id: agreement.id,
            productCode: agreement.product_code,
            description: agreement.description,
            unitType: agreement.unit_type,
            unitSubtype: agreement.unit_subtype,
            price: agreement.price,
            supplier: agreement.supplier,
            startDate: agreement.start_date ? new Date(agreement.start_date) : undefined,
            endDate: agreement.end_date ? new Date(agreement.end_date) : undefined,
            totalSpend,
            organizationId: agreement.organization_id,
          };
        });

        // Apply product search filter if specified
        if (productSearch?.terms?.length > 0) {
          const includedTerms: string[] = [];
          const excludedTerms: string[] = [];
          
          productSearch.terms.forEach(term => {
            if (term.startsWith('-')) {
              excludedTerms.push(term.slice(1).toLowerCase());
            } else {
              includedTerms.push(term.toLowerCase());
            }
          });

          processedAgreements = processedAgreements.filter(agreement => {
            const description = agreement.description.toLowerCase();
            const code = agreement.productCode.toLowerCase();
            const supplier = agreement.supplier.toLowerCase();
            
            // Check excluded terms first
            const hasExclusion = excludedTerms.some(term =>
              description.includes(term) || code.includes(term) || supplier.includes(term)
            );
            
            if (hasExclusion) return false;

            // Check included terms
            if (includedTerms.length > 0) {
              const matches = includedTerms.map(term => 
                description.includes(term) || code.includes(term) || supplier.includes(term)
              );

              return productSearch.mode === 'AND'
                ? matches.every(Boolean)
                : matches.some(Boolean);
            }
            return true;
          });
        }

        setAgreements(processedAgreements);

        // Calculate statistics and opportunities
        if (invoiceData) {
          const agreementMap = new Map(
            processedAgreements.map(a => [`${a.productCode}|${a.supplier}`, a])
          );

          let totalTransactions = 0;
          let compliantTransactions = 0;
          let totalSavingsPotential = 0;
          let totalSpend = 0;
          let spendWithAgreements = 0;

          const productsWithoutAgreements = new Map<string, PriceOpportunity>();

          invoiceData.forEach((invoice: InvoiceLine) => {
            const supplierName = suppliersMap.get(invoice.supplier_id) || '';
            const agreementKey = `${invoice.product_code}|${supplierName}`;
            const agreement = agreementMap.get(agreementKey);
            const effectivePrice = getPriceValue(invoice.unit_price_after_discount, invoice.unit_price);
            const itemSpend = getPriceValue(invoice.total_price_after_discount, invoice.total_price);

            totalSpend += itemSpend;

            if (agreement) {
              spendWithAgreements += itemSpend;
              totalTransactions++;

              if (effectivePrice <= agreement.price) {
                compliantTransactions++;
              } else {
                totalSavingsPotential += (effectivePrice - agreement.price) * (invoice.quantity || 0);
              }
            } else {
              // Track products without agreements
              const key = `${invoice.product_code}|${supplierName}|${invoice.unit_type}`;
              const existing = productsWithoutAgreements.get(key);

              if (existing) {
                existing.spend += itemSpend;
                existing.transactions += 1;
                existing.avgPrice = existing.spend / existing.transactions;
              } else {
                productsWithoutAgreements.set(key, {
                  productCode: invoice.product_code,
                  description: invoice.description || '',
                  supplier: supplierName,
                  spend: itemSpend,
                  transactions: 1,
                  avgPrice: effectivePrice,
                  unitType: invoice.unit_type || '',
                });
              }
            }
          });

          const opportunitiesArray = Array.from(productsWithoutAgreements.values())
            .sort((a, b) => b.spend - a.spend);

          setOpportunities(opportunitiesArray);

          const calculatedStats: PriceAgreementStats = {
            totalAgreements: processedAgreements.length,
            totalTransactions,
            compliantTransactions,
            complianceRate: totalTransactions > 0 ? (compliantTransactions / totalTransactions) * 100 : 0,
            totalSavingsPotential,
            totalSpend,
            spendWithAgreements,
            spendCoverage: totalSpend > 0 ? (spendWithAgreements / totalSpend) * 100 : 0,
            productsWithoutAgreements: opportunitiesArray,
          };

          setStats(calculatedStats);
        }

      } catch (err) {
        console.error('Error fetching price agreements:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceAgreements();
  }, [supplierFilter, productSearch, currentOrganization, currentBusinessUnit]);

  return {
    agreements,
    opportunities,
    stats,
    isLoading,
    error,
  };
};
