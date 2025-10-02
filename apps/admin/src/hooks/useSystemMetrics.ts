import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface SystemMetrics {
  totalOrganizations: number;
  totalBusinessUnits: number;
  totalLocations: number;
  totalUsers: number;
  totalInvitations: number;
  pendingInvitations: number;
  systemUptime: number;
  averageResponseTime: number;
  errorRate: number;
  storageUsed: number;
  lastBackup: string;
}

export interface PerformanceMetric {
  id: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
  status: 'good' | 'warning' | 'critical';
}

export const useSystemMetrics = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalOrganizations: 0,
    totalBusinessUnits: 0,
    totalLocations: 0,
    totalUsers: 0,
    totalInvitations: 0,
    pendingInvitations: 0,
    systemUptime: 0,
    averageResponseTime: 0,
    errorRate: 0,
    storageUsed: 0,
    lastBackup: ''
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch basic counts
      const [orgsResult, unitsResult, locationsResult, usersResult, invitationsResult] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('business_units').select('id', { count: 'exact', head: true }),
        supabase.from('locations').select('id', { count: 'exact', head: true }),
        supabase.from('organization_users').select('id', { count: 'exact', head: true }),
        supabase.from('organization_invitations').select('id, status', { count: 'exact' })
      ]);

      const pendingInvitations = invitationsResult.data?.filter(inv => inv.status === 'pending').length || 0;

      const metrics: SystemMetrics = {
        totalOrganizations: orgsResult.count || 0,
        totalBusinessUnits: unitsResult.count || 0,
        totalLocations: locationsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalInvitations: invitationsResult.count || 0,
        pendingInvitations,
        systemUptime: 0, // Will be calculated from real monitoring data
        averageResponseTime: 0, // Will be calculated from real API response times
        errorRate: 0, // Will be calculated from real error logs
        storageUsed: 0, // Will be calculated from real storage monitoring
        lastBackup: '' // Will be fetched from backup system
      };

      setSystemMetrics(metrics);

      // Performance metrics will be populated from real monitoring data
      const perfMetrics: PerformanceMetric[] = [];

      setPerformanceMetrics(perfMetrics);

    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch system metrics');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = () => {
    const criticalIssues = performanceMetrics.filter(m => m.status === 'critical').length;
    const warnings = performanceMetrics.filter(m => m.status === 'warning').length;
    
    if (criticalIssues > 0) return 'critical';
    if (warnings > 2) return 'warning';
    return 'healthy';
  };

  const getUptimeStatus = () => {
    if (systemMetrics.systemUptime >= 99.9) return 'excellent';
    if (systemMetrics.systemUptime >= 99.0) return 'good';
    if (systemMetrics.systemUptime >= 95.0) return 'warning';
    return 'critical';
  };

  useEffect(() => {
    fetchSystemMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    systemMetrics,
    performanceMetrics,
    loading,
    error,
    refetch: fetchSystemMetrics,
    getHealthStatus,
    getUptimeStatus
  };
};
