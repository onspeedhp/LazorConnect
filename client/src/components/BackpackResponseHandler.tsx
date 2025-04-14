import { FC, useEffect } from 'react';
import BackpackWallet from '../lib/backpackWallet';
import { toast } from '@/hooks/use-toast';
import { useBackpackWallet } from '../lib/backpackWallet';

interface BackpackResponseHandlerProps {
  onWalletConnected?: (publicKey: string) => void;
  onTransactionSigned?: (signature: string) => void;
}

/**
 * This component handles Backpack wallet responses from deep links
 * It doesn't render anything, but processes URL parameters when:
 * 1. The app loads with Backpack response parameters
 * 2. The app receives new Backpack response parameters
 */
const BackpackResponseHandler: FC<BackpackResponseHandlerProps> = ({
  onWalletConnected,
  onTransactionSigned
}) => {
  // Process URL params on component mount
  useEffect(() => {
    checkForBackpackResponse();
    
    // Also add listener for popstate events for the back button
    window.addEventListener('popstate', checkForBackpackResponse);
    
    return () => {
      window.removeEventListener('popstate', checkForBackpackResponse);
    };
  }, []);
  
  // Function to check if URL has Backpack response parameters
  const checkForBackpackResponse = () => {
    try {
      const url = new URL(window.location.href);
      const backpackParam = url.searchParams.get('backpack');
      
      if (!backpackParam) return;
      
      console.log(`Detected Backpack ${backpackParam} response in URL`);
      
      // Process response based on type
      switch (backpackParam) {
        case 'connect':
          handleConnectResponse();
          break;
        case 'transaction':
          handleTransactionResponse();
          break;
        case 'disconnect':
          // Generally no parameters for disconnect
          toast({
            title: "Wallet Disconnected",
            description: "You've successfully disconnected your Backpack wallet.",
          });
          break;
      }
      
      // Clean URL after processing (optional)
      clearResponseUrl();
    } catch (error) {
      console.error('Error processing Backpack response:', error);
    }
  };
  
  // Handle connection response
  const handleConnectResponse = () => {
    try {
      const backpackInstance = BackpackWallet.getInstance();
      const currentURL = new URL(window.location.href);
      const publicKey = backpackInstance.handleConnectResponse(currentURL);
      
      if (publicKey) {
        console.log('Connected to Backpack wallet:', publicKey);
        toast({
          title: "Wallet Connected",
          description: "Successfully connected to Backpack wallet.",
        });
        
        if (onWalletConnected) {
          onWalletConnected(publicKey);
        }
      } else {
        console.error('Failed to connect to Backpack wallet');
        toast({
          title: "Connection Failed",
          description: "Unable to connect to Backpack wallet. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error handling Backpack connect response:', error);
      toast({
        title: "Connection Error",
        description: "Error connecting to Backpack: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    }
  };
  
  // Handle transaction response
  const handleTransactionResponse = () => {
    try {
      const backpackInstance = BackpackWallet.getInstance();
      const currentURL = new URL(window.location.href);
      const signature = backpackInstance.handleTransactionResponse(currentURL);
      
      if (signature) {
        console.log('Transaction signed with signature:', signature);
        toast({
          title: "Transaction Successful",
          description: "Transaction has been signed and submitted.",
        });
        
        if (onTransactionSigned) {
          onTransactionSigned(signature);
        }
      } else {
        console.error('Failed to process transaction');
        toast({
          title: "Transaction Failed",
          description: "Unable to process the transaction. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error handling Backpack transaction response:', error);
      toast({
        title: "Transaction Error",
        description: "Error processing transaction: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    }
  };
  
  // Clear response URL
  const clearResponseUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('backpack');
    window.history.replaceState({}, document.title, url.toString());
  };
  
  // This component doesn't render anything
  return null;
};

export default BackpackResponseHandler;