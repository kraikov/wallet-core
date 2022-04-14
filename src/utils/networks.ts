import { BitcoinNetworks } from '@liquality/bitcoin';
import { EvmNetworks } from '@liquality/evm';
import { NearNetworks } from '@liquality/near';
import { TerraNetworks } from '@liquality/terra';
import buildConfig from '../build.config';
import { Network } from '../store/types';

export const Networks = [Network.Mainnet, Network.Testnet];

export const ChainNetworks = {
  bitcoin: {
    testnet: BitcoinNetworks.bitcoin_testnet,
    mainnet: BitcoinNetworks.bitcoin,
  },

  ethereum: {
    testnet: {
      ...EvmNetworks.ropsten,
      rpcUrl: `https://ropsten.infura.io/v3/${buildConfig.infuraApiKey}`,
    },
    mainnet: {
      ...EvmNetworks.ethereum_mainnet,
      rpcUrl: `https://mainnet.infura.io/v3/${buildConfig.infuraApiKey}`,
    },
  },

  rsk: {
    testnet: {
      ...EvmNetworks.rsk_testnet,
      rpcUrl: buildConfig.rskRpcUrls.testnet,
    },
    mainnet: {
      ...EvmNetworks.rsk_mainnet,
      rpcUrl: buildConfig.rskRpcUrls.mainnet,
    },
  },

  bsc: {
    testnet: {
      ...EvmNetworks.bsc_testnet,
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    },
    mainnet: {
      ...EvmNetworks.bsc_mainnet,
      rpcUrl: 'https://bsc-dataseed.binance.org',
    },
  },

  polygon: {
    testnet: {
      ...EvmNetworks.polygon_testnet,
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    },
    mainnet: {
      ...EvmNetworks.polygon_mainnet,
      rpcUrl: 'https://polygon-rpc.com',
    },
  },

  arbitrum: {
    testnet: {
      ...EvmNetworks.arbitrum_testnet,
      rpcUrl: 'https://rinkeby.arbitrum.io/rpc',
    },
    mainnet: {
      ...EvmNetworks.arbitrum_mainnet,
      rpcUrl: `https://arbitrum-mainnet.infura.io/v3/${buildConfig.infuraApiKey}`,
    },
  },

  avalanche: {
    testnet: {
      ...EvmNetworks.avax_testnet,
      rpcUrl: process.env.VUE_APP_AVALANCHE_TESTNET_NODE || 'https://api.avax-test.network/ext/bc/C/rpc',
    },
    mainnet: {
      ...EvmNetworks.avax_mainnet,
      rpcUrl: process.env.VUE_APP_AVALANCHE_MAINNET_NODE || 'https://api.avax.network/ext/bc/C/rpc',
    },
  },

  near: {
    testnet: NearNetworks.near_testnet,
    mainnet: {
      ...NearNetworks.near_mainnet,
      rpcUrl: process.env.VUE_APP_NEAR_MAINNET_URL || NearNetworks.near_mainnet.rpcUrl,
    },
  },

  terra: {
    testnet: TerraNetworks.terra_testnet,
    mainnet: {
      ...TerraNetworks.terra_mainnet,
      rpcUrl: process.env.VUE_APP_TERRA_MAINNET_URL || TerraNetworks.terra_mainnet.rpcUrl,
    },
  },

  fuse: {
    testnet: {
      ...EvmNetworks.fuse_testnet,
      rpcUrl: 'https://rpc.fusespark.io',
    },
    mainnet: { ...EvmNetworks.fuse_mainnet, rpcUrl: 'https://rpc.fuse.io' },
  },
};
