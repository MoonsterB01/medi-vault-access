import { ReactNode } from "react";

interface MobileTabContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for mobile tab content with proper viewport management
 */
export function MobileTabContent({ children, className = "" }: MobileTabContentProps) {
  return (
    <div 
      className={`
        w-full 
        min-h-0 
        flex-1 
        overflow-y-auto 
        overflow-x-hidden 
        -webkit-overflow-scrolling-touch
        ${className}
      `}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="w-full px-4 pb-4">
        {children}
      </div>
    </div>
  );
}
