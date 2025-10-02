import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, ExternalLink, BarChart3, FileText, TrendingUp } from 'lucide-react';
import { AccessRequestForm } from './AccessRequestForm';
import { Link } from 'react-router-dom';

export const HeroSection = () => {
  const [showAccessForm, setShowAccessForm] = useState(false);

  const handleDemoClick = () => {
    window.open('https://calendly.com/vergara-projects-e/30min', '_blank');
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-procurement-primary-50 via-white to-procurement-secondary-50 py-20 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-procurement-primary-100 text-procurement-primary-800 border-procurement-primary-200 animate-fade-in">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Procurement Management
            </Badge>
            
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-fade-in leading-tight">
              Procurement Management System
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-4 animate-slide-in-left font-medium">
              Automate Invoice Processing & Optimize Costs
            </p>
            
            <p className="text-lg md:text-xl text-gray-600 mb-8 animate-slide-in-left max-w-3xl mx-auto">
              Transform your procurement with AI-powered document processing, real-time price monitoring, and actionable insights for restaurant groups and hospitality businesses.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
              <Button 
                size="lg" 
                onClick={() => setShowAccessForm(true)}
                className="bg-procurement-primary-600 hover:bg-procurement-primary-700 text-white px-8 py-4 text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Request Access
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleDemoClick}
                className="border-procurement-primary-300 text-procurement-primary-700 hover:bg-procurement-primary-50 px-8 py-4 text-lg"
              >
                Schedule Demo
                <ExternalLink className="ml-2 w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 mt-8 animate-fade-in">
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-2 text-procurement-primary-600" />
                Automated Invoice Processing
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <BarChart3 className="w-4 h-4 mr-2 text-procurement-primary-600" />
                Real-time Analytics
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-2 text-procurement-primary-600" />
                Price Optimization
              </div>
            </div>
            
            <div className="mt-6 animate-fade-in">
              <Link 
                to="/how-it-works"
                className="text-procurement-primary-600 hover:text-procurement-primary-700 font-medium text-sm underline"
              >
                See how it works →
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 mt-6 animate-fade-in">
              Free setup • No commitment • Expert support
            </p>
          </div>
        </div>
      </section>
      
      <AccessRequestForm 
        open={showAccessForm} 
        onOpenChange={setShowAccessForm} 
      />
    </>
  );
};
