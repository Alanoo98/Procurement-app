import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, FileText, BarChart3, AlertTriangle, Users, MapPin, TrendingUp, Database, Bell, Zap, Clock, Shield, Target, Eye } from 'lucide-react';
import { Footer } from '@/components/Footer';
import AnimatedSection from '@/components/AnimatedSection';

const HowItWorks = () => {
  const handleDemoClick = () => {
    window.open('https://calendly.com/vergara-projects-e/30min', '_blank');
  };

  const steps = [
    {
      step: 1,
      title: "Forbind dine systemer",
      description: "Vi integrerer med dit eksisterende e-conomic regnskabssystem eller sætter manuel dokumentupload op",
      icon: FileText,
      details: [
        "Sømløs e-conomic integration",
        "Manuel PDF/Excel upload mulighed",
        "Sikker datatransmission",
        "Ingen forstyrrelse af eksisterende arbejdsgange"
      ],
      color: "bg-procurement-primary-100 text-procurement-primary-600"
    },
    {
      step: 2,
      title: "AI dokumentbehandling",
      description: "Vores Nanonets AI udtrækker og kategoriserer automatisk alle faktura data",
      icon: Zap,
      details: [
        "Automatisk leverandøridentifikation",
        "Produkt- og prisudtrækning",
        "Lokationsmapping",
        "Datavalidering og rengøring"
      ],
      color: "bg-procurement-secondary-100 text-procurement-secondary-600"
    },
    {
      step: 3,
      title: "Dataanalyse & indsigter",
      description: "Avancerede analyser giver handlingsrettede indsigter og identificerer optimeringsmuligheder",
      icon: BarChart3,
      details: [
        "Realtids prissporing",
        "Leverandørpræstationssporing",
        "Forbrugsmønsteranalyse",
        "Omkostningsoptimeringsanbefalinger"
      ],
      color: "bg-procurement-accent-100 text-procurement-accent-600"
    },
    {
      step: 4,
      title: "Handlingsrettede advarsler & rapporter",
      description: "Få besked om prisændringer, anomalier og modtag omfattende rapporter",
      icon: Bell,
      details: [
        "Prisvariationsadvarsler",
        "Leverandørpræstationsrapporter",
        "Månedlige optimeringsopsummeringer",
        "Tilpassede dashboard visninger"
      ],
      color: "bg-green-100 text-green-600"
    }
  ];

  const benefits = [
    {
      icon: Eye,
      title: "Fuld gennemsigtighed",
      description: "Se præcis hvad du bruger på tværs af alle lokationer og leverandører"
    },
    {
      icon: Target,
      title: "Prisoptimering",
      description: "Identificer og handle på prisvariationer og forhandlingsmuligheder"
    },
    {
      icon: Clock,
      title: "Tidsbesparelser",
      description: "Automatiser manuelle processer og spar 20+ timer per lokation månedligt"
    },
    {
      icon: Shield,
      title: "Risikostyring",
      description: "Overvåg compliance og leverandørpræstationer for at reducere risici"
    },
    {
      icon: TrendingUp,
      title: "Omkostningsreduktion",
      description: "Opnå garanteret 1% besparelse med typisk 3% omkostningsreduktion"
    },
    {
      icon: Users,
      title: "Leverandørstyring",
      description: "Spor leverandørpræstationer og optimer relationer"
    }
  ];

  const timeline = [
    {
      phase: "Uge 1",
      title: "Opsætning & integration",
      description: "Forbind dine systemer og konfigurer platformen"
    },
    {
      phase: "Uge 2-3",
      title: "Databehandling",
      description: "AI behandler dine historiske data og etablerer baseline"
    },
    {
      phase: "Uge 4",
      title: "Dashboard adgang",
      description: "Få fuld adgang til dit indkøbsdashboard og indsigter"
    },
    {
      phase: "Løbende",
      title: "Optimering",
      description: "Kontinuerlig overvågning og optimeringsanbefalinger"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-procurement-primary-50 via-white to-procurement-secondary-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection animation="fadeInDown" delay={0.2}>
              <Badge className="mb-6 bg-procurement-primary-100 text-procurement-primary-800 border-procurement-primary-200">
                <Zap className="w-4 h-4 mr-2" />
                Simpel 4-trins proces
              </Badge>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={0.4}>
              <h1 className="font-serif text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Sådan fungerer det
              </h1>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={0.6}>
              <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
                Transformer dine indkøb på kun 4 uger med vores AI-drevne platform. 
                Fra opsætning til optimering, guider vi dig hver step på vejen.
              </p>
            </AnimatedSection>
            
            <AnimatedSection animation="scaleIn" delay={0.8}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  onClick={handleDemoClick}
                  className="bg-procurement-primary-600 hover:bg-procurement-primary-700 text-white px-8 py-4 text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 hover-lift"
                >
                  Book en demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-procurement-primary-300 text-procurement-primary-700 hover:bg-procurement-primary-50 px-8 py-4 text-lg hover-lift"
                >
                  Se platform demo
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection animation="fadeInUp" delay={0.2}>
              <div className="text-center mb-12">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Den 4-trins proces
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Fra indledende opsætning til løbende optimering, transformerer vores platform din indkøbsstyring
                </p>
              </div>
            </AnimatedSection>

            <div className="space-y-8">
              {steps.map((step, index) => (
                <AnimatedSection key={step.step} animation="fadeInLeft" delay={0.3 + (index * 0.2)}>
                  <div className="flex flex-col lg:flex-row items-start gap-8">
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${step.color} font-bold text-xl hover-scale`}>
                        {step.step}
                      </div>
                    </div>
                    
                    <Card className="flex-1 border-gray-200 hover:shadow-lg transition-all duration-300 hover-lift">
                      <CardHeader>
                        <CardTitle className="flex items-center text-2xl">
                          <step.icon className="w-6 h-6 mr-3" />
                          {step.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg text-gray-700 mb-4">
                          {step.description}
                        </p>
                        <div className="grid md:grid-cols-2 gap-3">
                          {step.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-center text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 mr-2 text-procurement-primary-600" />
                              {detail}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="fadeInUp" delay={0.2}>
              <div className="text-center mb-12">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Implementerings tidslinje
                </h2>
                <p className="text-xl text-gray-600">
                  Kom i gang på kun 4 uger
                </p>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {timeline.map((item, index) => (
                <AnimatedSection key={index} animation="fadeInUp" delay={0.3 + (index * 0.1)}>
                  <Card className="border-procurement-primary-200 bg-white hover:shadow-lg transition-all duration-300 hover-lift">
                    <CardContent className="p-6 text-center">
                      <Badge className="mb-4 bg-procurement-primary-100 text-procurement-primary-800">
                        {item.phase}
                      </Badge>
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection animation="fadeInUp" delay={0.2}>
              <div className="text-center mb-12">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Hvad får du
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Omfattende indkøbsstyring med garanterede resultater
                </p>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <AnimatedSection key={index} animation="fadeInUp" delay={0.3 + (index * 0.1)}>
                  <Card className="border-gray-200 hover:border-procurement-primary-300 transition-all duration-300 hover:shadow-lg hover-lift">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-procurement-primary-100 rounded-lg mb-4 hover-scale">
                        <benefit.icon className="w-6 h-6 text-procurement-primary-600" />
                      </div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-procurement-primary-600 via-procurement-primary-700 to-procurement-primary-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection animation="fadeInUp" delay={0.2}>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">
                Klar til at transformere dine indkøb?
              </h2>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={0.4}>
              <p className="text-xl text-procurement-primary-100 mb-8 max-w-2xl mx-auto">
                Tilslut dig restaurantgrupper der allerede sparer tid og penge med vores AI-drevne indkøbsplatform.
              </p>
            </AnimatedSection>
            
            <AnimatedSection animation="scaleIn" delay={0.6}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  onClick={handleDemoClick}
                  className="bg-white text-procurement-primary-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 hover-lift"
                >
                  Book din demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg hover-lift"
                >
                  Lær mere
                </Button>
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={0.8}>
              <p className="text-sm text-procurement-primary-200 mt-6">
                Gratis 30-minutters konsultation • Ingen forpligtelse påkrævet • Ekspertvejledning
              </p>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorks;
