import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { ProductEfficiencyChart, TimeBasedEfficiencyMetric } from '@/hooks/metrics/useTimeBasedEfficiency';

interface EfficiencyChartsProps {
  chartData: ProductEfficiencyChart;
  allMetrics?: TimeBasedEfficiencyMetric[];
  onClose?: () => void;
}

export const EfficiencyCharts: React.FC<EfficiencyChartsProps> = ({ chartData, allMetrics, onClose }) => {
  const [selectedMetric, setSelectedMetric] = useState<'spendPerPax' | 'efficiency' | 'volatility'>('spendPerPax');
  const [smoothingLevel, setSmoothingLevel] = useState<'raw' | 'short' | 'medium' | 'long'>('medium');
  const [dataGranularity, setDataGranularity] = useState<'monthly' | 'individual'>('individual');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([chartData.locationName]);

  // Get all locations that have purchased this specific product
  const availableLocations = useMemo(() => {
    if (!allMetrics) {
      return [];
    }
    
    const locations = allMetrics
      .filter(metric => metric.productCode === chartData.productCode)
      .map(metric => ({
        id: metric.locationId,
        name: metric.locationName,
        unitType: metric.unitType,
        efficiencyScore: metric.efficiencyScore,
        totalSpend: metric.timeSeries.reduce((sum, point) => sum + point.totalSpend, 0),
        dataPoints: metric.timeSeries.length
      }))
      .filter((location, index, self) => 
        index === self.findIndex(l => l.id === location.id)
      )
      .sort((a, b) => b.totalSpend - a.totalSpend); // Sort by total spend (highest first)
    return locations;
  }, [allMetrics, chartData.productCode]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = (payload[0] as { payload: Record<string, string | number | Date | boolean> }).payload;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-900">
            {(() => {
              if (!label) return '';
              
              try {
                const date = new Date(label);
                if (isNaN(date.getTime())) {
                  return label.toString(); // Show the raw value if date parsing fails
                }
                return date.toLocaleDateString('da-DK', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                });
              } catch {
                return label.toString(); // Fallback to showing the raw value
              }
            })()}
          </p>
          
          {selectedLocations.length === 1 ? (
            // Single location tooltip
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">
                Spend per PAX: {formatCurrency(Number(data.spendPerPax) || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Total Spend: {formatCurrency(Number(data.totalSpend) || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Total PAX: {(Number(data.totalPax) || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Quantity: {(Number(data.quantity) || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Avg Price: {formatCurrency(Number(data.avgPrice) || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Transactions: {Number(data.transactionCount) || 0}
              </p>
              {selectedMetric === 'efficiency' && (
                <p className="text-sm text-gray-600">
                  Efficiency: {(Number(data.efficiency) || 0).toFixed(1)}%
                </p>
              )}
            </div>
          ) : (
            // Multi-location tooltip
            <div className="mt-2 space-y-2">
              {selectedLocations.map(locationName => {
                const spendPerPax = Number(data[`${locationName}_spendPerPax`]);
                const totalSpend = Number(data[`${locationName}_totalSpend`]);
                const totalPax = Number(data[`${locationName}_totalPax`]);
                const quantity = Number(data[`${locationName}_quantity`]);
                const avgPrice = Number(data[`${locationName}_avgPrice`]);
                const transactionCount = Number(data[`${locationName}_transactionCount`]);
                const efficiency = Number(data[`${locationName}_efficiency`]);
                
                if (isNaN(spendPerPax)) return null;
                
                return (
                  <div key={locationName} className="border-l-4 border-gray-200 pl-3">
                    <p className="text-sm font-medium text-gray-800">{locationName}</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-gray-600">
                        Spend per PAX: {formatCurrency(spendPerPax)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Total Spend: {formatCurrency(totalSpend || 0)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Total PAX: {(totalPax || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        Quantity: {(quantity || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        Avg Price: {formatCurrency(avgPrice || 0)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Transactions: {transactionCount || 0}
                      </p>
                      {selectedMetric === 'efficiency' && (
                        <p className="text-xs text-gray-600">
                          Efficiency: {(efficiency || 0).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Generate multi-location chart data
  const getMultiLocationChartData = () => {
    if (!allMetrics) {
      return [];
    }
    
    const allPeriods = new Set<string>();
    
    // Collect all unique periods from selected locations
    selectedLocations.forEach(locationName => {
      const locationMetric = allMetrics.find(metric => 
        metric.productCode === chartData.productCode && 
        metric.locationName === locationName
      );
      if (locationMetric) {
        locationMetric.timeSeries.forEach(point => allPeriods.add(point.period));
      }
    });
    
    const sortedPeriods = Array.from(allPeriods).sort();
    
    return sortedPeriods.map(period => {
      const dataPoint: Record<string, string | number | Date | boolean> = {
        period: dataGranularity === 'individual' 
          ? new Date(period + '-15') 
          : new Date(period + '-15'),
        isMainPoint: true,
      };
      
      // Add data for each selected location
      selectedLocations.forEach(locationName => {
        const locationMetric = allMetrics?.find(metric => 
          metric.productCode === chartData.productCode && 
          metric.locationName === locationName
        );
        
        if (locationMetric) {
          const periodData = locationMetric.timeSeries.find(p => p.period === period);
          if (periodData) {
            // Add raw data
            dataPoint[`${locationName}_spendPerPax`] = periodData.spendPerPax;
            dataPoint[`${locationName}_totalSpend`] = periodData.totalSpend;
            dataPoint[`${locationName}_totalPax`] = periodData.totalPax;
            dataPoint[`${locationName}_quantity`] = periodData.quantity;
            dataPoint[`${locationName}_avgPrice`] = periodData.avgPrice;
            dataPoint[`${locationName}_transactionCount`] = periodData.transactionCount;
            
            // Calculate smoothed data for this location
            const locationTimeSeries = locationMetric.timeSeries;
            const currentIndex = locationTimeSeries.findIndex(p => p.period === period);
            
            if (currentIndex >= 0) {
              // Calculate smoothing windows
              const shortWindow = Math.min(2, currentIndex + 1);
              const mediumWindow = Math.min(3, currentIndex + 1);
              const longWindow = Math.min(6, currentIndex + 1);
              
              // Get data for each window
              const shortData = locationTimeSeries.slice(Math.max(0, currentIndex - shortWindow + 1), currentIndex + 1);
              const mediumData = locationTimeSeries.slice(Math.max(0, currentIndex - mediumWindow + 1), currentIndex + 1);
              const longData = locationTimeSeries.slice(Math.max(0, currentIndex - longWindow + 1), currentIndex + 1);
              
              // Calculate volume-weighted averages
              const shortTrend = shortData.length > 0 ? 
                shortData.reduce((sum, p) => sum + (p.spendPerPax * p.totalSpend), 0) / 
                shortData.reduce((sum, p) => sum + p.totalSpend, 0) : periodData.spendPerPax;
              
              const mediumTrend = mediumData.length > 0 ? 
                mediumData.reduce((sum, p) => sum + (p.spendPerPax * p.totalSpend), 0) / 
                mediumData.reduce((sum, p) => sum + p.totalSpend, 0) : periodData.spendPerPax;
              
              const longTrend = longData.length > 0 ? 
                longData.reduce((sum, p) => sum + (p.spendPerPax * p.totalSpend), 0) / 
                longData.reduce((sum, p) => sum + p.totalSpend, 0) : periodData.spendPerPax;
              
              // Calculate efficiency
              const efficiency = mediumTrend > 0 ? Math.max(0, 100 - ((periodData.spendPerPax - mediumTrend) / mediumTrend * 100)) : 0;
              
              // Add smoothed data
              dataPoint[`${locationName}_shortTrend`] = shortTrend;
              dataPoint[`${locationName}_mediumTrend`] = mediumTrend;
              dataPoint[`${locationName}_longTrend`] = longTrend;
              dataPoint[`${locationName}_efficiency`] = efficiency;
            }
          }
        }
      });
      
      return dataPoint;
    });
  };

  const getChartData = () => {
    if (selectedLocations.length > 1) {
      return getMultiLocationChartData();
    }
    
    // Single location logic (existing)
    if (dataGranularity === 'individual') {
      // For individual view, we'll simulate more data points by interpolating between months
      // This creates a more granular view even with monthly data
      const expandedData: Array<{
        period: Date;
        spendPerPax: number;
        totalSpend: number;
        totalPax: number;
        quantity: number;
        avgPrice: number;
        transactionCount: number;
        shortTrend: number;
        mediumTrend: number;
        longTrend: number;
        efficiency: number;
        isMainPoint: boolean;
      }> = [];
      
      chartData.chartData.forEach((point, index) => {
        const currentDate = new Date(point.period + '-15');
        
        // Add the main data point
        expandedData.push({
          ...point,
          period: currentDate,
          isMainPoint: true,
        });
        
        // Add intermediate points for better visualization (if not the last point)
        if (index < chartData.chartData.length - 1) {
          const nextPoint = chartData.chartData[index + 1];
          const nextDate = new Date(nextPoint.period + '-15');
          const daysDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Add intermediate points every 7 days
          for (let i = 7; i < daysDiff; i += 7) {
            const intermediateDate = new Date(currentDate.getTime() + (i * 24 * 60 * 60 * 1000));
            const progress = i / daysDiff;
            
            expandedData.push({
              ...point,
              period: intermediateDate,
              spendPerPax: point.spendPerPax + (nextPoint.spendPerPax - point.spendPerPax) * progress,
              isMainPoint: false,
            });
          }
        }
      });
      
      return expandedData;
    } else {
      // Monthly view - use middle of month
      return chartData.chartData.map(point => ({
        ...point,
        period: new Date(point.period + '-15'),
        isMainPoint: true,
      }));
    }
  };

  const getYAxisFormatter = () => {
    switch (selectedMetric) {
      case 'efficiency':
        return (value: number) => `${value.toFixed(0)}%`;
      case 'spendPerPax':
      default:
        return (value: number) => formatCurrency(value);
    }
  };

  const getDataKey = (locationName?: string) => {
    const baseKey = (() => {
      switch (selectedMetric) {
        case 'efficiency':
          return 'efficiency';
        case 'spendPerPax':
        default:
          // Return the appropriate smoothing level for spend per PAX
          switch (smoothingLevel) {
            case 'raw':
              return 'spendPerPax';
            case 'short':
              return 'shortTrend';
            case 'medium':
              return 'mediumTrend';
            case 'long':
              return 'longTrend';
            default:
              return 'mediumTrend';
          }
      }
    })();
    
    // For multi-location view, prefix with location name
    if (selectedLocations.length > 1 && locationName) {
      return `${locationName}_${baseKey}`;
    }
    
    return baseKey;
  };

  const getLineColor = (locationName?: string) => {
    if (selectedLocations.length > 1 && locationName) {
      // Different colors for different locations
      const colors = ['#3b82f6', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#be123c'];
      const index = selectedLocations.indexOf(locationName);
      return colors[index % colors.length];
    }
    
    switch (selectedMetric) {
      case 'efficiency':
        return '#059669'; // Green for efficiency
      case 'spendPerPax':
      default:
        return '#3b82f6'; // Blue for spend per PAX
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Efficiency Analysis: {chartData.description}
          </h3>
          <p className="text-sm text-gray-500">
            {chartData.productCode} · {chartData.locationName} · {chartData.unitType}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>


      {/* Chart Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as 'spendPerPax' | 'efficiency' | 'volatility')}
            className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="spendPerPax">Spend per PAX</option>
            <option value="efficiency">Efficiency Score</option>
          </select>
        </div>
        
        {selectedMetric === 'spendPerPax' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Smoothing:</span>
            <select
              value={smoothingLevel}
              onChange={(e) => setSmoothingLevel(e.target.value as 'raw' | 'short' | 'medium' | 'long')}
              className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
            >
              <option value="raw">Raw Data</option>
              <option value="short">2-Month Average</option>
              <option value="medium">3-Month Average</option>
              <option value="long">6-Month Average</option>
            </select>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Data View:</span>
          <select
            value={dataGranularity}
            onChange={(e) => setDataGranularity(e.target.value as 'monthly' | 'individual')}
            className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="monthly">Monthly Aggregated</option>
            <option value="individual">Individual Invoices</option>
          </select>
        </div>
      </div>

      {/* Location Comparison Section */}
      {availableLocations.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Compare Locations:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLocations(availableLocations.map(l => l.name))}
                className="text-xs text-emerald-600 hover:text-emerald-800"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedLocations([chartData.locationName])}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {availableLocations.map(location => (
              <label key={location.id} className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(location.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLocations([...selectedLocations, location.name]);
                    } else {
                      setSelectedLocations(selectedLocations.filter(name => name !== location.name));
                    }
                  }}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{location.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}


      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={getChartData()}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickFormatter={(value) => {
                const date = new Date(value);
                if (dataGranularity === 'individual') {
                  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
                } else {
                  return date.toLocaleDateString('da-DK', { month: 'short', year: 'numeric' });
                }
              }}
              interval="preserveStartEnd"
              minTickGap={dataGranularity === 'individual' ? 30 : 50}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={getYAxisFormatter()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Render lines for each selected location */}
            {selectedLocations.map((locationName) => (
              <Line
                key={locationName}
                type="monotone"
                dataKey={getDataKey(locationName)}
                stroke={getLineColor(locationName)}
                strokeWidth={3}
                name={locationName}
                dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  if (!cx || !cy) return <></>;
                  
                  // Show different dot styles for main points vs interpolated points
                  if (dataGranularity === 'individual' && payload?.isMainPoint === false) {
                    return (
                      <circle
                        key={`${locationName}-dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={2}
                        fill={getLineColor(locationName)}
                        fillOpacity={0.3}
                      />
                    );
                  } else {
                    return (
                      <circle
                        key={`${locationName}-dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={getLineColor(locationName)}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }
                }}
                activeDot={{ r: 6, stroke: getLineColor(locationName), strokeWidth: 2 }}
              />
            ))}
            
            {/* Show raw data as background line when smoothing is applied */}
            {selectedMetric === 'spendPerPax' && smoothingLevel !== 'raw' && (
              <Line
                type="monotone"
                dataKey="spendPerPax"
                stroke="#e5e7eb"
                strokeWidth={1}
                dot={false}
                activeDot={false}
                connectNulls={false}
                name="Raw Data"
              />
            )}
            
            {/* Reference lines for efficiency */}
            {selectedMetric === 'efficiency' && (
              <>
                <ReferenceLine y={80} stroke="#059669" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
