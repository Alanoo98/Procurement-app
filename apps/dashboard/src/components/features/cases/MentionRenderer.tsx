import React from 'react';
import { User, Package, Building2, MapPin, FileText } from 'lucide-react';

export interface Mention {
  id: string;
  type: 'user' | 'product' | 'supplier' | 'location' | 'invoice';
  label: string;
  start: number;
  end: number;
}

interface MentionRendererProps {
  text: string;
  mentions: Mention[];
}

export const MentionRenderer: React.FC<MentionRendererProps> = ({ text, mentions }) => {
  if (mentions.length === 0) {
    return <span>{text}</span>;
  }

  // Sort mentions by start position
  const sortedMentions = [...mentions].sort((a, b) => a.start - b.start);
  
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMentions.forEach((mention, index) => {
    // Add text before mention
    if (mention.start > lastIndex) {
      const beforeText = text.substring(lastIndex, mention.start);
      elements.push(
        <span key={`text-${index}`}>{beforeText}</span>
      );
    }

    // Add mention
    const icon = mention.type === 'user' ? <User className="h-3 w-3" /> :
                 mention.type === 'product' ? <Package className="h-3 w-3" /> :
                 mention.type === 'supplier' ? <Building2 className="h-3 w-3" /> :
                 mention.type === 'location' ? <MapPin className="h-3 w-3" /> :
                 <FileText className="h-3 w-3" />;

    const colorClass = mention.type === 'user' ? 'bg-blue-100 text-blue-800' :
                      mention.type === 'product' ? 'bg-green-100 text-green-800' :
                      mention.type === 'supplier' ? 'bg-purple-100 text-purple-800' :
                      mention.type === 'location' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800';

    elements.push(
      <span
        key={`mention-${index}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
        title={`${mention.type}: ${mention.label}`}
      >
        {icon}
        {mention.label}
      </span>
    );

    lastIndex = mention.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    const endText = text.substring(lastIndex);
    elements.push(
      <span key="text-end">{endText}</span>
    );
  }

  return <span>{elements}</span>;
};
