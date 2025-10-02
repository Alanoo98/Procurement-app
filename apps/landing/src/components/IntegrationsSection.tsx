import { CheckCircle, CreditCard, Calendar, Users } from 'lucide-react';

const IntegrationsSection = () => {
  return (
    <section id="integrationer" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Kom i gang på 5 minutter
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            Ingen kompleks setup eller tekniske udfordringer
          </p>
          <p className="text-lg text-gray-600 max-w-4xl mx-auto">
            ProcurementD6 kobler direkte til dine eksisterende systemer og begynder at analysere dine data med det samme. 
            Ingen CSV-filer, ingen manuel dataimport - bare resultater.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* POS System */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kassesystemer</h3>
            <p className="text-gray-600 text-sm">Få indsigt i hvilke varer der sælger bedst og hvorfor</p>
          </div>

          {/* Regnskabssystem */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regnskabssystemer</h3>
            <p className="text-gray-600 text-sm">Analyser dine faktiske omkostninger og find besparelser</p>
          </div>

          {/* Leverandørsystemer */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Leverandørportaler</h3>
            <p className="text-gray-600 text-sm">Sammenlign priser og find de bedste deals automatisk</p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Plus alt det ekstra du får
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Indkøbskalender & Noter */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Smart Kalender</h4>
              <p className="text-gray-600 text-sm">
                Automatisk planlægning af indkøb baseret på forventet forbrug og leveringstider. 
                Få påmindelser om vigtige forhandlingsperioder og sæsonale begivenheder.
              </p>
            </div>

            {/* Prisovervågning */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Prisalarm</h4>
              <p className="text-gray-600 text-sm">
                Få besked når dine vigtigste varer stiger eller falder i pris. 
                Vores AI holder øje med markedspriser og giver dig besked om de bedste købstidspunkter.
              </p>
            </div>

            {/* Overblik på tværs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Multi-lokation</h4>
              <p className="text-gray-600 text-sm">
                Sammenlign priser og forhandlinger på tværs af alle dine lokationer. 
                Find de bedste deals og standardiser indkøb på tværs af hele organisationen.
              </p>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Ekspert Support</h4>
              <p className="text-gray-600 text-sm">
                Få hjælp fra procurement eksperter der forstår din branche. 
                Ikke bare teknisk support, men strategisk rådgivning om indkøb.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
