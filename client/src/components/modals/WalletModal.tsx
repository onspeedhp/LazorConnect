import { FC } from 'react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateConnect: () => void;
}

const WalletModal: FC<WalletModalProps> = ({ isOpen, onClose, onSimulateConnect }) => {
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
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#AB9FF2] to-[#5348A3] mx-auto flex items-center justify-center mb-4">
            <img src="https://avatars.githubusercontent.com/u/95545489?s=200&v=4" alt="Backpack Logo" className="w-10 h-10 rounded-full" />
          </div>
          <h3 className="text-xl font-bold mb-2">Connect to Backpack</h3>
          <p className="text-sm text-[#474A57]">Open your Backpack wallet app to connect</p>
        </div>
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
              <span>Open Backpack app on your device</span>
            </li>
            <li className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-[#9FA3B5]/30 flex items-center justify-center mr-2 text-white text-xs">
                3
              </div>
              <span>Approve connection request</span>
            </li>
          </ol>
        </div>
        <div className="flex justify-center">
          <button 
            onClick={onSimulateConnect} 
            className="bg-gradient-to-r from-[#7857FF] to-[#6447CC] py-3 px-8 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#7857FF]/30 transition-all duration-300"
          >
            Simulate Connection (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
