import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, Phone } from 'lucide-react';

const FAQSection = () => {
  const faqs = [
    {
      question: "Hvor hurtigt kan jeg komme i gang?",
      answer: "Du kan komme i gang på under 5 minutter. Vi kobler direkte til dine eksisterende systemer og begynder at analysere dine data med det samme. Ingen kompleks setup eller tekniske udfordringer - bare resultater."
    },
    {
      question: "Hvor meget tid sparer jeg?",
      answer: "Vores kunder sparer typisk 5-10 timer om ugen på administrativt indkøbsarbejde. Denne tid kan bruges på strategiske opgaver som forhandlinger og leverandørrelationer."
    },
    {
      question: "Kan I hjælpe med at implementere systemet?",
      answer: "Ja, vi tilbyder fuld onboarding-support og løbende konsultation. Vores team har erfaring fra restaurationsbranchen og kan guide dig til at få det maksimale ud af systemet."
    },
    {
      question: "Hvad koster det?",
      answer: "Vi tilbyder fleksible priser baseret på antal lokationer og funktionalitet. De fleste kunder ser en ROI på 400% i første år. Kontakt os for en personlig prisvurdering."
    },
    {
      question: "Er mine data sikre?",
      answer: "Ja, vi bruger bank-niveau sikkerhed for dine sensitive indkøbsdata. Alle data er krypteret og vi overholder GDPR og andre relevante sikkerhedsstandarder."
    }
  ];

  return (
    <section id="kontakt" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">FAQ</h2>
          <p className="text-xl text-gray-600">Kontakt os for mere info</p>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 mb-12">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            <span className="text-gray-700">info@procurementd6.dk</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-emerald-600" />
            <span className="text-gray-700">+45 12345678</span>
          </div>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-lg font-semibold text-gray-900 hover:text-emerald-600">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Additional Interest Section */}
        <div className="mt-16 text-center bg-gray-50 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ikke en restaurant? Ingen problem
          </h3>
          <p className="text-gray-600 mb-6">
            ProcurementD6 kan tilpasses til andre brancher der har komplekse indkøbsudfordringer. 
            Så selvom restauranter er vores hjemmebane, kan vi sagtens hjælpe andre brancher med at optimere deres procurement.
          </p>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            Kontakt os her
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
