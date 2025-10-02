import React, { useState } from 'react';
import {
  Book,
  FileText,
  Users,
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Search,
  LayoutDashboard,
  Clock,
  ArrowRight,
  Target,
  TrendingDown,
  DollarSign,
  Settings,
  Database,
  Package,
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  content: string[];
}

export const Help: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Book,
      description: 'Essential information to get you started',
      content: [
        'Welcome to the Procurement System MVP! This system helps you manage suppliers, products, and track spending.',
        'Start by exploring the Dashboard to see your current data and key metrics.',
        'Use the sidebar navigation to access different sections: Documents, Locations, Suppliers, and Products.',
        'The system automatically processes invoices and extracts product information for analysis.',
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview of your procurement data',
      content: [
        'The dashboard shows key metrics and recent activity.',
        'View price alerts for products with significant price variations.',
        'See inefficient products that may need attention.',
        'Track your spending patterns and supplier performance.',
      ]
    },
    {
      id: 'documents',
      title: 'Documents',
      icon: FileText,
      description: 'Manage invoices and procurement documents',
      content: [
        'Upload invoices and receipts for automatic processing.',
        'View processed documents and extracted product information.',
        'Track document status and processing results.',
        'Export document data for external analysis.',
      ]
    },
    {
      id: 'locations',
      title: 'Locations',
      icon: Package,
      description: 'Manage your restaurant locations',
      content: [
        'Add and manage your restaurant locations.',
        'Set up location-specific settings and preferences.',
        'Track spending and product usage by location.',
        'Compare performance across different locations.',
      ]
    },
    {
      id: 'suppliers',
      title: 'Suppliers',
      icon: Users,
      description: 'Manage supplier information and relationships',
      content: [
        'Add and manage supplier contact information.',
        'Track supplier performance and delivery times.',
        'View supplier spending and product offerings.',
        'Export supplier data for analysis.',
      ]
    },
    {
      id: 'products',
      title: 'Products',
      icon: ShoppingCart,
      description: 'Manage product catalog and pricing',
      content: [
        'View all products across your locations.',
        'Track product prices and supplier information.',
        'Identify products with price variations.',
        'Export product data with prices and suppliers.',
      ]
    },
    {
      id: 'price-alerts',
      title: 'Price Alerts',
      icon: AlertTriangle,
      description: 'Monitor price variations and potential savings',
      content: [
        'Get notified when products have significant price differences.',
        'Track price variations across suppliers and locations.',
        'Calculate potential savings from price optimization.',
        'Resolve price discrepancies with suppliers.',
      ]
    },
    {
      id: 'efficiency',
      title: 'Efficiency',
      icon: TrendingDown,
      description: 'Identify inefficient products and opportunities',
      content: [
        'Find products with significant price variations.',
        'Identify standardization opportunities.',
        'Track efficiency improvements over time.',
        'Generate reports for supplier negotiations.',
      ]
    },
    {
      id: 'product-targets',
      title: 'Product Targets',
      icon: Target,
      description: 'Set and track procurement goals',
      content: [
        'Create targets for specific products and suppliers.',
        'Track progress toward cost reduction goals.',
        'Monitor target status and deadlines.',
        'Calculate potential and actual savings.',
      ]
    },
    {
      id: 'import-data',
      title: 'Import Data',
      icon: Database,
      description: 'Import and process procurement data',
      content: [
        'Import supplier and product data from external sources.',
        'Process invoices and receipts automatically.',
        'Map products to standard categories.',
        'Validate and clean imported data.',
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      description: 'Configure system settings and preferences',
      content: [
        'Set up price alert thresholds.',
        'Configure currency settings for different locations.',
        'Manage product category mappings.',
        'Set up user preferences and notifications.',
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(text => text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Help</h1>
        <p className="mt-1 text-sm text-gray-500">
          Essential information for using the procurement system
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-medium text-gray-900">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {section.description}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="px-6 py-4 bg-white">
                    <ul className="space-y-2 text-sm text-gray-600">
                      {section.content.map((text, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-gray-500">No help topics found matching your search.</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

