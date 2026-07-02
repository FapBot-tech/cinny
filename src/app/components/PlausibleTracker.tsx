import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function PlausibleTracker() {
  const location = useLocation();

  useEffect(() => {
    const track = () => {
      if (location.pathname === '/' && (location.hash === '' || location.hash === '#/')) return;
      if ((window as any).plausible) {
        (window as any).plausible('pageview', {
          u: window.location.href,
        });
      }
    };

    // Small delay to ensure the DOM/URL is fully updated and the script is ready
    const timer = setTimeout(track, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash, location.search]);

  return null;
}
