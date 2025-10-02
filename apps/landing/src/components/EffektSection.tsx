import { TrendingUp, Clock, DollarSign, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const EffektSection = () => {
  return (
    <section id="effekt" className="py-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 bg-emerald-100/20 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-teal-100/30 rounded-full blur-xl animate-float-delayed"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeInUp" delay={0.2}>
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Hvad får du ud af det?
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              ProcurementD6 er ikke bare endnu et dashboard. Det er et værktøj der ændrer måden du tænker indkøb på.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Time Savings */}
          <AnimatedSection animation="fadeInUp" delay={0.3}>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Clock className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">5 timer</h3>
              <p className="text-gray-600 text-lg">mindre administrativt arbejde om ugen</p>
            </div>
          </AnimatedSection>

          {/* Cost Reduction */}
          <AnimatedSection animation="fadeInUp" delay={0.4}>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">15%</h3>
              <p className="text-gray-600 text-lg">lavere vareomkostninger</p>
            </div>
          </AnimatedSection>

          {/* Better Planning */}
          <AnimatedSection animation="fadeInUp" delay={0.5}>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <TrendingUp className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">3x</h3>
              <p className="text-gray-600 text-lg">hurtigere beslutninger</p>
            </div>
          </AnimatedSection>

          {/* Supplier Relations */}
          <AnimatedSection animation="fadeInUp" delay={0.6}>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover-lift">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">25%</h3>
              <p className="text-gray-600 text-lg">bedre forhandlingsresultater</p>
            </div>
          </AnimatedSection>
        </div>

        {/* Detailed Benefits */}
        <div className="mt-16 grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Konkrete fordele</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">Stop gætteri i indkøb</h4>
                  <p className="text-gray-600 text-sm">Få data der viser dig præcis hvad du skal købe og hvornår</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">Vind forhandlinger</h4>
                  <p className="text-gray-600 text-sm">Gå til forhandlingsbordet med konkrete tal og alternativer</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">Find skjulte besparelser</h4>
                  <p className="text-gray-600 text-sm">Identificér varer der koster for meget og find bedre alternativer</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">Bliv proaktiv</h4>
                  <p className="text-gray-600 text-sm">Forudsig prissving og planlæg indkøb på det rigtige tidspunkt</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">ROI beregning</h3>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Gennemsnitlig restaurant</span>
                  <span className="font-semibold text-gray-900">1 lokation</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Månedlig vareomkostning</span>
                  <span className="font-semibold text-gray-900">80.000 kr</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Månedlig besparelse (15%)</span>
                  <span className="font-semibold text-emerald-600">12.000 kr</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Årlig besparelse</span>
                  <span className="font-semibold text-emerald-600">144.000 kr</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ROI første år</span>
                    <span className="font-bold text-emerald-600 text-lg">400%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EffektSection;
