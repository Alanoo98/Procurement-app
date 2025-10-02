import { useState, useRef, useCallback } from 'react';
import { MentionSuggestion } from '@/components/features/cases/MentionSuggestions';

export interface MentionPosition {
  start: number;
  end: number;
  query: string;
}

export interface Mention {
  id: string;
  type: 'user' | 'product' | 'supplier' | 'location' | 'invoice';
  label: string;
  start: number;
  end: number;
}

export const useMentions = () => {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<MentionPosition | null>(null);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse text for @mentions
  const parseMentions = useCallback((text: string): Mention[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parsedMentions: Mention[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const [fullMatch, label, id] = match;
      const type = id.startsWith('user-') ? 'user' :
                   id.startsWith('product-') ? 'product' :
                   id.startsWith('supplier-') ? 'supplier' :
                   id.startsWith('location-') ? 'location' :
                   id.startsWith('invoice-') ? 'invoice' : 'user';
      
      parsedMentions.push({
        id: id.replace(/^(user-|product-|supplier-|location-|invoice-)/, ''),
        type,
        label,
        start: match.index,
        end: match.index + fullMatch.length
      });
    }

    return parsedMentions;
  }, []);

  // Convert mentions to display text
  const mentionsToText = useCallback((mentions: Mention[]): string => {
    return mentions.map(mention => `@[${mention.label}](${mention.type}-${mention.id})`).join(' ');
  }, []);

  // Convert display text back to mentions
  const textToMentions = useCallback((text: string): Mention[] => {
    return parseMentions(text);
  }, [parseMentions]);

  // Helper: compute caret coordinates relative to nearest positioned ancestor
  const computeCaretPosition = (el: HTMLTextAreaElement | HTMLInputElement, value: string, caretIndex: number) => {
    const elementRect = el.getBoundingClientRect();
    // Find the nearest positioned ancestor for correct absolute positioning
    const offsetParent = (el as HTMLElement).offsetParent as HTMLElement | null;
    const parentRect = offsetParent ? offsetParent.getBoundingClientRect() : { top: 0, left: 0 } as DOMRect;

    // Create mirror div to measure caret coordinates
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(el);
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    // Copy important text/layout styles
    mirror.style.font = style.font;
    mirror.style.letterSpacing = style.letterSpacing as string;
    mirror.style.padding = style.padding;
    mirror.style.border = style.border;
    mirror.style.boxSizing = style.boxSizing as string;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.width = elementRect.width + 'px';

    // Position the mirror at the same place so measurements align
    mirror.style.top = elementRect.top + window.scrollY + 'px';
    mirror.style.left = elementRect.left + window.scrollX + 'px';

    // Set the text content up to the caret
    const before = value.substring(0, caretIndex);
    const after = value.substring(caretIndex);
    mirror.textContent = before;
    const marker = document.createElement('span');
    marker.textContent = '\u200b'; // zero-width space marks caret position
    mirror.appendChild(marker);
    // For multi-line support, append the rest to ensure line breaks, but not needed for position
    const remainder = document.createElement('span');
    remainder.textContent = after;
    mirror.appendChild(remainder);

    document.body.appendChild(mirror);

    const markerRect = marker.getBoundingClientRect();
    const top = markerRect.bottom - parentRect.top;
    const left = markerRect.left - parentRect.left;

    document.body.removeChild(mirror);

    // Fallbacks in case measurement fails
    const resolvedTop = Number.isFinite(top) ? top : (elementRect.bottom - parentRect.top);
    const resolvedLeft = Number.isFinite(left) ? left : (elementRect.left - parentRect.left);

    return { top: resolvedTop + 6, left: resolvedLeft }; // add small gap under caret
  };

  // Handle text change and detect @mentions
  const handleTextChange = useCallback((value: string, cursorPosition: number) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ');
      
      if (!hasSpace && textAfterAt.length > 0) {
        // Show suggestions
        setShowSuggestions(true);
        setMentionPosition({
          start: lastAtIndex,
          end: cursorPosition,
          query: textAfterAt
        });
        
        // Calculate position for suggestions dropdown at caret
        if (textareaRef.current) {
          const coords = computeCaretPosition(textareaRef.current, value, cursorPosition);
          setSuggestionPosition(coords);
        }
      } else {
        setShowSuggestions(false);
        setMentionPosition(null);
      }
    } else {
      setShowSuggestions(false);
      setMentionPosition(null);
    }
  }, []);

  // Insert mention into text (bold label only, no IDs)
  const insertMention = useCallback((suggestion: MentionSuggestion, currentValue: string, cursorPosition: number) => {
    if (!mentionPosition) return currentValue;

    const beforeMention = currentValue.substring(0, mentionPosition.start);
    const afterMention = currentValue.substring(cursorPosition);
    const mentionText = `${suggestion.label}`;
    
    const newValue = beforeMention + mentionText + afterMention;
    const newCursorPosition = beforeMention.length + mentionText.length;
    
    setShowSuggestions(false);
    setMentionPosition(null);
    
    // Update mentions list (no special mention syntax now)
    setMentions([]);
    
    // Focus textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
    
    return newValue;
  }, [mentionPosition, parseMentions]);

  // Close suggestions
  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setMentionPosition(null);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      // Let MentionSuggestions handle keyboard navigation
      return;
    }
    
    // Handle other keyboard shortcuts if needed
  }, [showSuggestions]);

  return {
    mentions,
    showSuggestions,
    mentionPosition,
    suggestionPosition,
    textareaRef,
    handleTextChange,
    insertMention,
    closeSuggestions,
    handleKeyDown,
    parseMentions,
    mentionsToText,
    textToMentions
  };
};
