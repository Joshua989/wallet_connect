import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle, Copy, ExternalLink, Smartphone, Monitor, Loader2 } from 'lucide-react';

// Enhanced types with proper window extensions
declare global {
  interface Window {
    tronWeb?: {
      ready: boolean;
      defaultAddress: { base58: string };
      trx: { getNodeInfo(): Promise<any> };
      on?: (event: string, callback: (address: string) => void) => void;
      request?: (options: { method: string }) => Promise<void>;
    };
    ethereum?: any;
    trustwallet?: any;
    TronLink?: any;
  }
}

interface Network {
  networkType: 'Mainnet' | 'Shasta' | 'Nile' | 'Unknown';
  chainId: string;
  fullNode: string;
  solidityNode: string;
  eventServer: string;
}

interface WalletConfig {
  name: string;
  icon: string;
  description: string;
  downloadUrl: string;
  mobileDeepLink: string;
  checkAvailability: () => boolean;
  connect: () => Promise<{ address: string; network?: Network }>;
}

const WalletConnect: React.FC = () => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };

    setIsMobile(detectMobile());

    // Check for existing connections on page load
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      if (window.tronWeb && window.tronWeb.ready && window.tronWeb.defaultAddress?.base58) {
        const address = window.tronWeb.defaultAddress.base58;
        setAddress(address);
        setIsConnected(true);
        setSelectedWallet('Trust Wallet');
        
        // Get network info
        try {
          const nodeInfo = await window.tronWeb.trx.getNodeInfo();
          const chainId = nodeInfo.configNodeInfo?.codeVersion || '0x2b6653dc';
          setNetwork(detectNetwork(chainId));
        } catch (e) {
          console.warn('Could not get network info:', e);
        }
      }
    } catch (error) {
      console.log('No existing connection found');
    }
  };

  // Helper function to detect network
  const detectNetwork = (chainId: string): Network => {
    const networks: { [key: string]: Network } = {
      '0x2b6653dc': {
        networkType: 'Mainnet',
        chainId: '0x2b6653dc',
        fullNode: 'https://api.trongrid.io',
        solidityNode: 'https://api.trongrid.io',
        eventServer: 'https://api.trongrid.io'
      },
      '0x94a9059e': {
        networkType: 'Shasta',
        chainId: '0x94a9059e',
        fullNode: 'https://api.shasta.trongrid.io',
        solidityNode: 'https://api.shasta.trongrid.io',
        eventServer: 'https://api.shasta.trongrid.io'
      },
      '0xcd8690dc': {
        networkType: 'Nile',
        chainId: '0xcd8690dc',
        fullNode: 'https://nile.trongrid.io',
        solidityNode: 'https://nile.trongrid.io',
        eventServer: 'https://nile.trongrid.io'
      }
    };

    return networks[chainId] || {
      networkType: 'Unknown',
      chainId,
      fullNode: '',
      solidityNode: '',
      eventServer: ''
    };
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Trust Wallet connection logic
  const connectTrustWallet = async (): Promise<{ address: string; network?: Network }> => {
    // Mobile connection
    if (isMobile) {
      try {
        // First try to detect if Trust Wallet app is installed
        const currentUrl = window.location.href;
        const encodedUrl = encodeURIComponent(currentUrl);
        
        // Trust Wallet deep link for TRON
        const trustWalletDeepLink = `https://link.trustwallet.com/open_url?coin_id=195&url=${encodedUrl}`;
        
        // Open Trust Wallet app
        window.location.href = trustWalletDeepLink;
        
        // Wait for user to return from Trust Wallet
        await sleep(2000);
        
        // Check if TronWeb is now available
        let attempts = 0;
        while (!window.tronWeb && attempts < 30) {
          await sleep(1000);
          attempts++;
        }
        
        if (!window.tronWeb) {
          throw new Error('Trust Wallet connection failed. Please make sure Trust Wallet is installed and try again.');
        }
        
        // Wait for TronWeb to be ready
        attempts = 0;
        while (!window.tronWeb.ready && attempts < 20) {
          await sleep(500);
          attempts++;
        }
        
        if (!window.tronWeb.ready) {
          throw new Error('Trust Wallet is not ready. Please unlock your wallet and try again.');
        }
        
        const address = window.tronWeb.defaultAddress?.base58;
        if (!address) {
          throw new Error('No address available. Please unlock Trust Wallet and try again.');
        }
        
        return { address };
        
      } catch (error) {
        console.error('Mobile Trust Wallet connection error:', error);
        throw error;
      }
    }
    
    // Desktop connection
    else {
      try {
        // Check if Trust Wallet extension is installed
        if (!window.tronWeb) {
          throw new Error('Trust Wallet extension is not installed. Please install it from the Chrome Web Store.');
        }
        
        // Try to request connection
        if (window.tronWeb.request) {
          try {
            await window.tronWeb.request({ method: 'tron_requestAccounts' });
          } catch (error: any) {
            if (error.code === 4001) {
              throw new Error('Connection rejected by user');
            }
            throw error;
          }
        }
        
        // Wait for TronWeb to be ready
        let attempts = 0;
        while (!window.tronWeb.ready && attempts < 20) {
          await sleep(500);
          attempts++;
        }
        
        if (!window.tronWeb.ready) {
          throw new Error('Trust Wallet is not ready. Please unlock your wallet and refresh the page.');
        }
        
        const address = window.tronWeb.defaultAddress?.base58;
        if (!address) {
          throw new Error('No address available. Please unlock Trust Wallet.');
        }
        
        // Get network info
        let network: Network | undefined;
        try {
          const nodeInfo = await window.tronWeb.trx.getNodeInfo();
          const chainId = nodeInfo.configNodeInfo?.codeVersion || '0x2b6653dc';
          network = detectNetwork(chainId);
        } catch (e) {
          console.warn('Could not get network info:', e);
        }
        
        return { address, network };
        
      } catch (error) {
        console.error('Desktop Trust Wallet connection error:', error);
        throw error;
      }
    }
  };

  // Wallet configuration - Only Trust Wallet
  const walletConfig: WalletConfig = {
    name: 'Trust Wallet',
    icon: '🛡️',
    description: 'Secure multi-chain wallet with TRON support',
    downloadUrl: 'https://trustwallet.com/',
    mobileDeepLink: 'https://link.trustwallet.com/open_url',
    checkAvailability: () => {
      if (isMobile) {
        return true; // Always show on mobile, will use deep link
      }
      return typeof window !== 'undefined' && !!window.tronWeb;
    },
    connect: connectTrustWallet
  };

  const connectWallet = async () => {
    setConnectingWallet('Trust Wallet');
    setError(null);

    try {
      const result = await walletConfig.connect();
      
      if (result.address) {
        setSelectedWallet('Trust Wallet');
        setAddress(result.address);
        setIsConnected(true);
        setShowWalletModal(false);

        if (result.network) {
          setNetwork(result.network);
        }

        // Set up event listeners for desktop
        if (!isMobile && window.tronWeb?.on) {
          window.tronWeb.on('addressChanged', (address: string) => {
            if (address) {
              setAddress(address);
            } else {
              handleDisconnect();
            }
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleDisconnect = () => {
    setSelectedWallet(null);
    setAddress(null);
    setIsConnected(false);
    setNetwork(null);
    setError(null);
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkColor = (networkType: string) => {
    switch (networkType) {
      case 'Mainnet': return 'text-green-500';
      case 'Shasta': return 'text-yellow-500';
      case 'Nile': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect TRON Wallet</h2>
        <p className="text-gray-600">Connect with Trust Wallet to access TRON network</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {!isConnected ? (
        <div className="space-y-4">
          <button
            onClick={() => setShowWalletModal(true)}
            disabled={connectingWallet !== null}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Wallet className="h-5 w-5" />
            {connectingWallet ? 'Connecting...' : 'Connect Wallet'}
          </button>

          {showWalletModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Connect Trust Wallet</h3>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                    disabled={connectingWallet !== null}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🛡️</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">Trust Wallet</h4>
                        <p className="text-sm text-gray-600">
                          {isMobile ? 'Open Trust Wallet app to connect' : 'Connect with Trust Wallet browser extension'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      {isMobile ? (
                        <div className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          <span>Mobile App</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          <span>Browser Extension</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={connectWallet}
                      disabled={connectingWallet !== null}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {connectingWallet ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4" />
                          Connect
                        </>
                      )}
                    </button>
                  </div>

                  {!walletConfig.checkAvailability() && !isMobile && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-2">
                        Trust Wallet extension not detected.
                      </p>
                      <a
                        href={walletConfig.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Download Trust Wallet
                      </a>
                    </div>
                  )}

                  {isMobile && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Mobile users:</strong> Clicking connect will open Trust Wallet app. 
                        Make sure you have Trust Wallet installed on your device.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Wallet Connected (Trust Wallet)</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Address:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{formatAddress(address || '')}</span>
                <button
                  onClick={copyAddress}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {network && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Network:</span>
                <span className={`font-semibold ${getNetworkColor(network.networkType)}`}>
                  {network.networkType}
                </span>
              </div>
            )}

            {network && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Chain ID:</span>
                <span className="font-mono text-sm">{network.chainId}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Platform:</span>
              <span className="text-sm text-gray-800">
                {isMobile ? 'Mobile App' : 'Browser Extension'}
              </span>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Secure connection with Trust Wallet • {isMobile ? 'Mobile App' : 'Browser Extension'}
        </p>
      </div>
    </div>
  );
};

export default WalletConnect;