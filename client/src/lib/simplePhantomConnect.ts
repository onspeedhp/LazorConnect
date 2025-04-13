/**
 * Simple Phantom Wallet connection using the Universal Link (ul) approach.
 * This uses the simpler deep linking method without encryption for better compatibility.
 */

// Create a URL for connecting to Phantom wallet
export function getPhantomConnectUrl(): string {
  const currentUrl = window.location.href;
  const redirectUrl = encodeURIComponent(currentUrl);
  
  // Use Phantom's universal link format with devnet cluster and proper redirect
  const phantomUrl = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(window.location.origin)}&redirect_url=${redirectUrl}&cluster=devnet`;
  
  console.log('Created Phantom connect URL:', phantomUrl);
  return phantomUrl;
}

// Check if the current URL contains a Phantom wallet connection response
export function checkForPhantomResponse(): { isConnected: boolean, publicKey: string | null } {
  try {
    // Check if there's a public key in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const publicKey = urlParams.get('phantom_encryption_public_key');
    
    if (publicKey) {
      console.log('Found Phantom public key in URL:', publicKey);
      return {
        isConnected: true,
        publicKey
      };
    }
    
    return {
      isConnected: false,
      publicKey: null
    };
  } catch (error) {
    console.error('Error checking for Phantom response:', error);
    return {
      isConnected: false,
      publicKey: null
    };
  }
}

// Clear the URL of Phantom response parameters
export function clearPhantomResponseUrl(): void {
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}