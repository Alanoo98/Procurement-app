import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

export const ConfigurationStatus: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isConfigured = supabaseUrl && supabaseAnonKey;

  if (isConfigured) {
    return null; // Don't show anything if configured
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Supabase Not Configured
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              The admin portal is not connected to your Supabase database. 
              To see real data, you need to configure your environment variables.
            </p>
            <div className="mt-3">
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a <code className="bg-yellow-100 px-1 rounded">.env</code> file in the <code className="bg-yellow-100 px-1 rounded">procurement-admin</code> directory</li>
                <li>Add your Supabase URL and API key</li>
                <li>Restart the development server</li>
              </ol>
            </div>
            <div className="mt-3">
              <a 
                href="/env-setup.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
              >
                View setup instructions
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
