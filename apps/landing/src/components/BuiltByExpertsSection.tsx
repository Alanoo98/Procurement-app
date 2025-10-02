import { CheckCircle } from 'lucide-react';

const BuiltByExpertsSection = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Bygget af procurement eksperter
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              ProcurementD6 er designet af folk der forstår indkøbsudfordringerne
            </p>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Vi har selv stået i situationen hvor indkøb bliver en konstant kamp mod stigende priser og komplekse leverandørrelationer. 
              Derfor har vi bygget ProcurementD6 som et værktøj der faktisk løser de rigtige problemer - ikke bare laver flere rapporter.
            </p>

            {/* Checkmarks */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Få øjeblikkelig indsigt i hvilke varer der koster dig mest</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Forhandl bedre priser med konkrete data om forbrug og alternativer</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Identificér besparelsesmuligheder du ikke vidste eksisterede</span>
              </div>
            </div>
          </div>

          {/* Right side - Visual placeholder */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Intelligent Procurement Dashboard</h3>
              <p className="text-gray-600">
                Få overblik over alle dine indkøb og vareprocenter på ét sted med vores intuitive dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BuiltByExpertsSection;
