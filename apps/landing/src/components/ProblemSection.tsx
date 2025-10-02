
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, FileText, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';

export const ProblemSection = () => {
  const problems = [
    {
      icon: FileText,
      title: "Manual Invoice Processing",
      description: "Hours spent manually entering data from PDFs and paper invoices"
    },
    {
      icon: TrendingUp,
      title: "Price Inconsistencies",
      description: "Different prices for the same products across suppliers and locations"
    },
    {
      icon: Clock,
      title: "Reactive Procurement",
      description: "No real-time visibility into spending patterns and cost trends"
    },
    {
      icon: DollarSign,
      title: "Hidden Costs",
      description: "Missed opportunities for bulk discounts and supplier negotiations"
    },
    {
      icon: Users,
      title: "Multi-Location Chaos",
      description: "Inconsistent procurement practices across restaurant locations"
    },
    {
      icon: AlertTriangle,
      title: "No Central Oversight",
      description: "Lack of unified view into supplier performance and spend analytics"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Struggling with Procurement Management?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Restaurant groups face these common challenges:
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {problems.map((problem, index) => (
            <Card key={index} className="border-gray-200 hover:border-blue-300 transition-colors duration-300 animate-fade-in hover:shadow-md" style={{animationDelay: `${index * 0.1}s`}}>
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mb-4">
                  <problem.icon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {problem.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {problem.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-2xl font-serif font-bold text-blue-800">
            There's a better way to manage procurement.
          </p>
        </div>
      </div>
    </section>
  );
};
