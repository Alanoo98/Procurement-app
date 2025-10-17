/**
 * Catalog Introspection Gate Component
 * Gates expensive catalog/introspection queries behind admin routes
 * Prevents expensive CTEs from running on dashboard mount
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface CatalogData {
  tables: Array<{
    id: string;
    schema: string;
    name: string;
    size: string;
    live_rows_estimate: number;
    dead_rows_estimate: number;
  }>;
  functions: Array<{
    id: string;
    schema: string;
    name: string;
    language: string;
    behavior: string;
  }>;
  lastUpdated: string;
}

export const CatalogIntrospectionGate: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [lastCacheTime, setLastCacheTime] = useState<string | null>(null);

  // Check if user has admin privileges (simplified check)
  const isAdmin = currentOrganization?.role === 'admin' || 
                  currentOrganization?.role === 'owner';

  // Expensive catalog query - only runs when admin mode is enabled
  const { data: catalogData, isLoading, error, refetch } = useQuery({
    queryKey: ['catalog-introspection', currentOrganization?.id],
    queryFn: async (): Promise<CatalogData> => {
      // This would be the expensive CTE query that was causing performance issues
      // In practice, this would call a Supabase RPC or direct SQL
      const response = await fetch('/api/catalog-introspection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          organizationId: currentOrganization?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch catalog data');
      }

      return response.json();
    },
    enabled: isAdminMode && isAdmin,
    staleTime: 60 * 60 * 1000, // 1 hour cache
    gcTime: 2 * 60 * 60 * 1000, // 2 hours garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Load cache time from localStorage
  useEffect(() => {
    const cached = localStorage.getItem('catalog-cache-time');
    if (cached) {
      setLastCacheTime(cached);
    }
  }, []);

  // Update cache time when data is fetched
  useEffect(() => {
    if (catalogData) {
      const now = new Date().toISOString();
      setLastCacheTime(now);
      localStorage.setItem('catalog-cache-time', now);
    }
  }, [catalogData]);

  const handleEnableAdminMode = () => {
    setIsAdminMode(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Access Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This feature requires admin privileges. Catalog introspection queries are expensive
              and are gated behind admin access to prevent performance issues.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Catalog Introspection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Performance Warning:</strong> Catalog introspection queries are expensive
                and can impact database performance. These queries are cached for 1 hour and should
                only be run when necessary.
              </AlertDescription>
            </Alert>

            {!isAdminMode ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enable admin mode to access database catalog information. This will run expensive
                  introspection queries that are cached for performance.
                </p>
                <Button onClick={handleEnableAdminMode} className="w-full">
                  Enable Admin Mode
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Admin Mode Active</Badge>
                    {lastCacheTime && (
                      <Badge variant="secondary">
                        Last updated: {new Date(lastCacheTime).toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <Button 
                    onClick={handleRefresh} 
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Refreshing...
                      </>
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>

                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running expensive catalog introspection queries...
                  </div>
                )}

                {error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to fetch catalog data: {error.message}
                    </AlertDescription>
                  </Alert>
                )}

                {catalogData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Database Tables</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {catalogData.tables.slice(0, 5).map((table) => (
                              <div key={table.id} className="flex justify-between text-sm">
                                <span>{table.schema}.{table.name}</span>
                                <span className="text-gray-500">{table.size}</span>
                              </div>
                            ))}
                            {catalogData.tables.length > 5 && (
                              <div className="text-sm text-gray-500">
                                +{catalogData.tables.length - 5} more tables
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Database Functions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {catalogData.functions.slice(0, 5).map((func) => (
                              <div key={func.id} className="flex justify-between text-sm">
                                <span>{func.schema}.{func.name}</span>
                                <span className="text-gray-500">{func.language}</span>
                              </div>
                            ))}
                            {catalogData.functions.length > 5 && (
                              <div className="text-sm text-gray-500">
                                +{catalogData.functions.length - 5} more functions
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4" />
                      Catalog data cached until {new Date(Date.now() + 60 * 60 * 1000).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};




