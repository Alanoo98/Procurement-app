import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if ((isVisible || isClicked) && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + rect.width + 10
      });
    }
  }, [isVisible, isClicked]);

  const handleClick = () => {
    setIsClicked(!isClicked);
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsClicked(false);
  };

  const handleHelpClick = () => {
    navigate('/help');
  };

  const shouldShow = isVisible || isClicked;

  return (
    <>
      <button
        ref={buttonRef}
        onMouseEnter={() => !isClicked && setIsVisible(true)}
        onMouseLeave={() => !isClicked && setIsVisible(false)}
        onClick={handleClick}
        className={`inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded-full ${className}`}
        aria-label="More information"
      >
        <Info className="w-4 h-4" />
      </button>
      
      {shouldShow && createPortal(
        <div 
          className="fixed z-[9999] w-72 bg-gray-900 rounded-lg shadow-xl border border-gray-700"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="relative">
            <div className="absolute top-full left-0 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 transform -translate-x-1/2 ml-2"></div>
            
            {/* Header with close button */}
            <div className="flex items-center justify-between p-3 pb-2">
              <div className="flex-1"></div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close tooltip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-3 pb-2">
              <p className="text-sm text-white leading-relaxed">{content}</p>
            </div>
            
            {/* Help link */}
            <div className="px-3 pb-3">
              <button
                onClick={handleHelpClick}
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                Learn more in Help
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}; 

