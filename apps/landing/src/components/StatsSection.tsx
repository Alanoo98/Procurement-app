import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Clock, DollarSign, Database } from 'lucide-react';

const StatsSection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-900 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-teal-400/15 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-300/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Konkrete resultater fra vores kunder
          </h2>
          <p className="text-xl md:text-2xl text-teal-100 max-w-5xl mx-auto leading-relaxed">
            Disse tal kommer fra rigtige restauranter der bruger ProcurementD6. 
            Ikke teoretiske beregninger, men faktiske besparelser der kan måles på bundlinjen.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-12 mb-20">
          {/* Gennemsnitlig besparelse */}
          <div className="text-center group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
              <DollarSign className="h-12 w-12 text-emerald-300" />
            </div>
            <div className="text-5xl md:text-6xl font-bold mb-4 text-emerald-300">15%</div>
            <p className="text-teal-100 text-lg">Gennemsnitlig besparelse på vareomkostninger</p>
          </div>

          {/* ROI */}
          <div className="text-center group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
              <TrendingUp className="h-12 w-12 text-emerald-300" />
            </div>
            <div className="text-5xl md:text-6xl font-bold mb-4 text-emerald-300">400%</div>
            <p className="text-teal-100 text-lg">ROI i første år</p>
          </div>

          {/* Implementeringstid */}
          <div className="text-center group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
              <Clock className="h-12 w-12 text-emerald-300" />
            </div>
            <div className="text-5xl md:text-6xl font-bold mb-4 text-emerald-300">2 uger</div>
            <p className="text-teal-100 text-lg">Fra start til første besparelse</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 px-10 py-5 text-xl font-semibold rounded-full shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:scale-105">
            Klik her for at komme i gang
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
