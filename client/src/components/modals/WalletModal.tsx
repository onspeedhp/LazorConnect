import { FC } from 'react';
import { connectBackpack } from '@/lib/backpackAdapter';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateConnect: () => void;
}

const WalletModal: FC<WalletModalProps> = ({ isOpen, onClose, onSimulateConnect }) => {
  if (!isOpen) return null;

  const handleDirectConnect = () => {
    // This will redirect to Backpack for real connection
    connectBackpack();
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
            <img src="https://avatars.githubusercontent.com/u/95545489?s=200&v=4" alt="Backpack Logo" className="w-10 h-10 rounded-full" />
          </div>
          <h3 className="text-xl font-bold mb-2">Connect to Backpack</h3>
          <p className="text-sm text-[#474A57]">Choose how you want to connect with Backpack wallet</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Connection Options</span>
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
              <span>Connection initialized</span>
            </li>
            <li className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-[#00D170] flex items-center justify-center mr-2 text-white text-xs">
                <i className="fas fa-check"></i>
              </div>
              <span>Deeplink prepared</span>
            </li>
            <li className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-[#9FA3B5]/30 flex items-center justify-center mr-2 text-white text-xs">
                3
              </div>
              <span>Waiting for connection approval</span>
            </li>
          </ol>
        </div>
        <div className="flex flex-col space-y-3">
          <button 
            onClick={handleDirectConnect} 
            className="bg-gradient-to-r from-[#7857FF] to-[#6447CC] py-3 px-8 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#7857FF]/30 transition-all duration-300"
          >
            Connect with Backpack
          </button>
          
          <button 
            onClick={onSimulateConnect} 
            className="border border-[#7857FF] text-[#7857FF] py-3 px-8 rounded-xl font-medium hover:bg-[#7857FF]/5 transition-all duration-300"
          >
            Simulate Connection (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
