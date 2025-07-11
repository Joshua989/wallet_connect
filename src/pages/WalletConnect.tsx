import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle, Copy, ExternalLink, Smartphone, Monitor, Globe } from 'lucide-react';

// Types based on the GitHub documentation
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
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

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

  // Wallet configurations with direct API calls
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
        return typeof window !== 'undefined' && !!(window as any).tronWeb;
      },
      connect: async () => {
        const tronWeb = (window as any).tronWeb;
        if (!tronWeb) {
          throw new Error('TronLink is not installed');
        }

        // Check if TronLink is ready
        if (!tronWeb.ready) {
          // Try to trigger TronLink
          if (tronWeb.request) {
            try {
              await tronWeb.request({ method: 'tron_requestAccounts' });
            } catch (error) {
              throw new Error('User rejected connection');
            }
          } else {
            throw new Error('Please unlock TronLink and refresh the page');
          }
        }

        // Wait for TronLink to be ready
        let attempts = 0;
        while (!tronWeb.ready && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (!tronWeb.ready) {
          throw new Error('TronLink is not ready. Please unlock your wallet.');
        }

        const address = tronWeb.defaultAddress?.base58;
        if (!address) {
          throw new Error('No address available. Please unlock TronLink.');
        }

        // Get network info
        let network: Network | undefined;
        try {
          const nodeInfo = await tronWeb.trx.getNodeInfo();
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
        return typeof window !== 'undefined' && !!(window as any).bitkeep?.tronLink;
      },
      connect: async () => {
        const bitkeep = (window as any).bitkeep;
        if (!bitkeep?.tronLink) {
          throw new Error('Bitget Wallet is not installed');
        }

        try {
          const accounts = await bitkeep.tronLink.request({ method: 'tron_requestAccounts' });
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
        return typeof window !== 'undefined' && !!(window as any).okxwallet?.tronLink;
      },
      connect: async () => {
        const okxwallet = (window as any).okxwallet;
        if (!okxwallet?.tronLink) {
          throw new Error('OKX Wallet is not installed');
        }

        try {
          const accounts = await okxwallet.tronLink.request({ method: 'tron_requestAccounts' });
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
        return typeof window !== 'undefined' && !!(window as any).trustwallet?.tronWeb;
      },
      connect: async () => {
        const trustwallet = (window as any).trustwallet;
        if (!trustwallet?.tronWeb) {
          throw new Error('Trust Wallet is not installed');
        }

        try {
          // Request account access
          const accounts = await trustwallet.tronWeb.request({ method: 'tron_requestAccounts' });
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
        return typeof window !== 'undefined' && !!(window as any).tokenpocket?.tronWeb;
      },
      connect: async () => {
        const tokenpocket = (window as any).tokenpocket;
        if (!tokenpocket?.tronWeb) {
          throw new Error('TokenPocket is not installed');
        }

        try {
          const accounts = await tokenpocket.tronWeb.request({ method: 'tron_requestAccounts' });
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

  // Check for wallet availability on mount
  useEffect(() => {
    // Check if any wallet is already connected
    const checkExistingConnection = async () => {
      for (const wallet of walletConfigs) {
        if (wallet.checkAvailability()) {
          try {
            const result = await wallet.connect();
            if (result.address) {
              setSelectedWallet(wallet.name);
              setAddress(result.address);
              setIsConnected(true);
              if (result.network) {
                setNetwork(result.network);
              }
              break;
            }
          } catch (e) {
            // Wallet not connected, continue checking others
          }
        }
      }
    };

    checkExistingConnection();
  }, []);

  const connectWallet = async (walletConfig: WalletConfig) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!walletConfig.checkAvailability()) {
        throw new Error(`${walletConfig.name} is not installed. Please install it first.`);
      }

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
        if (walletConfig.name === 'TronLink' && (window as any).tronWeb) {
          const tronWeb = (window as any).tronWeb;
          
          // Listen for account changes
          if (tronWeb.on) {
            tronWeb.on('addressChanged', (address: string) => {
              if (address) {
                setAddress(address);
              } else {
                handleDisconnect();
              }
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
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

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect TRON Wallet</h2>
        <p className="text-gray-600">Choose your preferred wallet to connect</p>
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
            <Wallet className="h-5 w-5" />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>

          {showWalletModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Select Wallet</h3>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {walletConfigs.map((wallet, index) => {
                    const isAvailable = wallet.checkAvailability();
                    
                    return (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 transition-colors ${
                          isAvailable 
                            ? 'hover:bg-gray-50 cursor-pointer' 
                            : 'bg-gray-50 cursor-not-allowed opacity-60'
                        }`}
                        onClick={() => isAvailable && connectWallet(wallet)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{wallet.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-800">{wallet.name}</h4>
                              {!isAvailable && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                  Not Installed
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{wallet.description}</p>
                          </div>
                          {!isAvailable && (
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
                    <strong>Note:</strong> Make sure you have the wallet extension installed and unlocked before connecting.
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