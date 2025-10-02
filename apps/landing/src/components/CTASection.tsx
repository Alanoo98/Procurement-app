import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Users, Zap, ExternalLink, BarChart3 } from 'lucide-react';
import { AccessRequestForm } from './AccessRequestForm';

export const CTASection = () => {
  const [showAccessForm, setShowAccessForm] = useState(false);

  const handleDemoClick = () => {
    window.open('https://calendly.com/vergara-projects-e/30min', '_blank');
  };

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-procurement-primary-600 via-procurement-primary-700 to-procurement-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 text-white border-white/30">
              <Zap className="w-4 h-4 mr-2" />
              Request Access – Start optimizing your procurement today
            </Badge>
            
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">
              Transform Your Procurement Management
            </h2>
            
            <p className="text-xl text-procurement-primary-100 mb-8 max-w-2xl mx-auto">
              Join restaurant groups and hospitality businesses already saving time and money with AI-powered procurement automation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg" 
                onClick={() => setShowAccessForm(true)}
                className="bg-white text-procurement-primary-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Request Access
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <Button 
                size="lg"
                onClick={handleDemoClick}
                className="bg-white text-procurement-primary-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Schedule Demo
                <ExternalLink className="ml-2 w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <Shield className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Free Setup</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-white font-medium">AI-Powered Analytics</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Expert Support</p>
                </CardContent>
              </Card>
            </div>
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
