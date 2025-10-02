import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Database, TrendingUp, Shield, Award, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const handleDemoClick = () => {
    window.open('https://calendly.com/vergara-projects-e/30min', '_blank');
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      {/* Authority Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-6 bg-procurement-primary-100 text-procurement-primary-800 border-procurement-primary-200">
                <Award className="w-4 h-4 mr-2" />
                Built by Industry Experts
              </Badge>
              
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Built by Restaurant Insiders & Data Specialists
              </h2>
              
              <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                We've been in your shoes. As restaurant operators and data specialists, we've struggled with the same 
                procurement challenges you face daily. That's why we built this platform – to solve the problems 
                we've experienced firsthand.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <Card className="border-gray-200 hover:border-procurement-primary-300 transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-procurement-primary-100 rounded-xl mb-6">
                    <Users className="w-8 h-8 text-procurement-primary-600" />
                  </div>
                  <h3 className="font-semibold text-xl mb-4 text-gray-900">Restaurant Insiders</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We've operated restaurants and understand the daily challenges of procurement management, 
                    supplier relationships, and cost optimization.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 hover:border-procurement-primary-300 transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-procurement-primary-100 rounded-xl mb-6">
                    <Database className="w-8 h-8 text-procurement-primary-600" />
                  </div>
                  <h3 className="font-semibold text-xl mb-4 text-gray-900">Data Specialists</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Our expertise in data science and AI enables us to transform complex procurement data 
                    into actionable insights that drive real results.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 hover:border-procurement-primary-300 transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-procurement-primary-100 rounded-xl mb-6">
                    <TrendingUp className="w-8 h-8 text-procurement-primary-600" />
                  </div>
                  <h3 className="font-semibold text-xl mb-4 text-gray-900">Proven Results</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We've helped restaurant groups achieve significant cost savings and operational 
                    improvements through our data-driven approach.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12">
              <div className="flex space-x-8 mb-4 md:mb-0">
                <Link to="/how-it-works" className="text-gray-600 hover:text-procurement-primary-600 transition-colors font-medium">
                  How It Works
                </Link>
                <a href="#" className="text-gray-600 hover:text-procurement-primary-600 transition-colors font-medium">
                  About Us
                </a>
              </div>
              
              <div>
                <button 
                  onClick={handleDemoClick}
                  className="bg-procurement-primary-600 hover:bg-procurement-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
                >
                  Schedule Demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                  <p className="text-gray-600">
                    © 2024 Vergara Projects. Built by restaurant insiders and data specialists.
                  </p>
                </div>
                <div className="flex space-x-8">
                  <a href="#" className="text-gray-600 hover:text-procurement-primary-600 transition-colors">
                    Terms of Service
                  </a>
                  <a href="#" className="text-gray-600 hover:text-procurement-primary-600 transition-colors">
                    Privacy Policy
                  </a>
                  <a href="#" className="text-gray-600 hover:text-procurement-primary-600 transition-colors">
                    Cookie Policy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
};
