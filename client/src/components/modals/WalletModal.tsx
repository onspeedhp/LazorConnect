import { FC, useState } from 'react';
import { usePhantomWallet } from '@/hooks/use-phantom-wallet';
import { useBackpackWallet } from '@/hooks/use-backpack-wallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalletOption = 'phantom' | 'backpack' | null;

const WalletModal: FC<WalletModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const { connectPhantom } = usePhantomWallet();
  const { connectBackpack } = useBackpackWallet();
  const [selectedWallet, setSelectedWallet] = useState<WalletOption>(null);

  const handleSelectWallet = (wallet: WalletOption) => {
    setSelectedWallet(wallet);
  };

  const handleConnect = () => {
    if (selectedWallet === 'phantom') {
      // This will redirect to Phantom mobile app via deeplink
      connectPhantom();
    } else if (selectedWallet === 'backpack') {
      // This will redirect to Backpack app via deeplink
      connectBackpack();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#131418]/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-11/12 max-w-sm p-6 relative animate-slide-up">
        <button 
          className="absolute top-4 right-4 text-[#9FA3B5]" 
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#AB9FF2] to-[#5348A3] mx-auto flex items-center justify-center mb-4">
            <i className="fas fa-wallet text-white text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-[#474A57]">Choose a wallet to connect to</p>
        </div>
        
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div 
            className={`border rounded-xl p-4 flex flex-col items-center transition-all cursor-pointer ${
              selectedWallet === 'phantom' 
                ? 'border-[#5348A3] bg-[#5348A3]/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSelectWallet('phantom')}
          >
            <img src="https://phantom.app/apple-touch-icon.png" alt="Phantom Logo" className="w-12 h-12 rounded-full mb-2" />
            <span className="text-sm font-medium">Phantom</span>
          </div>
          
          <div 
            className={`border rounded-xl p-4 flex flex-col items-center transition-all cursor-pointer ${
              selectedWallet === 'backpack' 
                ? 'border-[#5348A3] bg-[#5348A3]/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSelectWallet('backpack')}
          >
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-2">
              <span className="text-white text-xs font-bold">BP</span>
            </div>
            <span className="text-sm font-medium">Backpack</span>
          </div>
        </div>
        
        {selectedWallet && (
          <div className="border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Connection Process</span>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-[#00D170] mr-2"></div>
                <span className="text-xs text-[#00D170]">Ready</span>
              </div>
            </div>
            <ol className="text-sm text-[#474A57] space-y-2">
              <li className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#00D170] flex items-center justify-center mr-2 text-white text-xs">
                  <i className="fas fa-check"></i>
                </div>
                <span>Deeplink prepared</span>
              </li>
              <li className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#9FA3B5]/30 flex items-center justify-center mr-2 text-white text-xs">
                  2
                </div>
                <span>Redirect to {selectedWallet === 'phantom' ? 'Phantom' : 'Backpack'} app</span>
              </li>
              <li className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#9FA3B5]/30 flex items-center justify-center mr-2 text-white text-xs">
                  3
                </div>
                <span>Approve connection</span>
              </li>
            </ol>
          </div>
        )}
        
        <div className="flex flex-col">
          <button 
            onClick={handleConnect} 
            disabled={!selectedWallet}
            className={`py-3 px-8 rounded-xl text-white font-medium transition-all duration-300 ${
              selectedWallet 
                ? 'bg-gradient-to-r from-[#4e44ce] to-[#735cff] hover:shadow-lg hover:shadow-[#735cff]/30' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {selectedWallet 
              ? `Connect with ${selectedWallet === 'phantom' ? 'Phantom' : 'Backpack'}` 
              : 'Select a wallet first'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
