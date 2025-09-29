import { useState, useEffect } from 'react';

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [lastVisibleTime, setLastVisibleTime] = useState(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (visible) {
        setLastVisibleTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for focus/blur events
    const handleFocus = () => {
      setIsVisible(true);
      setLastVisibleTime(Date.now());
    };
    
    const handleBlur = () => {
      setIsVisible(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const getTimeAway = () => {
    return Date.now() - lastVisibleTime;
  };

  return { isVisible, lastVisibleTime, getTimeAway };
}