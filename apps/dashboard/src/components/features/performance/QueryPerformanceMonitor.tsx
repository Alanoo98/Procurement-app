/**
 * Query Performance Monitor Component
 * Tracks and displays query performance metrics to help identify slow queries
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Database, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface QueryMetric {
  id: string;
  name: string;
  duration: number;
  rowCount: number;
  timestamp: number;
  status: 'success' | 'error' | 'slow';
  suggestions?: string[];
}

interface PerformanceStats {
  totalQueries: number;
  averageDuration: number;
  slowQueries: number;
  totalRows: number;
  cacheHitRate: number;
}

export const QueryPerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<QueryMetric[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalQueries: 0,
    averageDuration: 0,
    slowQueries: 0,
    totalRows: 0,
    cacheHitRate: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Simulate performance monitoring (in real implementation, this would connect to actual metrics)
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      // Simulate new query metrics
      const newMetric: QueryMetric = {
        id: Date.now().toString(),
        name: `Query ${Math.floor(Math.random() * 100)}`,
        duration: Math.random() * 5000,
        rowCount: Math.floor(Math.random() * 10000),
        timestamp: Date.now(),
        status: Math.random() > 0.8 ? 'slow' : 'success',
        suggestions: Math.random() > 0.7 ? ['Consider adding indexes', 'Use cursor pagination'] : undefined
      };

      setMetrics(prev => [newMetric, ...prev.slice(0, 49)]); // Keep last 50 metrics
    }, 2000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Calculate stats from metrics
  useEffect(() => {
    if (metrics.length === 0) return;

    const totalQueries = metrics.length;
    const averageDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const slowQueries = metrics.filter(m => m.duration > 2000).length;
    const totalRows = metrics.reduce((sum, m) => sum + m.rowCount, 0);
    const cacheHitRate = Math.random() * 100; // Simulate cache hit rate

    setStats({
      totalQueries,
      averageDuration,
      slowQueries,
      totalRows,
      cacheHitRate
    });
  }, [metrics]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'slow':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'slow':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatRows = (count: number) => {
    if (count < 1000) return count.toString();
    return `${(count / 1000).toFixed(1)}k`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Query Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => setIsMonitoring(!isMonitoring)}
              variant={isMonitoring ? "destructive" : "default"}
            >
              {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
            </Button>
            <Badge variant="outline">
              {isMonitoring ? "Active" : "Inactive"}
            </Badge>
          </div>

          {isMonitoring && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Performance monitoring is active. This will track query performance metrics
                to help identify slow queries and optimization opportunities.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Queries</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalQueries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Avg Duration</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(stats.averageDuration)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Slow Queries</span>
            </div>
            <div className="text-2xl font-bold">{stats.slowQueries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Cache Hit Rate</span>
            </div>
            <div className="text-2xl font-bold">{stats.cacheHitRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Query Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Query Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(metric.status)}
                  <div>
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{formatDuration(metric.duration)}</div>
                    <div className="text-sm text-gray-500">{formatRows(metric.rowCount)} rows</div>
                  </div>
                  <Badge className={getStatusColor(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      {metrics.some(m => m.suggestions && m.suggestions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics
                .filter(m => m.suggestions && m.suggestions.length > 0)
                .map((metric) => (
                  <div key={metric.id} className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">{metric.name}</div>
                    <ul className="list-disc list-inside space-y-1">
                      {metric.suggestions?.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

