import { FC, useEffect } from 'react';
import { usePhantomDeepLink } from '@/lib/phantomUtils/deepLinkConnection';

/**
 * This component handles deep link responses from Phantom Wallet.
 * It doesn't render anything, but processes URL parameters when:
 * 1. The app loads with a deep link URL
 * 2. The app receives a new deep link URL
 */
const PhantomDeepLinkHandler: FC = () => {
  const { setDeepLink } = usePhantomDeepLink();

  // Handle initial URL and listen for changes
  useEffect(() => {
    // Process initial URL if it exists
    const processInitialUrl = () => {
      const url = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check if this is a response from Phantom
      const hasPhantomParam = urlParams.get('phantom');
      const hasErrorCode = urlParams.get('errorCode');
      const hasData = urlParams.get('data');
      const hasNonce = urlParams.get('nonce');
      
      // Look for Phantom parameters in the URL
      if (hasPhantomParam || hasErrorCode || hasData || hasNonce) {
        console.log('Processing initial deep link URL with query params:', { 
          phantom: hasPhantomParam,
          errorCode: hasErrorCode,
          hasData: !!hasData,
          hasNonce: !!hasNonce
        });
        
        setDeepLink(url);
        
        // Clean up the URL after processing
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };
    
    // Process any initial deep link URL
    processInitialUrl();
    
    // Listen for URL changes (for when returning from Phantom app)
    const checkForUrlChanges = () => {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check if this is a response from Phantom
      const hasPhantomParam = urlParams.get('phantom');
      const hasErrorCode = urlParams.get('errorCode');
      const hasData = urlParams.get('data');
      const hasNonce = urlParams.get('nonce');
      
      if (hasPhantomParam || hasErrorCode || hasData || hasNonce) {
        console.log('URL changed with Phantom parameters:', {
          phantom: hasPhantomParam,
          errorCode: hasErrorCode,
          hasData: !!hasData,
          hasNonce: !!hasNonce
        });
        
        setDeepLink(currentUrl);
        
        // Clean up the URL after processing
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };
    
    // Check for URL changes periodically
    const intervalId = setInterval(checkForUrlChanges, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [setDeepLink]);

  // This component doesn't render anything
  return null;
};

export default PhantomDeepLinkHandler;