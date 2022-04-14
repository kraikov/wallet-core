import { Client, Fee } from '@liquality/client';
import { Network as ChainifyNetwork } from '@liquality/types';

import {
  BitcoinEsploraBatchBaseProvider,
  BitcoinFeeApiProvider,
  BitcoinHDWalletProvider,
  BitcoinSwapEsploraProvider,
} from '@liquality/bitcoin';
import {
  EIP1559FeeProvider,
  EvmChainProvider,
  EvmSwapProvider,
  EvmWalletProvider,
  RpcFeeProvider,
} from '@liquality/evm';
import { NearChainProvider, NearWalletProvider, NearSwapProvider, NearTypes } from '@liquality/near';
import { TerraChainProvider, TerraWalletProvider, TerraSwapProvider, TerraTypes } from '@liquality/terra';

import { ChainId } from '@liquality/cryptoassets';
import cryptoassets from '../../utils/cryptoassets';
import buildConfig from '../../build.config';
import { ChainNetworks } from '../../utils/networks';
import { LEDGER_BITCOIN_OPTIONS } from '../../utils/ledger';
import { walletOptionsStore } from '../../walletOptions';
import { AccountType, Network } from '../types';

function createBtcClient(network: Network, mnemonic: string, accountType: AccountType, baseDerivationPath: string) {
  const isTestnet = network === 'testnet';
  const bitcoinNetwork = ChainNetworks.bitcoin[network];
  const esploraApi = buildConfig.exploraApis[network];
  const batchEsploraApi = buildConfig.batchEsploraApis[network];

  const feeProvider = new BitcoinFeeApiProvider('https://liquality.io/swap/mempool/v1/fees/recommended');
  const chainProvider = new BitcoinEsploraBatchBaseProvider(
    {
      batchUrl: batchEsploraApi,
      url: esploraApi,
      network: bitcoinNetwork,
      numberOfBlockConfirmation: 2,
    },
    feeProvider
  );
  const swapProvider = new BitcoinSwapEsploraProvider({
    network: bitcoinNetwork,
    scraperUrl: esploraApi,
  });

  // TODO: make sure Ledger works
  if (accountType.includes('bitcoin_ledger')) {
    const option = LEDGER_BITCOIN_OPTIONS.find((o) => o.name === accountType);
    if (!option) {
      throw new Error(`Account type ${accountType} not an option`);
    }
    const { addressType } = option;
    if (!walletOptionsStore.walletOptions.createBitcoinLedgerProvider) {
      throw new Error('Wallet Options: createBitcoinLedgerProvider is not defined - unable to build ledger client');
    }
    const ledgerProvider = walletOptionsStore.walletOptions.createBitcoinLedgerProvider(
      network,
      bitcoinNetwork,
      addressType,
      baseDerivationPath
    );
    swapProvider.setWallet(ledgerProvider);
  } else {
    const walletOptions = {
      network: bitcoinNetwork,
      baseDerivationPath,
      mnemonic,
    };
    const walletProvider = new BitcoinHDWalletProvider(walletOptions, chainProvider);
    swapProvider.setWallet(walletProvider);
  }

  if (isTestnet) {
    chainProvider.setFeeProvider(null as any);
  }

  return new Client().connect(swapProvider);
}

function createEVMClient(
  asset: string,
  networkType: Network,
  network: ChainifyNetwork,
  feeProvider: Fee,
  mnemonic: string,
  accountType: AccountType,
  derivationPath: string
) {
  const chainProvider = new EvmChainProvider(network, undefined, feeProvider, false);
  const swapProvider = new EvmSwapProvider({ contractAddress: '0x133713376F69C1A67d7f3594583349DFB53d8166' });

  if (accountType === AccountType.EthereumLedger || accountType === AccountType.RskLedger) {
    const assetData = cryptoassets[asset];
    const chainId = assetData.chain || ChainId.Ethereum;

    if (!walletOptionsStore.walletOptions.createEthereumLedgerProvider) {
      throw new Error('Wallet Options: createEthereumLedgerProvider is not defined - unable to build ledger client');
    }

    // TODO: how to create ledger wallet?
    const ledgerProvider = walletOptionsStore.walletOptions.createEthereumLedgerProvider(
      networkType,
      network,
      chainId,
      derivationPath
    );
    swapProvider.setWallet(ledgerProvider);
  } else {
    const walletOptions = { derivationPath, mnemonic };
    const walletProvider = new EvmWalletProvider(walletOptions, chainProvider);
    swapProvider.setWallet(walletProvider);
  }

  return new Client().connect(swapProvider);
}

function createNearClient(network: Network, mnemonic: string, derivationPath: string) {
  const nearNetwork = ChainNetworks.near[network] as NearTypes.NearNetwork;
  const walletOptions = { mnemonic, derivationPath, helperUrl: nearNetwork.helperUrl };
  const chainProvider = new NearChainProvider(nearNetwork);
  const walletProvider = new NearWalletProvider(walletOptions, chainProvider);
  const swapProvider = new NearSwapProvider(nearNetwork.helperUrl, walletProvider);
  return new Client().connect(swapProvider);
}

