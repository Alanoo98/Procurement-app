import { useImportStore } from '@/store/importStore';
import { useLocationStore, getLocationFromAddress } from '@/store/locationStore';
import { useFilterStore } from '@/store/filterStore';
import { useStandardStore } from '@/store/standardStore';
import { ProcessedInvoiceData, PriceAgreement } from '../types';
import { useMemo } from 'react';

const useFilteredData = () => {
  const { data: invoiceData } = useImportStore();
  const { selectedLocations, locationMappings } = useLocationStore();
  const { dateRange, restaurants, suppliers, documentType, productSearch, productCodeFilter } = useFilterStore();
  const { getStandardSupplier, getStandardRestaurant } = useStandardStore();

  return useMemo(() => {
    if (!invoiceData) return [];
    
    let filtered = [...invoiceData];

    // Standardize supplier and restaurant names
    filtered = filtered.map(invoice => ({
      ...invoice,
      supplier: {
        ...invoice.supplier,
        name: getStandardSupplier(invoice.supplier.name, invoice.supplier.address)?.name || invoice.supplier.name
      },
      receiver: {
        ...invoice.receiver,
        name: getStandardRestaurant(invoice.receiver.name, invoice.receiver.address)?.name || invoice.receiver.name
      }
    }));

    // Apply location filter
    if (selectedLocations?.length) {
      filtered = filtered.filter(invoice => {
        // Check if the restaurant name or address matches any selected location's variants
        for (const location of locationMappings) {
          if (selectedLocations.includes(location.name)) {
            if (location.variants.some(variant => {
              const matchesAddress = variant.address && 
                invoice.receiver.address.toLowerCase().includes(variant.address.toLowerCase());
              const matchesName = variant.receiverName && 
                invoice.receiver.name.toLowerCase() === variant.receiverName.toLowerCase();
              return matchesAddress || matchesName;
            })) {
              return true;
            }
          }
        }
        
        return false;
      });
    }

    // Apply date range filter using invoice date
    if (dateRange?.start && dateRange?.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      // Set time to start and end of day for accurate comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(doc => {
        const invoiceDate = new Date(doc.dates.invoice);
        return invoiceDate >= start && invoiceDate <= end;
      });
    }

    // Apply restaurant filter
    if (restaurants?.length > 0) {
      filtered = filtered.filter(doc => restaurants.includes(doc.receiver.name));
    }

    // Apply supplier filter
    if (suppliers?.length > 0) {
      filtered = filtered.filter(doc => suppliers.includes(doc.supplier.name));
    }

    // Apply document type filter
    if (documentType && documentType !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === documentType);
    }

    // Apply product code filter
    if (productCodeFilter === 'with_codes') {
      filtered = filtered.map(doc => ({
        ...doc,
        items: doc.items.filter(item => item.productCode && item.productCode.trim() !== '')
      })).filter(doc => doc.items.length > 0);
    } else if (productCodeFilter === 'without_codes') {
      filtered = filtered.map(doc => ({
        ...doc,
        items: doc.items.filter(item => !item.productCode || item.productCode.trim() === '')
      })).filter(doc => doc.items.length > 0);
    }

    // Apply product search filter
    if (productSearch?.terms?.length > 0) {
      const includedTerms: string[] = [];
      const excludedTerms: string[] = [];
      
      // Separate included and excluded terms
      productSearch.terms.forEach(term => {
        if (term.startsWith('-')) {
          excludedTerms.push(term.slice(1).toLowerCase());
        } else {
          includedTerms.push(term.toLowerCase());
        }
      });

      const matchingProducts = new Set<string>();
      
      // First pass: identify all matching product codes
      filtered.forEach(doc => {
        doc.items.forEach(item => {
          const description = item.description.toLowerCase();
          const code = item.productCode.toLowerCase();
          const supplier = doc.supplier.name.toLowerCase();
          
          // Check excluded terms first - if any match, skip this item
          const hasExclusion = excludedTerms.some(term =>
            description.includes(term) || code.includes(term) || supplier.includes(term)
          );

          
          if (hasExclusion) {
            return;
          }

          // If we have included terms, check them
          if (includedTerms.length > 0) {
            const matches = includedTerms.map(term => 
              description.includes(term) || code.includes(term) || supplier.includes(term)
            );

            // For AND mode, all terms must match
            // For OR mode, at least one term must match
            const isMatch = productSearch.mode === 'AND'
              ? matches.every(Boolean)
              : matches.some(Boolean);

            if (isMatch) {
              matchingProducts.add(`${item.productCode}|${doc.supplier.name}`);
            }
          } else {
            // If we only have exclusions and this item wasn't excluded, include it
            matchingProducts.add(item.productCode);
          }
        });
      });

      // Second pass: only keep documents with matching products, but only keep the matching items
      if (includedTerms.length > 0 || excludedTerms.length > 0) {
        filtered = filtered
          .map(doc => ({
            ...doc,
            items: doc.items.filter(item => matchingProducts.has(`${item.productCode}|${doc.supplier.name}`))
          }))
          .filter(doc => doc.items.length > 0);
      }
    }

    // Add calculated total based on items
    return filtered.map(doc => ({
      ...doc,
      calculatedTotal: doc.items.reduce((sum, item) => sum + item.total, 0)
    }));
  }, [invoiceData, selectedLocations, locationMappings, dateRange, restaurants, suppliers, documentType, productSearch, productCodeFilter]);
};

const useFilteredPriceAgreements = () => {
  const { priceAgreements } = useImportStore();
  const { suppliers } = useFilterStore();

  return useMemo(() => {
    if (!priceAgreements) return [];

    let filtered = [...priceAgreements];

    // Apply supplier filter
    if (suppliers?.length > 0) {
      filtered = filtered.filter(agreement => suppliers.includes(agreement.supplier));
    }

    return filtered;
  }, [priceAgreements, suppliers]);
};

const useProductPurchaseHistory = (productCode: string, supplierName: string) => {
  const filteredData = useFilteredData();

  return useMemo(() => {
    if (!filteredData) return [];

    // Filter invoices that contain the specific product from the specific supplier
    return filteredData.filter(invoice => 
      invoice.supplier.name === supplierName &&
      invoice.items.some(item => item.productCode === productCode)
    ).sort((a, b) => b.dates.invoice.getTime() - a.dates.invoice.getTime()); // Sort by date descending
  }, [filteredData, productCode, supplierName]);
};

export { useFilteredData, useFilteredPriceAgreements, useProductPurchaseHistory };
