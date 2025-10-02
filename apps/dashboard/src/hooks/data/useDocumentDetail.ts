import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

interface DocumentDetailData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  delivery_date?: string;
  document_type: string;
  supplier_id: string;
  location_id: string;
  product_code: string;
  description: string;
  quantity: string;
  unit_price_after_discount: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // For other fields like suppliers, locations, etc.
}

export const useDocumentDetail = (invoiceNumber: string | undefined) => {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<DocumentDetailData[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!invoiceNumber || !currentOrganization) return;

    const fetch = async () => {
      const query = supabase
        .from("invoice_lines")
        .select(`
          *,
          suppliers(name, address, tax_id),
          locations(name, address)
        `)
        .eq("invoice_number", invoiceNumber)
        .eq("organization_id", currentOrganization.id)
        .order("created_at", { ascending: false });
        
      const { data, error } = await query;

      if (error) {
        setError(error);
        setLoading(false);
        return;
      }

      // Use the values directly from invoice_lines table instead of extracted_data
      // The invoice_lines table now contains the updated subtotal, total_tax, and total_amount values
      console.log('Using values from invoice_lines table:', {
        subtotal: data[0]?.subtotal,
        total_tax: data[0]?.total_tax,
        total_amount: data[0]?.total_amount
      });

      // Deduplicate by product_code + quantity + unit_price_after_discount to get the latest version
      const deduplicatedData = (data || []).reduce((acc: DocumentDetailData[], row: DocumentDetailData) => {
        const key = `${row.product_code}-${row.quantity}-${row.unit_price_after_discount}`;
        const existing = acc.find(item => 
          `${item.product_code}-${item.quantity}-${item.unit_price_after_discount}` === key
        );
        
        if (!existing) {
          acc.push(row);
        } else if (new Date(row.created_at) > new Date(existing.created_at)) {
          // Replace with newer version
          const index = acc.indexOf(existing);
          acc[index] = row;
        }
        
        return acc;
      }, []);

      setData(deduplicatedData);
      setLoading(false);
    };

    fetch();
  }, [invoiceNumber, currentOrganization]);

  const refetch = async () => {
    if (!invoiceNumber || !currentOrganization) return;
    
    setLoading(true);
    setError(null);

    const query = supabase
      .from("invoice_lines")
      .select(`
        *,
        suppliers(name, address, tax_id),
        locations(name, address)
      `)
      .eq("invoice_number", invoiceNumber)
      .eq("organization_id", currentOrganization.id)
      .order("created_at", { ascending: false });
      
    const { data, error } = await query;

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    // Use the values directly from invoice_lines table instead of extracted_data
    // The invoice_lines table now contains the updated subtotal, total_tax, and total_amount values
    console.log('Using values from invoice_lines table (refetch):', {
      subtotal: data[0]?.subtotal,
      total_tax: data[0]?.total_tax,
      total_amount: data[0]?.total_amount
    });

    // Deduplicate by product_code + quantity + unit_price_after_discount to get the latest version
    const deduplicatedData = (data || []).reduce((acc: DocumentDetailData[], row: DocumentDetailData) => {
      const key = `${row.product_code}-${row.quantity}-${row.unit_price_after_discount}`;
      const existing = acc.find(item => 
        `${item.product_code}-${item.quantity}-${item.unit_price_after_discount}` === key
      );
      
      if (!existing) {
        acc.push(row);
      } else if (new Date(row.created_at) > new Date(existing.created_at)) {
        // Replace with newer version
        const index = acc.indexOf(existing);
        acc[index] = row;
      }
      
      return acc;
    }, []);

    setData(deduplicatedData);
    setLoading(false);
  };

  return { data, isLoading, error, refetch };
};