function createEthClient(
  asset: string,
  network: Network,
  mnemonic: string,
  accountType: AccountType,
  derivationPath: string
) {
  const ethNetwork = ChainNetworks.ethereum[network];
  const feeProvider = new EIP1559FeeProvider(ethNetwork.rpcUrl as string);
  return createEVMClient(asset, network, ethNetwork, feeProvider, mnemonic, accountType, derivationPath);
}

function createRskClient(
  asset: string,
  network: Network,
  mnemonic: string,
  accountType: AccountType,
  derivationPath: string
) {
  const rskNetwork = ChainNetworks.rsk[network];

  const feeProvider = new RpcFeeProvider(rskNetwork.rpcUrl as string, {
    slowMultiplier: 1,
    averageMultiplier: 1,
    fastMultiplier: 1.25,
  });

  return createEVMClient(asset, network, rskNetwork, feeProvider, mnemonic, accountType, derivationPath);
}

function createBSCClient(asset: string, network: Network, mnemonic: string, derivationPath: string) {
  const bscNetwork = ChainNetworks.bsc[network];

  const feeProvider = new RpcFeeProvider(bscNetwork.rpcUrl as string, {
    slowMultiplier: 1,
    averageMultiplier: 2,
    fastMultiplier: 2.2,
  });

  return createEVMClient(asset, network, bscNetwork, feeProvider, mnemonic, AccountType.Default, derivationPath);
}

function createPolygonClient(asset: string, network: Network, mnemonic: string, derivationPath: string) {
  const polygonNetwork = ChainNetworks.polygon[network];

  const feeProvider =
    network === Network.Testnet
      ? new EIP1559FeeProvider(polygonNetwork.rpcUrl as string)
      : new RpcFeeProvider(polygonNetwork.rpcUrl as string, {
          slowMultiplier: 1,
          averageMultiplier: 2,
          fastMultiplier: 2.2,
        });

  return createEVMClient(asset, network, polygonNetwork, feeProvider, mnemonic, AccountType.Default, derivationPath);
}

function createArbitrumClient(asset: string, network: Network, mnemonic: string, derivationPath: string) {
  const arbitrumNetwork = ChainNetworks.arbitrum[network];

  const feeProvider = new RpcFeeProvider(arbitrumNetwork.rpcUrl as string, {
    slowMultiplier: 1,
    averageMultiplier: 1,
    fastMultiplier: 1.25,
  });

  return createEVMClient(asset, network, arbitrumNetwork, feeProvider, mnemonic, AccountType.Default, derivationPath);
}

function createFuseClient(asset: string, network: Network, mnemonic: string, derivationPath: string) {
  const fuseNetwork = ChainNetworks.fuse[network];

  const feeProvider = new RpcFeeProvider(fuseNetwork.rpcUrl as string, {
    slowMultiplier: 1,
    averageMultiplier: 1,
    fastMultiplier: 1.25,
  });

  return createEVMClient(asset, network, fuseNetwork, feeProvider, mnemonic, AccountType.Default, derivationPath);
}

function createAvalancheClient(asset: string, network: Network, mnemonic: string, derivationPath: string) {
  const avalancheNetwork = ChainNetworks.avalanche[network];

  const feeProvider = new RpcFeeProvider(avalancheNetwork.rpcUrl as string, {
    slowMultiplier: 1,
    averageMultiplier: 2,
    fastMultiplier: 2.2,
  });

  return createEVMClient(asset, network, avalancheNetwork, feeProvider, mnemonic, AccountType.Default, derivationPath);
}

function createTerraClient(network: Network, mnemonic: string, derivationPath: string) {
  const terraNetwork = ChainNetworks.terra[network] as TerraTypes.TerraNetwork;
  const { helperUrl } = terraNetwork;
  const walletOptions = { mnemonic, derivationPath, helperUrl };
  const chainProvider = new TerraChainProvider(terraNetwork);
  const walletProvider = new TerraWalletProvider(walletOptions, chainProvider);
  const swapProvider = new TerraSwapProvider(helperUrl, walletProvider);
  return new Client().connect(swapProvider);
}

export const createClient = (
  asset,
  network: Network,
  mnemonic: string,
  accountType: AccountType,
  derivationPath: string
) => {
  const assetData = cryptoassets[asset];

  switch (assetData.chain) {
    case ChainId.Bitcoin:
      return createBtcClient(network, mnemonic, accountType, derivationPath);
    case ChainId.Rootstock:
      return createRskClient(asset, network, mnemonic, accountType, derivationPath);
    case ChainId.BinanceSmartChain:
      return createBSCClient(asset, network, mnemonic, derivationPath);
    case ChainId.Polygon:
      return createPolygonClient(asset, network, mnemonic, derivationPath);
    case ChainId.Arbitrum:
      return createArbitrumClient(asset, network, mnemonic, derivationPath);
    case ChainId.Avalanche:
      return createAvalancheClient(asset, network, mnemonic, derivationPath);
    case ChainId.Fuse:
      return createFuseClient(asset, network, mnemonic, derivationPath);
    case ChainId.Near:
      return createNearClient(network, mnemonic, derivationPath);
    case ChainId.Terra:
      return createTerraClient(network, mnemonic, derivationPath);
    default:
      return createEthClient(asset, network, mnemonic, accountType, derivationPath);
  }
};
