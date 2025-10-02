import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X } from 'lucide-react';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="bg-teal-900/95 backdrop-blur-sm border-b border-teal-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <h1 className="text-2xl font-bold text-white">ProcurementD6</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#home" className="text-teal-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
                Home
              </a>
              <a href="#features" className="text-teal-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#effekt" className="text-teal-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
                Effekt
              </a>
              <a href="#integrationer" className="text-teal-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
                Integrationer
              </a>
              <a href="#kontakt" className="text-teal-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
                Kontakt
              </a>
            </div>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" className="text-emerald-400 border-emerald-400 hover:bg-emerald-400/10 text-white">
              Opret adgang
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-white">
              Login
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-teal-200 hover:text-white focus:outline-none focus:text-white"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-teal-800/50 backdrop-blur-sm border-t border-teal-700/50">
              <a href="#home" className="text-teal-200 hover:text-white block px-3 py-2 text-base font-medium">
                Home
              </a>
              <a href="#features" className="text-teal-200 hover:text-white block px-3 py-2 text-base font-medium">
                Features
              </a>
              <a href="#effekt" className="text-teal-200 hover:text-white block px-3 py-2 text-base font-medium">
                Effekt
              </a>
              <a href="#integrationer" className="text-teal-200 hover:text-white block px-3 py-2 text-base font-medium">
                Integrationer
              </a>
              <a href="#kontakt" className="text-teal-200 hover:text-white block px-3 py-2 text-base font-medium">
                Kontakt
              </a>
              <div className="pt-4 space-y-2">
                <Button variant="outline" className="w-full text-emerald-400 border-emerald-400 hover:bg-emerald-400/10 text-white">
                  Opret adgang
                </Button>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-white">
                  Login
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
