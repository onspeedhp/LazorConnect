import { FC, useEffect, useState } from 'react';
import { getPhantomConnectUrl } from '@/lib/simplePhantomConnect';
import { useBackpackWallet } from '@/lib/backpackWallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateConnect: () => void;
}

const WalletModal: FC<WalletModalProps> = ({ isOpen, onClose, onSimulateConnect }) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [selectedWallet, setSelectedWallet] = useState<'phantom' | 'backpack'>('backpack');
  const { connectWallet: connectBackpack } = useBackpackWallet();
  
  useEffect(() => {
    // Check if user is on mobile device
    const checkMobile = () => {
      setIsMobile(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
  }, []);
  
  const handleMobileConnect = () => {
    try {
      if (selectedWallet === 'phantom') {
        // Log for debugging
        console.log('Attempting to open Phantom wallet using simple deep link');
        
        // Get the Phantom connect URL
        const phantomUrl = getPhantomConnectUrl();
        
        // Show a prompt about what to expect
        if (isMobile) {
          console.log("Opening Phantom app:", phantomUrl);
        }
        
        // Open the Phantom wallet
        window.location.href = phantomUrl;
      } else {
        // Connect with Backpack
        console.log('Attempting to connect with Backpack wallet');
        connectBackpack();
      }
      
      // Close the modal
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error(`Error opening ${selectedWallet} wallet:`, error);
      alert(`Error opening ${selectedWallet} wallet: ` + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#131418]/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-11/12 max-w-sm p-6 relative animate-slide-up">
        <button 
          className="absolute top-4 right-4 text-[#9FA3B5]" 
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        
        {/* Wallet Selection */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 rounded-xl p-1 flex w-full">
            <button
              onClick={() => setSelectedWallet('backpack')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                selectedWallet === 'backpack' 
                  ? 'bg-white shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              Backpack
            </button>
            <button
              onClick={() => setSelectedWallet('phantom')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                selectedWallet === 'phantom' 
                  ? 'bg-white shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              Phantom
            </button>
          </div>
        </div>
        
        <div className="text-center mb-6">
          {selectedWallet === 'phantom' ? (
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#AB9FF2] to-[#5348A3] mx-auto flex items-center justify-center mb-4">
              <img src="https://phantom.app/apple-touch-icon.png" alt="Phantom Logo" className="w-10 h-10 rounded-full" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#E93D44] to-[#B91C1C] mx-auto flex items-center justify-center mb-4">
              <i className="fas fa-wallet text-white text-xl"></i>
            </div>
          )}
          <h3 className="text-xl font-bold mb-2">
            Connect to {selectedWallet === 'phantom' ? 'Phantom' : 'Backpack'}
          </h3>
          <p className="text-sm text-[#474A57]">
            {isMobile 
              ? `Open ${selectedWallet} app on your mobile device` 
              : `Open your ${selectedWallet} wallet extension to connect`}
          </p>
        </div>
        
        {isMobile && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-yellow-500 mt-0.5 mr-2"></i>
              <p className="text-sm text-[#474A57]">
                To connect with {selectedWallet} wallet:<br/>
                • Ensure you have the {selectedWallet} app installed<br/>
                • Approve the connection request in the app
              </p>
            </div>
          </div>
        )}
        
        {!isMobile && (
          <div className="border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Connection Status</span>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-[#FFBB33] mr-2 animate-bounce"></div>
                <span className="text-xs text-[#FFBB33]">Waiting...</span>
              </div>
            </div>
            <ol className="text-sm text-[#474A57] space-y-2">
              <li className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#00D170] flex items-center justify-center mr-2 text-white text-xs">
                  <i className="fas fa-check"></i>
                </div>
                <span>Initializing connection</span>
              </li>
              <li className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#9FA3B5]/30 flex items-center justify-center mr-2 text-white text-xs">
                  2
                </div>
                <span>Open {selectedWallet} extension</span>
              </li>
              <li className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#9FA3B5]/30 flex items-center justify-center mr-2 text-white text-xs">
                  3
                </div>
                <span>Approve connection request</span>
              </li>
            </ol>
          </div>
        )}
        
        <div className="flex justify-center">
          <div className="space-y-2 w-full">
            <button 
              onClick={handleMobileConnect} 
              className={`w-full py-3 px-8 rounded-xl text-white font-medium hover:shadow-lg transition-all duration-300 ${
                selectedWallet === 'phantom'
                  ? 'bg-gradient-to-r from-[#7857FF] to-[#6447CC] hover:shadow-[#7857FF]/30'
                  : 'bg-gradient-to-r from-[#E93D44] to-[#B91C1C] hover:shadow-[#E93D44]/30'
              }`}
            >
              Open {selectedWallet === 'phantom' ? 'Phantom' : 'Backpack'} App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;