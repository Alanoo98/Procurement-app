import { Users, BarChart3, TrendingUp } from 'lucide-react';

const HowItHelpsSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Hvorfor er intelligent procurement vigtigt?
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Traditionel indkøbsstyring er ofte reaktiv og baseret på gætteri. ProcurementD6 gør dig proaktiv med data-drevne beslutninger 
            der direkte påvirker din bundlinje. Fra leverandørforhandlinger til vareprocenter - alt bliver optimeret.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Leverandørforhandlinger */}
          <div className="text-center">
            <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Leverandørforhandlinger</h3>
            <p className="text-gray-600 leading-relaxed">
              Gå til forhandlingsbordet med konkrete data om forbrug, pristrends og alternativer. 
              Vind forhandlinger med fakta i stedet for følelser.
            </p>
          </div>

          {/* Vareprocenter */}
          <div className="text-center">
            <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Vareprocenter</h3>
            <p className="text-gray-600 leading-relaxed">
              Få øjeblikkelig indsigt i hvilke varer der driver dine omkostninger op. 
              Identificér de 20% af varerne der står for 80% af dine vareomkostninger.
            </p>
          </div>

          {/* Strategisk Indkøb */}
          <div className="text-center">
            <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Strategisk Indkøb</h3>
            <p className="text-gray-600 leading-relaxed">
              Transformér indkøb fra en administrativ opgave til en strategisk fordel. 
              Brug data til at tage beslutninger der påvirker hele forretningen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItHelpsSection;
