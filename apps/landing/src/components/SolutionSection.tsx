
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FileText, AlertTriangle, BarChart3, Database, TrendingDown, Users, Zap, Shield, Target } from 'lucide-react';

export const SolutionSection = () => {
  const solutions = [
    {
      icon: FileText,
      title: "AI-Powered Document Processing",
      description: "Connect your e-conomic system or upload documents manually. Nanonets AI automatically extracts supplier, location, product, and pricing data from all invoices."
    },
    {
      icon: AlertTriangle,
      title: "Real-Time Price Monitoring",
      description: "Get instant alerts when suppliers change prices or violate agreements. Monitor price trends and identify cost-saving opportunities across all locations."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics & PAX Metrics",
      description: "Comprehensive dashboards showing cost per guest, location performance, and spend analysis. Includes credit notes, refunds, and detailed cost breakdowns."
    },
    {
      icon: Target,
      title: "Supplier Performance Tracking",
      description: "Identify suppliers who overcharge based on market data and negotiated agreements. Track supplier reliability and performance metrics."
    },
    {
      icon: Database,
      title: "Centralized Procurement Hub",
      description: "Complete setup included with data onboarding and analysis training. Everything in one place for streamlined procurement management."
    },
    {
      icon: Zap,
      title: "Automated Cost Optimization",
      description: "AI-driven recommendations for bulk purchasing, supplier negotiations, and cost reduction strategies based on your spending patterns."
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-procurement-primary-50 to-procurement-secondary-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How Our Platform Transforms Your Procurement
          </h2>
          <div className="w-24 h-1 bg-procurement-primary-500 mx-auto mb-8"></div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {solutions.map((solution, index) => (
            <Card key={index} className="border-procurement-primary-200 bg-white hover:shadow-lg transition-all duration-300 animate-fade-in" style={{animationDelay: `${index * 0.15}s`}}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-procurement-primary-100 rounded-lg">
                      <solution.icon className="w-6 h-6 text-procurement-primary-600" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 text-procurement-primary-500 mr-2 flex-shrink-0" />
                      <h3 className="font-semibold text-lg text-gray-900">
                        {solution.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {solution.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
