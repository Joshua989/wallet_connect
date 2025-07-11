import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle, Copy, ExternalLink, Smartphone, Monitor, Globe, Loader2 } from 'lucide-react';

// Enhanced types with proper window extensions
declare global {
  interface Window {
    tronWeb?: {
      ready: boolean;
      defaultAddress: { base58: string };
      trx: { getNodeInfo(): Promise<any> };
      on?: (event: string, callback: (address: string) => void) => void;
      request?: (options: { method: string }) => Promise<string[]>;
    };
    bitkeep?: {
      tronLink: {
        request(options: { method: string }): Promise<string[]>;
      };
    };
    okxwallet?: {
      tronLink: {
        request(options: { method: string }): Promise<string[]>;
      };
    };
    trustwallet?: {
      tronWeb: {
        request(options: { method: string }): Promise<string[]>;
      };
    };
    tokenpocket?: {
      tronWeb: {
        request(options: { method: string }): Promise<string[]>;
      };
    };
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
  deepLinkSupported: boolean;
  extensionSupported: boolean;
  mobileSupported: boolean;
  checkAvailability: () => boolean;
  connect: () => Promise<{ address: string; network?: Network }>;
}

const WalletConnect: React.FC = () => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Helper function to handle mobile deep links
  const handleMobileDeepLink = (walletName: string) => {
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    
    const deepLinks: { [key: string]: string } = {
      'TronLink': `tronlinkoutside://open.tronlink.org/dapp?dappUrl=${encodedUrl}`,
      'Bitget Wallet': `bitkeep://dapp?url=${encodedUrl}`,
      'OKX Wallet': `okex://dapp?url=${encodedUrl}`,
      'Trust Wallet': `trust://dapp?url=${encodedUrl}`,
      'TokenPocket': `tokenpocket://dapp?url=${encodedUrl}`
    };

    const deepLink = deepLinks[walletName];
    if (deepLink) {
      window.location.href = deepLink;
      
      // Fallback to app store after delay
      setTimeout(() => {
        const appStoreLinks: { [key: string]: string } = {
          'TronLink': 'https://apps.apple.com/app/tronlink/id1453530188',
          'Bitget Wallet': 'https://apps.apple.com/app/bitget-wallet/id1436799971',
          'OKX Wallet': 'https://apps.apple.com/app/okx-wallet/id1327268470',
          'Trust Wallet': 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
          'TokenPocket': 'https://apps.apple.com/app/tokenpocket/id1436028697'
        };
        
        const playStoreLinks: { [key: string]: string } = {
          'TronLink': 'https://play.google.com/store/apps/details?id=com.tronlinkpro.wallet',
          'Bitget Wallet': 'https://play.google.com/store/apps/details?id=com.bitget.wallet',
          'OKX Wallet': 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
          'Trust Wallet': 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
          'TokenPocket': 'https://play.google.com/store/apps/details?id=com.tokenpocket.gp'
        };
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const storeLink = isIOS ? appStoreLinks[walletName] : playStoreLinks[walletName];
        
        if (storeLink) {
          window.open(storeLink, '_blank');
        }
      }, 2000);
    }
  };

  // Enhanced wallet configurations
  const walletConfigs: WalletConfig[] = [
    {
      name: 'TronLink',
      icon: '🔗',
      description: 'Most popular TRON wallet with browser extension and mobile app',
      downloadUrl: 'https://www.tronlink.org/',
      deepLinkSupported: true,
      extensionSupported: true,
      mobileSupported: true,
      checkAvailability: () => {
        if (isMobile) {
          return true; // Always show as available on mobile for deep linking
        }
        return typeof window !== 'undefined' && !!window.tronWeb;
      },
      connect: async () => {
        if (isMobile && !window.tronWeb) {
          handleMobileDeepLink('TronLink');
          throw new Error('Redirecting to TronLink mobile app...');
        }

        if (!window.tronWeb) {
          throw new Error('TronLink is not installed. Please install the extension.');
        }

        // Request account access
        if (window.tronWeb.request) {
          try {
            const accounts = await window.tronWeb.request({ method: 'tron_requestAccounts' });
            if (!accounts || accounts.length === 0) {
              throw new Error('No accounts available');
            }
          } catch (error: any) {
            if (error.code === 4001) {
              throw new Error('User rejected connection');
            }
            throw error;
          }
        }

        // Wait for TronLink to be ready
        let attempts = 0;
        while (!window.tronWeb.ready && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (!window.tronWeb.ready) {
          throw new Error('TronLink is not ready. Please unlock your wallet.');
        }

        const address = window.tronWeb.defaultAddress?.base58;
        if (!address) {
          throw new Error('No address available. Please unlock TronLink.');
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
      }
    },
    {
      name: 'Bitget Wallet',
      icon: '🔐',
      description: 'Formerly BitKeep, secure multi-chain wallet',
      downloadUrl: 'https://web3.bitget.com/',
      deepLinkSupported: true,
      extensionSupported: true,
      mobileSupported: true,
      checkAvailability: () => {
        if (isMobile) {
          return true; // Always show as available on mobile for deep linking
        }
        return typeof window !== 'undefined' && !!window.bitkeep?.tronLink;
      },
      connect: async () => {
        if (isMobile && !window.bitkeep?.tronLink) {
          handleMobileDeepLink('Bitget Wallet');
          throw new Error('Redirecting to Bitget Wallet mobile app...');
        }

        if (!window.bitkeep?.tronLink) {
          throw new Error('Bitget Wallet is not installed');
        }

        try {
          const accounts = await window.bitkeep.tronLink.request({ method: 'tron_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
          }

          const address = accounts[0];
          return { address };
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error('User rejected connection');
          }
          throw error;
        }
      }
    },
    {
      name: 'OKX Wallet',
      icon: '🌐',
      description: 'Leading crypto exchange wallet with TRON support',
      downloadUrl: 'https://www.okx.com/web3',
      deepLinkSupported: true,
      extensionSupported: true,
      mobileSupported: true,
      checkAvailability: () => {
        if (isMobile) {
          return true; // Always show as available on mobile for deep linking
        }
        return typeof window !== 'undefined' && !!window.okxwallet?.tronLink;
      },
      connect: async () => {
        if (isMobile && !window.okxwallet?.tronLink) {
          handleMobileDeepLink('OKX Wallet');
          throw new Error('Redirecting to OKX Wallet mobile app...');
        }

        if (!window.okxwallet?.tronLink) {
          throw new Error('OKX Wallet is not installed');
        }

        try {
          const accounts = await window.okxwallet.tronLink.request({ method: 'tron_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
          }

          const address = accounts[0];
          return { address };
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error('User rejected connection');
          }
          throw error;
        }
      }
    },
    {
      name: 'Trust Wallet',
      icon: '🛡️',
      description: 'Multi-chain mobile wallet with browser extension',
      downloadUrl: 'https://trustwallet.com/',
      deepLinkSupported: true,
      extensionSupported: true,
      mobileSupported: true,
      checkAvailability: () => {
        if (isMobile) {
          return true; // Always show as available on mobile for deep linking
        }
        return typeof window !== 'undefined' && !!window.trustwallet?.tronWeb;
      },
      connect: async () => {
        if (isMobile && !window.trustwallet?.tronWeb) {
          handleMobileDeepLink('Trust Wallet');
          throw new Error('Redirecting to Trust Wallet mobile app...');
        }

        if (!window.trustwallet?.tronWeb) {
          throw new Error('Trust Wallet is not installed');
        }

        try {
          const accounts = await window.trustwallet.tronWeb.request({ method: 'tron_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
          }

          const address = accounts[0];
          return { address };
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error('User rejected connection');
          }
          throw error;
        }
      }
    },
    {
      name: 'TokenPocket',
      icon: '💼',
      description: 'Multi-chain wallet with comprehensive DeFi support',
      downloadUrl: 'https://www.tokenpocket.pro/',
      deepLinkSupported: true,
      extensionSupported: true,
      mobileSupported: true,
      checkAvailability: () => {
        if (isMobile) {
          return true; // Always show as available on mobile for deep linking
        }
        return typeof window !== 'undefined' && !!window.tokenpocket?.tronWeb;
      },
      connect: async () => {
        if (isMobile && !window.tokenpocket?.tronWeb) {
          handleMobileDeepLink('TokenPocket');
          throw new Error('Redirecting to TokenPocket mobile app...');
        }

        if (!window.tokenpocket?.tronWeb) {
          throw new Error('TokenPocket is not installed');
        }

        try {
          const accounts = await window.tokenpocket.tronWeb.request({ method: 'tron_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
          }

          const address = accounts[0];
          return { address };
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error('User rejected connection');
          }
          throw error;
        }
      }
    }
  ];

  const connectWallet = async (walletConfig: WalletConfig) => {
    setIsConnecting(true);
    setConnectingWallet(walletConfig.name);
    setError(null);

    try {
      const result = await walletConfig.connect();
      
      if (result.address) {
        setSelectedWallet(walletConfig.name);
        setAddress(result.address);
        setIsConnected(true);
        setShowWalletModal(false);

        if (result.network) {
          setNetwork(result.network);
        }

        // Set up event listeners for TronLink
        if (walletConfig.name === 'TronLink' && window.tronWeb?.on) {
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
      setIsConnecting(false);
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
        <p className="text-gray-600">Choose your preferred wallet to connect</p>
        {isMobile && (
          <p className="text-sm text-blue-600 mt-2">📱 Mobile device detected</p>
        )}
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
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                Connect Wallet
              </>
            )}
          </button>

          {showWalletModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Select Wallet</h3>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                    disabled={isConnecting}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {walletConfigs.map((wallet, index) => {
                    const isAvailable = wallet.checkAvailability();
                    const isCurrentlyConnecting = connectingWallet === wallet.name;
                    
                    return (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 transition-colors ${
                          isAvailable && !isConnecting
                            ? 'hover:bg-gray-50 cursor-pointer' 
                            : 'cursor-not-allowed opacity-60'
                        } ${isCurrentlyConnecting ? 'bg-blue-50 border-blue-200' : ''}`}
                        onClick={() => {
                          if (isAvailable && !isConnecting) {
                            connectWallet(wallet);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{wallet.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-800">{wallet.name}</h4>
                              {isCurrentlyConnecting && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              )}
                              {!isAvailable && !isMobile && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                  Not Installed
                                </span>
                              )}
                              {isMobile && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                  Mobile
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{wallet.description}</p>
                          </div>
                          {!isAvailable && !isMobile && (
                            <a
                              href={wallet.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {wallet.extensionSupported && (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              <span>Desktop</span>
                            </div>
                          )}
                          {wallet.mobileSupported && (
                            <div className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />
                              <span>Mobile</span>
                            </div>
                          )}
                          {wallet.deepLinkSupported && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span>Deep Link</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> {isMobile 
                      ? 'On mobile, clicking a wallet will open the app if installed, or redirect to the app store.'
                      : 'Make sure you have the wallet extension installed and unlocked before connecting.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Wallet Connected ({selectedWallet})</span>
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
          Supported wallets: TronLink, Bitget, OKX, Trust Wallet, TokenPocket
        </p>
      </div>
    </div>
  );
};

export default WalletConnect;