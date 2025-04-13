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
      if (url.includes('onConnect') || 
          url.includes('onDisconnect') || 
          url.includes('onSignAndSendTransaction')) {
        console.log('Processing initial deep link URL:', url);
        setDeepLink(url);
        
        // Clean up the URL after processing
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };
    
    // Process any initial deep link URL
    processInitialUrl();
    
    // Listen for URL changes (in case the app is already running)
    // Note: This would be handled by a library like expo-linking in React Native
    // In a web app, we need to be more creative
    const checkForUrlChanges = () => {
      const currentUrl = window.location.href;
      if (currentUrl.includes('onConnect') || 
          currentUrl.includes('onDisconnect') || 
          currentUrl.includes('onSignAndSendTransaction')) {
        console.log('URL changed to deep link URL:', currentUrl);
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