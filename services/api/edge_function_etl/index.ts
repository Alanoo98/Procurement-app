import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const REPO = "Alanoo98/procurement-system";
const WORKFLOW_FILE = "etl.yml";

async function runEtl(organization_id: string): Promise<any> {
  console.log("Starting ETL trigger for organization:", organization_id);
  console.log("GitHub token available:", !!GITHUB_TOKEN);
  console.log("GitHub token length:", GITHUB_TOKEN ? GITHUB_TOKEN.length : 0);
  
  if (!GITHUB_TOKEN) {
    throw new Error("GitHub token is not configured. Please set GITHUB_TOKEN environment variable.");
  }
  
  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
  const body = {
    ref: "master",
    inputs: { organization_id }
  };
  
  console.log("Calling GitHub API:", url);
  console.log("Request body:", JSON.stringify(body));
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    
    console.log("GitHub API response status:", res.status);
    console.log("GitHub API response headers:", Object.fromEntries(res.headers.entries()));
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("GitHub API error:", errorText);
      throw new Error(`Failed to trigger GitHub workflow: ${res.status} - ${errorText}`);
    }
    
    const responseText = await res.text();
    console.log("GitHub API response:", responseText);
    
    return { status: "success", message: "ETL workflow triggered in GitHub Actions" };
  } catch (fetchError) {
    console.error("Fetch error:", fetchError);
    throw new Error(`Network error calling GitHub API: ${fetchError.message}`);
  }
}

serve(async (req) => {
  console.log("Edge Function called with method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, x-client-trace-id, x-client-session-id, x-client-user-agent, x-client-request-id",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    console.log("Parsing request body...");
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));
    
    const organization_id = body.organization_id;
    if (!organization_id) {
      console.error("Missing organization_id in request");
      return new Response(JSON.stringify({ error: "Missing required field: organization_id" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    
    console.log("Calling runEtl with organization_id:", organization_id);
    const result = await runEtl(organization_id);
    console.log("ETL trigger successful:", result);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Edge Function error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    const errorResponse = {
      error: err.message,
      name: err.name,
      details: err.stack,
      timestamp: new Date().toISOString(),
      githubTokenConfigured: !!GITHUB_TOKEN,
      repo: REPO,
      workflowFile: WORKFLOW_FILE
    };
    
    console.error("Sending error response:", JSON.stringify(errorResponse));
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}); 