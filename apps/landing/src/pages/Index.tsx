
import Navigation from '@/components/Navigation';
import NewHeroSection from '@/components/NewHeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import EffektSection from '@/components/EffektSection';
import HowItHelpsSection from '@/components/HowItHelpsSection';
import BuiltByExpertsSection from '@/components/BuiltByExpertsSection';
import AIForecastsSection from '@/components/AIForecastsSection';
import IntegrationsSection from '@/components/IntegrationsSection';
import StatsSection from '@/components/StatsSection';
import FAQSection from '@/components/FAQSection';
import NewFooter from '@/components/NewFooter';

const Index = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navigation />
      <NewHeroSection />
      <FeaturesSection />
      <EffektSection />
      <HowItHelpsSection />
      <BuiltByExpertsSection />
      <AIForecastsSection />
      <IntegrationsSection />
      <StatsSection />
      <FAQSection />
      <NewFooter />
    </div>
  );
};

export default Index;
