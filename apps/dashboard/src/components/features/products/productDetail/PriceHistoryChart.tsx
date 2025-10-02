import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/format';

interface PriceHistoryChartProps {
  selectedUnitType: string;
  selectedLocation: string;
  unitTypes: Array<{
    type: string;
    priceHistory: Array<{
      date: Date;
      prices: Array<{
        price: number;
        quantity: number;
        location: string;
        invoiceNumber: string;
      }>;
      avgPrice: number;
      minPrice: number;
      maxPrice: number;
    }>;
  }>;
  locations: string[];
  priceAgreement?: {
    price: number;
    unitType: string;
  };
  onUnitTypeChange: (unitType: string) => void;
  onLocationChange: (location: string) => void;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  selectedUnitType,
  selectedLocation,
  unitTypes,
  locations,
  priceAgreement,
  onUnitTypeChange,
  onLocationChange,
}) => {
  const selectedUnitTypeData = unitTypes.find(ut => ut.type === selectedUnitType);

  // Filter out invalid data points to prevent NaN values
  const validPriceHistory = selectedUnitTypeData?.priceHistory?.filter(point => 
    typeof point.avgPrice === 'number' && 
    !isNaN(point.avgPrice) && 
    typeof point.minPrice === 'number' && 
    !isNaN(point.minPrice) && 
    typeof point.maxPrice === 'number' && 
    !isNaN(point.maxPrice)
  ) || [];

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Price History</h3>
        <div className="flex gap-4">
          <select
            value={selectedUnitType}
            onChange={(e) => onUnitTypeChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
          >
            {unitTypes.map(unitType => (
              <option key={unitType.type} value={unitType.type}>
                {unitType.type}
              </option>
            ))}
          </select>
          <select
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
          >
            <option value="">All Locations</option>
            {locations.map(location => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="h-80">
        {validPriceHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No price history data available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={validPriceHistory}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString('da-DK')}
              interval="preserveStartEnd"
              minTickGap={50}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
                      <p className="font-medium text-gray-900">
                        {new Date(label).toLocaleDateString('da-DK')}
                      </p>
                      <div className="mt-2 space-y-1">
                        {data.minPrice !== data.maxPrice ? (
                          <>
                            <p className="text-sm text-gray-600">
                              Lowest: {formatCurrency(data.minPrice)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Average: {formatCurrency(data.avgPrice)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Highest: {formatCurrency(data.maxPrice)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-600">
                            Price: {formatCurrency(data.minPrice)}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          Transactions: {data.prices.length}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-medium text-gray-700">Price Points:</p>
                        <div className="mt-1 max-h-32 overflow-auto">
                          {data.prices.map((p: { location: string; invoiceNumber: string; price: number; quantity: number }, i: number) => (
                            <div key={`${p.location}-${p.invoiceNumber}-${i}`} className="text-xs text-gray-600">
                              {p.location}: {formatCurrency(p.price)} × {p.quantity}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="avgPrice"
              stroke="#059669"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload, y } = props;
                if (!cx || !cy || typeof y !== 'number' || isNaN(y)) return <></>;
                
                if (payload.minPrice === payload.maxPrice) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      stroke="#059669"
                      strokeWidth={2}
                      fill="#fff"
                    />
                  );
                }
                
                return (
                  <g>
                    <line
                      x1={cx}
                      y1={y - 20}
                      x2={cx}
                      y2={y + 20}
                      stroke="#059669"
                      strokeWidth={2}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#059669"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  </g>
                );
              }}
            />
            {priceAgreement && priceAgreement.unitType === selectedUnitType && (
              <Line
                type="monotone"
                dataKey={() => priceAgreement.price}
                stroke="#047857"
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Negotiated Price"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

