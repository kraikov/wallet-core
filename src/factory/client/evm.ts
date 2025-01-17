import { EIP1559FeeProvider, RpcFeeProvider } from '@chainify/evm';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { AccountType, Network, NftProviderType } from '../../store/types';
import { HTLC_CONTRACT_ADDRESS } from '../../utils/chainify';
import { ChainNetworks } from '../../utils/networks';
import { createEVMClient } from './clients';

const defaultSwapOptions = {
  contractAddress: HTLC_CONTRACT_ADDRESS,
};

export function createEthClient(network: Network, mnemonic: string, accountType: AccountType, derivationPath: string) {
  const ethNetwork = ChainNetworks.ethereum[network];
  const provider = new StaticJsonRpcProvider(ethNetwork.rpcUrl, ethNetwork.chainId);
  const feeProvider = new EIP1559FeeProvider(provider);
  const nftProviderType = network === Network.Mainnet ? NftProviderType.OpenSea : NftProviderType.Moralis;
  return createEVMClient(
    ethNetwork,
    feeProvider,
    mnemonic,
    accountType,
    derivationPath,
    defaultSwapOptions,
    provider,
    nftProviderType
  );
}

export function createRskClient(network: Network, mnemonic: string, accountType: AccountType, derivationPath: string) {
  const rskNetwork = ChainNetworks.rsk[network];
  const provider = new StaticJsonRpcProvider(rskNetwork.rpcUrl, rskNetwork.chainId);
  const feeProvider = new RpcFeeProvider(provider, { slowMultiplier: 1, averageMultiplier: 1, fastMultiplier: 1.25 });
  const swapOptions = { ...defaultSwapOptions, gasLimitMargin: 3000 /* 30% */ };
  return createEVMClient(rskNetwork, feeProvider, mnemonic, accountType, derivationPath, swapOptions, provider);
}

export function createBSCClient(network: Network, mnemonic: string, derivationPath: string) {
  const bscNetwork = ChainNetworks.bsc[network];
  const provider = new StaticJsonRpcProvider(bscNetwork.rpcUrl, bscNetwork.chainId);
  const feeProvider = new RpcFeeProvider(provider, { slowMultiplier: 1, averageMultiplier: 2, fastMultiplier: 2.2 });
  return createEVMClient(
    bscNetwork,
    feeProvider,
    mnemonic,
    AccountType.Default,
    derivationPath,
    defaultSwapOptions,
    provider,
    NftProviderType.Moralis
  );
}

export function createPolygonClient(network: Network, mnemonic: string, derivationPath: string) {
  const polygonNetwork = ChainNetworks.polygon[network];
  const provider = new StaticJsonRpcProvider(polygonNetwork.rpcUrl, polygonNetwork.chainId);
  const feeProvider = new EIP1559FeeProvider(provider);

  return createEVMClient(
    polygonNetwork,
    feeProvider,
    mnemonic,
    AccountType.Default,
    derivationPath,
    defaultSwapOptions,
    provider,
    NftProviderType.Moralis
  );
}

export function createArbitrumClient(network: Network, mnemonic: string, derivationPath: string) {
  const arbitrumNetwork = ChainNetworks.arbitrum[network];
  const provider = new StaticJsonRpcProvider(arbitrumNetwork.rpcUrl, arbitrumNetwork.chainId);
  const feeProvider = new RpcFeeProvider(provider, { slowMultiplier: 1, averageMultiplier: 1, fastMultiplier: 1.25 });
  return createEVMClient(
    arbitrumNetwork,
    feeProvider,
    mnemonic,
    AccountType.Default,
    derivationPath,
    defaultSwapOptions,
    provider,
    NftProviderType.Covalent
  );
}

export function createAvalancheClient(network: Network, mnemonic: string, derivationPath: string) {
  const avalancheNetwork = ChainNetworks.avalanche[network];
  const provider = new StaticJsonRpcProvider(avalancheNetwork.rpcUrl, avalancheNetwork.chainId);
  const feeProvider = new EIP1559FeeProvider(provider);

  return createEVMClient(
    avalancheNetwork,
    feeProvider,
    mnemonic,
    AccountType.Default,
    derivationPath,
    defaultSwapOptions,
    provider,
    NftProviderType.Moralis
  );
}

export function createFuseClient(network: Network, mnemonic: string, derivationPath: string) {
  const fuseNetwork = ChainNetworks.fuse[network];
  const provider = new StaticJsonRpcProvider(fuseNetwork.rpcUrl, fuseNetwork.chainId);
  const feeProvider = new RpcFeeProvider(provider, { slowMultiplier: 1, averageMultiplier: 1, fastMultiplier: 1.25 });
  return createEVMClient(
    fuseNetwork,
    feeProvider,
    mnemonic,
    AccountType.Default,
    derivationPath,
    defaultSwapOptions,
    provider
  );
}
