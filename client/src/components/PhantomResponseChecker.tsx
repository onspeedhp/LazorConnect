import { FC, useEffect } from 'react';
import { checkForPhantomResponse, clearPhantomResponseUrl } from '@/lib/simplePhantomConnect';

interface PhantomResponseCheckerProps {
  onWalletConnected?: (publicKey: string) => void;
}

/**
 * This component checks for Phantom wallet responses in the URL
 * It doesn't render anything but processes any Phantom responses
 */
const PhantomResponseChecker: FC<PhantomResponseCheckerProps> = ({ 
  onWalletConnected 
}) => {
  useEffect(() => {
    // Check for Phantom response on initial load
    const checkInitialUrl = () => {
      console.log("Checking for Phantom wallet response in URL...");
      const response = checkForPhantomResponse();
      
      if (response.isConnected && response.publicKey) {
        console.log("Found Phantom wallet connection response:", response);
        if (onWalletConnected) {
          onWalletConnected(response.publicKey);
        }
        // Clean up the URL
        clearPhantomResponseUrl();
      }
    };
    
    checkInitialUrl();
    
    // Check periodically for changes (e.g., if the user comes back from Phantom app)
    const intervalId = setInterval(() => {
      const response = checkForPhantomResponse();
      if (response.isConnected && response.publicKey) {
        console.log("Found new Phantom wallet connection:", response);
        if (onWalletConnected) {
          onWalletConnected(response.publicKey);
        }
        // Clean up the URL
        clearPhantomResponseUrl();
        // Clear the interval after successful connection
        clearInterval(intervalId);
      }
    }, 1000);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
    };
  }, [onWalletConnected]);
  
  // This component doesn't render anything
  return null;
};

export default PhantomResponseChecker;