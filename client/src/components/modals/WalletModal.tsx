import { FC } from 'react';
import { usePhantomWallet } from '@/hooks/use-phantom-wallet';
import phantomLogo from '../../assets/phantom.png';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: FC<WalletModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const { connectPhantom } = usePhantomWallet();

  const handleConnect = () => {
    // This will redirect to Phantom mobile app via deeplink
    connectPhantom();
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
          <p className="text-sm text-[#474A57]">Use your existing Wallet app</p>
        </div>
        
        <div className="mb-6 flex justify-center">
          <div 
            className="border rounded-xl p-4 flex flex-col items-center transition-all cursor-pointer border-[#5348A3] bg-[#5348A3]/5 w-40"
          >
            <div className="w-12 h-12 rounded-full mb-2 bg-[#9c85f7] p-1 flex items-center justify-center">
              <img src={phantomLogo} alt="Phantom Logo" className="w-9 h-9" />
            </div>
            <span className="text-sm font-medium">Phantom</span>
          </div>
        </div>
        
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
              <span>Redirect to Phantom app</span>
            </li>
            <li className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-[#9FA3B5]/30 flex items-center justify-center mr-2 text-white text-xs">
                3
              </div>
              <span>Approve connection</span>
            </li>
          </ol>
        </div>
        
        <div className="flex flex-col">
          <button 
            onClick={handleConnect}
            className="py-3 px-8 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-[#4e44ce] to-[#735cff] hover:shadow-lg hover:shadow-[#735cff]/30"
          >
            Connect with Phantom
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
