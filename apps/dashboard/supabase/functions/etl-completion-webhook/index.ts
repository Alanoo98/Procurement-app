import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { status, organization_id, processed_count } = await req.json();

    if (status === "completed") {
      console.log("🎉 ETL completed, updating processed_tracker statuses...");
      console.log("Organization ID:", organization_id);
      console.log("Processed count:", processed_count);
      
      // First, get all processing documents to verify they have corresponding invoice_lines
      let selectQuery = supabase
        .from("processed_tracker")
        .select("document_id, organization_id, status")
        .eq("status", "processing");
      
      // If organization_id is provided, filter by it
      if (organization_id) {
        selectQuery = selectQuery.eq("organization_id", organization_id);
        console.log(`🔍 Filtering by organization_id: ${organization_id}`);
      }
      
      const { data: processingDocs, error: selectError } = await selectQuery;
      
      if (selectError) {
        console.error("❌ Failed to fetch processing documents:", selectError);
        return new Response(
          JSON.stringify({ success: false, error: selectError.message }),
          { status: 500, headers: CORS_HEADERS }
        );
      }
      
      console.log(`📊 Found ${processingDocs?.length || 0} documents with 'processing' status`);
      
      if (!processingDocs || processingDocs.length === 0) {
        console.log("ℹ️ No documents with 'processing' status found");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "No processing documents found",
            updated_count: 0,
            organization_id: organization_id
          }),
          { headers: CORS_HEADERS }
        );
      }
      
      // Verify each document has corresponding invoice_lines before updating status
      const documentsToUpdate = [];
      const documentsToFail = [];
      
      for (const doc of processingDocs) {
        const { data: invoiceLines, error: linesError } = await supabase
          .from("invoice_lines")
          .select("id")
          .eq("invoice_number", doc.document_id.toString())
          .eq("organization_id", doc.organization_id)
          .limit(1);
        
        if (linesError) {
          console.error(`❌ Error checking invoice_lines for document ${doc.document_id}:`, linesError);
          documentsToFail.push(doc.document_id);
        } else if (invoiceLines && invoiceLines.length > 0) {
          console.log(`✅ Document ${doc.document_id} has ${invoiceLines.length} invoice_lines - will mark as processed`);
          documentsToUpdate.push(doc.document_id);
        } else {
          console.log(`❌ Document ${doc.document_id} has no invoice_lines - will mark as failed`);
          documentsToFail.push(doc.document_id);
        }
      }
      
      let totalUpdated = 0;
      
      // Update documents with invoice_lines to 'processed'
      if (documentsToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from("processed_tracker")
          .update({ 
            status: "processed", 
            updated_at: new Date().toISOString() 
          })
          .in("document_id", documentsToUpdate)
          .eq("status", "processing");
        
        if (updateError) {
          console.error("❌ Failed to update documents to processed:", updateError);
        } else {
          totalUpdated += documentsToUpdate.length;
          console.log(`✅ Updated ${documentsToUpdate.length} documents to 'processed' status`);
        }
      }
      
      // Update documents without invoice_lines to 'failed'
      if (documentsToFail.length > 0) {
        const { error: failError } = await supabase
          .from("processed_tracker")
          .update({ 
            status: "failed", 
            updated_at: new Date().toISOString() 
          })
          .in("document_id", documentsToFail)
          .eq("status", "processing");
        
        if (failError) {
          console.error("❌ Failed to update documents to failed:", failError);
        } else {
          console.log(`❌ Updated ${documentsToFail.length} documents to 'failed' status (no invoice_lines found)`);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "ETL completion processed successfully",
          updated_count: totalUpdated,
          failed_count: documentsToFail.length,
          organization_id: organization_id,
          processed_documents: documentsToUpdate,
          failed_documents: documentsToFail
        }),
        { headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook received" }),
      { headers: CORS_HEADERS }
    );

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}); 