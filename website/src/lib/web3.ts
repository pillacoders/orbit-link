export const AMOY_CHAIN_ID = '0x13882'; // 80002
export const ORBIT_TOKEN_ADDRESS = '0xcDcC1EEDF4b983b613Eaa5b673692BC12e31c860';

const AMOY_CHAIN_PARAMS = {
  chainId: AMOY_CHAIN_ID,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

/**
 * Ensures the wallet is on the Polygon Amoy network.
 * If not, it will prompt the user to switch or add the network.
 */
export async function ensureAmoyNetwork(provider: any) {
  const currentChainId = await provider.request({ method: 'eth_chainId' });
  
  if (currentChainId !== AMOY_CHAIN_ID) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Error 4902 means the chain hasn't been added to the wallet yet
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [AMOY_CHAIN_PARAMS],
          });
        } catch (addError) {
          throw new Error('Failed to add Polygon Amoy network to your wallet.');
        }
      } else {
        throw new Error('Please switch to the Polygon Amoy network to continue.');
      }
    }
  }
}

/**
 * Prompts the user to add the ORBS token to their wallet so they can see their balance.
 */
export async function promptAddOrbsToken(provider: any) {
  try {
    await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: ORBIT_TOKEN_ADDRESS,
          symbol: 'ORBS',
          decimals: 18,
          // Optional: You can provide an image URL for the token logo here
          // image: 'https://yourwebsite.com/token-logo.png',
        },
      },
    });
  } catch (error) {
    console.error('Failed to add ORBS token to wallet', error);
  }
}
