import Card from '../ui/Card';
import StatusIndicator from '../ui/StatusIndicator';
import { 
  AlertTriangle, 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Eye
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Procurement Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          Track performance, identify opportunities, and optimize your procurement strategy
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Alerts Card */}
        <Card>
          <Card.Header
            title="Price Alerts"
            icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
            info
            action={{ label: "View All Alerts" }}
          />
          <Card.Content>
            <div className="space-y-4">
              {/* Active Alerts */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-800">Active Alerts</p>
                </div>
                <div className="text-2xl font-bold text-red-600">1</div>
              </div>

              {/* Potential Savings */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">Potential Savings</p>
                </div>
                <div className="text-2xl font-bold text-green-600">135,00 kr.</div>
              </div>

              {/* Alert Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">#1 Soap Dispense - White</h4>
                  <button className="btn btn-sm btn-secondary">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Variations</p>
                    <p className="font-medium">1</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unit Type</p>
                    <p className="font-medium">pcs</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Max Difference</p>
                    <p className="font-medium">15,00 kr.</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-red-600 flex items-center">
                    <span>Price variations detected across 1 dates</span>
                    <TrendingUp className="w-4 h-4 ml-1" />
                  </p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Inefficient Products Card */}
        <Card>
          <Card.Header
            title="Inefficient Products"
            icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
            info
            action={{ label: "Configure Groups" }}
          />
          <Card.Content>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">
                All products are performing efficiently
              </p>
            </div>
          </Card.Content>
        </Card>

        {/* Product Targets Card */}
        <Card className="lg:col-span-2">
          <Card.Header
            title="Product Targets"
            icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
            info
            action={{ label: "View All Targets" }}
          />
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Target 1 */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Cost Reduction</h3>
                <p className="text-2xl font-bold text-emerald-600 mb-1">15%</p>
                <p className="text-sm text-gray-500">Target achieved</p>
                <StatusIndicator variant="success" className="mt-2">
                  On Track
                </StatusIndicator>
              </div>

              {/* Target 2 */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Efficiency</h3>
                <p className="text-2xl font-bold text-blue-600 mb-1">92%</p>
                <p className="text-sm text-gray-500">Above target</p>
                <StatusIndicator variant="success" className="mt-2">
                  Exceeding
                </StatusIndicator>
              </div>

              {/* Target 3 */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Supplier Relations</h3>
                <p className="text-2xl font-bold text-yellow-600 mb-1">78%</p>
                <p className="text-sm text-gray-500">Below target</p>
                <StatusIndicator variant="warning" className="mt-2">
                  Needs Attention
                </StatusIndicator>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

