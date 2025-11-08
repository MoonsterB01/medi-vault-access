import { useEffect } from 'react';

/**
 * Prevents accidental navigation/reload during critical operations
 */
export function usePreventNavigation(isActive: boolean, message?: string) {
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message || 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    const handlePopState = () => {
      if (isActive) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Push initial state to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive, message]);
}
