import { FC, useEffect, useState } from 'react';
import { getPhantomDeepLink } from '@/lib/walletAdapter';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateConnect: () => void;
}

const WalletModal: FC<WalletModalProps> = ({ isOpen, onClose, onSimulateConnect }) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if user is on mobile device
    const checkMobile = () => {
      setIsMobile(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
  }, []);
  
  const handleMobileConnect = () => {
    try {
      // Import the getPhantomDeepLink function
      const { getPhantomDeepLink } = require('../../lib/walletAdapter');
      
      // Log for debugging
      console.log('Attempting to open Phantom wallet on mobile');
      
      // Get the deep link URL with proper parameters
      const phantomUrl = getPhantomDeepLink();
      console.log('Opening Phantom URL:', phantomUrl);
      
      // Redirect to Phantom app
      window.location.href = phantomUrl;
      
      // Close the modal
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error('Error opening Phantom mobile app:', error);
      alert('Có lỗi khi mở ứng dụng Phantom: ' + (error instanceof Error ? error.message : String(error)));
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
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#AB9FF2] to-[#5348A3] mx-auto flex items-center justify-center mb-4">
            <img src="https://phantom.app/apple-touch-icon.png" alt="Phantom Logo" className="w-10 h-10 rounded-full" />
          </div>
          <h3 className="text-xl font-bold mb-2">Connect to Phantom</h3>
          <p className="text-sm text-[#474A57]">
            {isMobile 
              ? "Open Phantom app on your mobile device" 
              : "Open your Phantom wallet extension to connect"}
          </p>
        </div>
        
        {isMobile && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-yellow-500 mt-0.5 mr-2"></i>
              <p className="text-sm text-[#474A57]">
                Trên thiết bị di động, bạn có hai lựa chọn:<br/>
                1. Nhấn "Mở Phantom App" để mở ứng dụng Phantom Wallet<br/>
                2. Hoặc "Tiếp tục dùng bản Demo" để trải nghiệm tính năng
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
                <span>Open Phantom extension</span>
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
            {isMobile && (
              <button 
                onClick={handleMobileConnect} 
                className="w-full bg-gradient-to-r from-[#7857FF] to-[#6447CC] py-3 px-8 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#7857FF]/30 transition-all duration-300"
              >
                Mở Phantom App
              </button>
            )}
            
            {/* Luôn cung cấp tùy chọn mô phỏng để demo */}
            <button 
              onClick={onSimulateConnect} 
              className={`w-full ${isMobile ? 'bg-gray-100 text-gray-700' : 'bg-gradient-to-r from-[#7857FF] to-[#6447CC] text-white'} py-3 px-8 rounded-xl font-medium hover:shadow-lg transition-all duration-300`}
            >
              {isMobile ? 'Tiếp tục dùng bản Demo' : 'Simulate Connection (Demo)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
