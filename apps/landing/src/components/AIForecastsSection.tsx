import { CheckCircle, Brain } from 'lucide-react';

const AIForecastsSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Visual placeholder */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-8">
            <div className="text-center">
              <div className="bg-emerald-600 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">MACHINE LEARNING</h3>
              <p className="text-gray-600">
                AI Forecasts giver forventet indkøbsbehov
              </p>
            </div>
          </div>

          {/* Right side - Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              AI der forudsiger dine indkøbsbehov
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Vores AI analyserer dine historiske data og identificerer mønstre du ikke selv kan se. 
              Fra sæsonale prissving til leverandørspecifikke trends - vi giver dig forudsigelser der faktisk holder stik. 
              Ikke bare gætteri, men data-drevet intelligens der sparer dig tid og penge.
            </p>

            {/* Checkmarks */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Forudsig prissving før de sker og køb på det rigtige tidspunkt</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Identificér hvilke varer der stiger i pris og find alternativer i god tid</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Optimer indkøbsvolumen baseret på forventet forbrug og pristrends</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIForecastsSection;
