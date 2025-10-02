import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Shield, AlertCircle, CheckCircle, Clock, Users, Eye, BarChart3, Target, Zap } from 'lucide-react';

export const ROICalculator = () => {
  const [monthlySpend, setMonthlySpend] = useState(300000);
  const [locations, setLocations] = useState(3);
  
  const guaranteedSavings = monthlySpend * 0.01 * 12; // 1% minimum annually
  const typicalSavings = monthlySpend * 0.03 * 12; // 3% typical annually
  const timeSavings = locations * 20 * 12; // 20 hours per location per month
  const timeSavingsValue = timeSavings * 200; // 200 DKK/hour average

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const insights = [
    {
      icon: Eye,
      title: "Complete Visibility",
      description: "See exactly what you're spending, where, and with whom across all locations",
      value: "100% transparency"
    },
    {
      icon: Target,
      title: "Price Anomalies",
      description: "Instantly spot when suppliers charge different prices for the same products",
      value: "Real-time alerts"
    },
    {
      icon: BarChart3,
      title: "Trend Analysis",
      description: "Identify spending patterns and seasonal variations in your procurement",
      value: "Predictive insights"
    },
    {
      icon: Users,
      title: "Supplier Performance",
      description: "Track which suppliers deliver the best value and reliability",
      value: "Data-driven decisions"
    },
    {
      icon: Zap,
      title: "Automated Processing",
      description: "Eliminate manual data entry and reduce processing time by 80%",
      value: "80% time savings"
    },
    {
      icon: Shield,
      title: "Compliance Monitoring",
      description: "Ensure all purchases follow your negotiated agreements and policies",
      value: "Risk reduction"
    }
  ];

  return (
    <>
      <section className="py-16 bg-gradient-to-br from-procurement-primary-50 to-procurement-secondary-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Calculate Your Procurement ROI
              </h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                We guarantee minimum 1% savings on your total procurement spend – or your money back.
              </p>
            </div>

            <Card className="border-procurement-primary-200 shadow-lg mb-8">
              <CardHeader className="bg-procurement-primary-600 text-white">
                <CardTitle className="flex items-center text-2xl">
                  <Calculator className="w-6 h-6 mr-3" />
                  Calculate Your Savings
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Monthly procurement spend
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={monthlySpend}
                          onChange={(e) => setMonthlySpend(Number(e.target.value))}
                          className="text-lg font-semibold pl-12 border-procurement-primary-300 focus:border-procurement-primary-500"
                        />
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                          kr.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number of locations
                      </label>
                      <Input
                        type="number"
                        value={locations}
                        onChange={(e) => setLocations(Number(e.target.value))}
                        className="text-lg font-semibold border-procurement-primary-300 focus:border-procurement-primary-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-procurement-primary-50 p-4 rounded-lg border border-procurement-primary-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-procurement-primary-800">Guaranteed savings (1%):</span>
                        <Badge className="bg-procurement-primary-600 text-white">
                          <Shield className="w-3 h-3 mr-1" />
                          Guaranteed
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-procurement-primary-900">
                        {formatCurrency(guaranteedSavings)} per year
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">Typical savings (3%):</span>
                        <Badge className="bg-gray-600 text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Typical
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(typicalSavings)} per year
                      </p>
                    </div>

                    <div className="bg-procurement-secondary-50 p-4 rounded-lg border border-procurement-secondary-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-procurement-secondary-800">Time savings:</span>
                        <Badge className="bg-procurement-secondary-600 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          Efficiency
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-procurement-secondary-900">
                        {formatCurrency(timeSavingsValue)} per year
                      </p>
                      <p className="text-sm text-procurement-secondary-700">
                        {timeSavings} hours saved annually
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-gradient-to-r from-procurement-primary-500 to-procurement-primary-600 rounded-lg text-white">
                  <div className="flex items-center mb-3">
                    <DollarSign className="w-6 h-6 mr-2" />
                    <h3 className="text-xl font-bold">Total Annual ROI:</h3>
                  </div>
                  <p className="text-3xl font-bold mb-2">
                    {formatCurrency(guaranteedSavings + timeSavingsValue)}
                  </p>
                  <p className="text-lg leading-relaxed">
                    Based on {formatCurrency(monthlySpend)} monthly spend across {locations} location{locations > 1 ? 's' : ''}, 
                    including time savings and procurement optimization.
                  </p>
                </div>

                <div className="mt-6 grid md:grid-cols-3 gap-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-procurement-primary-600" />
                    Automated invoice processing
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-procurement-primary-600" />
                    Price monitoring & alerts
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-procurement-primary-600" />
                    Supplier optimization
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Insights Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Valuable Insights from Your Data
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Beyond cost savings, our platform provides actionable insights that transform how you manage procurement.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {insights.map((insight, index) => (
                <Card key={index} className="border-gray-200 hover:border-procurement-primary-300 transition-all duration-300 animate-fade-in hover:shadow-lg" style={{animationDelay: `${index * 0.1}s`}}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-procurement-primary-100 rounded-lg">
                          <insight.icon className="w-6 h-6 text-procurement-primary-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">
                          {insight.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {insight.description}
                        </p>
                        <Badge className="bg-procurement-primary-100 text-procurement-primary-800 border-procurement-primary-200">
                          {insight.value}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <div className="bg-gradient-to-r from-procurement-primary-50 to-procurement-secondary-50 rounded-lg p-8 border border-procurement-primary-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Data-Driven Procurement Decisions
                </h3>
                <p className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto">
                  Stop making procurement decisions in the dark. Our platform gives you the insights you need to negotiate better deals, 
                  identify cost-saving opportunities, and optimize your supplier relationships.
                </p>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div className="flex items-center justify-center text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-procurement-primary-600" />
                    Real-time price monitoring
                  </div>
                  <div className="flex items-center justify-center text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-procurement-primary-600" />
                    Supplier performance tracking
                  </div>
                  <div className="flex items-center justify-center text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-procurement-primary-600" />
                    Automated compliance checks
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
