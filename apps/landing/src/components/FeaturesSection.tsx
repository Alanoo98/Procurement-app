import { CheckCircle, Users, BarChart3, TrendingUp, Calendar, Cloud, Globe, MessageCircle } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-10 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-teal-100/20 rounded-full blur-2xl animate-float-delayed"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeInUp" delay={0.2}>
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Sådan fungerer det
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              ProcurementD6 giver dig de værktøjer du mangler for at tage kontrol over dine indkøb
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* AI Forecasts */}
          <AnimatedSection animation="fadeInUp" delay={0.3}>
            <div className="text-center group hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <TrendingUp className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Smart Forudsigelser</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Vores AI analyserer dine data og fortæller dig præcis hvad du skal købe, hvornår og hvor meget.
              </p>
            </div>
          </AnimatedSection>

          {/* Leverandør Management */}
          <AnimatedSection animation="fadeInUp" delay={0.4}>
            <div className="text-center group hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Leverandør Intelligence</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Få overblik over alle dine leverandører og deres præstationer. Sammenlign priser og find de bedste deals.
              </p>
            </div>
          </AnimatedSection>

          {/* Vareprocenter Dashboard */}
          <AnimatedSection animation="fadeInUp" delay={0.5}>
            <div className="text-center group hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Omkostningsovervågning</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Hold øje med dine vareprocenter i realtid og få advarsler når de stiger over målene.
              </p>
            </div>
          </AnimatedSection>

          {/* Integrationer */}
          <AnimatedSection animation="fadeInUp" delay={0.6}>
            <div className="text-center group hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Globe className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Nem Integration</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Koble til dine eksisterende systemer på få minutter. Ingen kompleks setup eller tekniske udfordringer.
              </p>
            </div>
          </AnimatedSection>
        </div>

        {/* Additional Features Grid */}
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Automatiske Rapporter</h4>
              <p className="text-gray-600 text-sm">Få vigtige indsigter leveret direkte til din indbakke</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Prisalarm</h4>
              <p className="text-gray-600 text-sm">Få besked når dine vigtigste varer stiger eller falder i pris</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Multi-lokation</h4>
              <p className="text-gray-600 text-sm">Sammenlign priser og forhandlinger på tværs af alle dine lokationer</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Ekspert Support</h4>
              <p className="text-gray-600 text-sm">Få hjælp fra procurement eksperter der forstår din branche</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Løbende Forbedringer</h4>
              <p className="text-gray-600 text-sm">Nye funktioner baseret på feedback fra rigtige brugere</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Sikkerhed</h4>
              <p className="text-gray-600 text-sm">Bank-niveau sikkerhed for dine sensitive indkøbsdata</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;