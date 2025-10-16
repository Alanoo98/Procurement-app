import React, { useState } from 'react';
import {
  Book,
  ShoppingCart,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Search,
  Settings,
  Database,
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
      description: 'Quick start guide for the procurement system',
      content: [
        'Use the sidebar navigation to access all procurement features.',
        'Start with the Dashboard to see key metrics and recent activity.',
        'Use Global Filters to focus on specific locations, suppliers, or date ranges.',
        'Navigate using the sidebar - all main features are organized by category.',
      ]
    },
    {
      id: 'procurement-universe',
      title: 'Procurement Management',
      icon: ShoppingCart,
      description: 'Core procurement features and analytics',
      content: [
        'Dashboard: Overview of spending, alerts, and key metrics.',
        'Products: Manage product catalog, view pricing, and track efficiency.',
        'Suppliers: Track supplier performance and relationships.',
        'Price Alerts: Monitor price variations and potential savings.',
        'Price Negotiations: Track and manage supplier negotiations.',
        'Efficiency Analysis: Identify cost optimization opportunities.',
        'COGS Analysis: Cost of goods sold tracking and analysis.',
        'Product Targets: Set and monitor procurement goals.',
        'Cases of Concern: Track and resolve procurement issues.',
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      icon: BarChart3,
      description: 'Advanced analytics and reporting features',
      content: [
        'Efficiency Analysis: Identify products with price variations.',
        'COGS Dashboard: Cost analysis and trend tracking.',
        'PAX Analytics: Customer count and revenue analysis.',
        'Product Efficiency: Individual product performance analysis.',
        'Cases of Concern: Track and resolve procurement issues.',
      ]
    },
    {
      id: 'data-management',
      title: 'Data Management',
      icon: Database,
      description: 'Import, export, and data processing',
      content: [
        'Import Data: Upload and process procurement data.',
        'Documents: Manage invoices and procurement documents.',
        'Product Categories: Organize and categorize products.',
        'Locations: Manage restaurant locations and settings.',
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      icon: Settings,
      description: 'System configuration and preferences',
      content: [
        'Price Alert Settings: Configure alert thresholds.',
        'Currency Settings: Set up multi-currency support.',
        'Product Mapping: Map products to standard categories.',
        'Pending Mappings: Resolve product mapping conflicts.',
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
          Quick reference for the procurement system (Beta v1.0)
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

