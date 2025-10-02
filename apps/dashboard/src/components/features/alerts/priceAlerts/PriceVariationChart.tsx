import React from 'react';
import { formatCurrency } from '@/utils/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  date: Date;
  unitType: string;
  basePrice: number;
  variationPrice: number | null;
  priceDifference: number;
  hasVariation: boolean;
}

interface PriceVariationChartProps {
  data: ChartDataPoint[];
}

export const PriceVariationChart: React.FC<PriceVariationChartProps> = ({ data }) => {
  const chartData = data.map(point => ({
    ...point,
    date: point.date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' }),
    basePriceFormatted: formatCurrency(point.basePrice),
    variationPriceFormatted: point.variationPrice ? formatCurrency(point.variationPrice) : 'N/A',
    priceDifferenceFormatted: formatCurrency(point.priceDifference),
  }));

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint & {
      date: string;
      basePriceFormatted: string;
      variationPriceFormatted: string;
      priceDifferenceFormatted: string;
    } }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Base Price: <span className="font-medium text-green-600">{data.basePriceFormatted}</span>
          </p>
          {data.variationPrice && (
            <p className="text-sm text-gray-600">
              Variation Price: <span className="font-medium text-red-600">{data.variationPriceFormatted}</span>
            </p>
          )}
          {data.hasVariation && (
            <p className="text-sm text-gray-600">
              Difference: <span className="font-medium text-amber-600">{data.priceDifferenceFormatted}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Price Variation Over Time</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="basePrice"
            stroke="#059669"
            strokeWidth={2}
            dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
            name="Base Price"
          />
          <Line
            type="monotone"
            dataKey="variationPrice"
            stroke="#dc2626"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
            name="Variation Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 

