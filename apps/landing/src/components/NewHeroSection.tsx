import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const NewHeroSection = () => {
  return (
    <section id="home" className="relative bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 py-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-teal-600/20 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-emerald-500/20 rounded-full blur-lg animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-teal-500/15 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-10 right-1/3 w-20 h-20 bg-emerald-400/25 rounded-full blur-lg animate-float-delayed"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Main Headline */}
          <AnimatedSection animation="fadeInDown" delay={0.2}>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Intelligent procurement der 
              <span className="text-emerald-400"> sparer penge</span>
            </h1>
          </AnimatedSection>
          
          {/* Subtitle */}
          <AnimatedSection animation="fadeInUp" delay={0.4}>
            <p className="text-xl md:text-2xl text-teal-100 mb-12 max-w-5xl mx-auto leading-relaxed">
              ProcurementD6 giver dig AI-drevet indsigt i dine indkøb, så du kan forhandle bedre priser, 
              optimere vareprocenter og få maksimal værdi ud af hver leverandørrelation.
            </p>
          </AnimatedSection>

          {/* CTA Button */}
          <AnimatedSection animation="scaleIn" delay={0.6}>
            <div className="mb-12">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-5 text-xl font-semibold rounded-full shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105 hover-lift">
                Start med prøveperiode
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </div>
          </AnimatedSection>

          {/* Trial Info */}
          <AnimatedSection animation="fadeInUp" delay={0.8}>
            <div className="flex items-center justify-center space-x-3 text-teal-200">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <span className="text-lg">Gratis 30-dages prøveperiode med fuld adgang til alle funktioner</span>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default NewHeroSection;
