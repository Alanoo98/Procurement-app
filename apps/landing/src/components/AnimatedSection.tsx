import React from 'react';
import useScrollAnimation from '@/hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideUp';
  delay?: number;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  animation = 'fadeInUp',
  delay = 0,
  className = '',
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold,
    rootMargin,
    triggerOnce
  });

  const getAnimationClass = () => {
    if (!isVisible) return 'opacity-0';
    
    const baseAnimation = `animate-${animation}`;
    const delayClass = delay > 0 ? `animate-stagger-${Math.min(Math.floor(delay * 10), 5)}` : '';
    
    return `${baseAnimation} ${delayClass}`.trim();
  };

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`transition-smooth ${getAnimationClass()} ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
