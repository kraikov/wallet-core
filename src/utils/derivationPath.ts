import { ChainId } from '@liquality/cryptoassets';
import { ChainNetworks } from '../utils/networks';
import { BTC_ADDRESS_TYPE_TO_PREFIX } from '../utils/address';
import { BitcoinTypes } from '@liquality/bitcoin';
import { LEDGER_BITCOIN_OPTIONS } from '../utils/ledger';
import { AccountType, Network } from '../store/types';

const getBitcoinDerivationPath = (accountType, coinType, index) => {
  if (accountType.includes('ledger')) {
    const option = LEDGER_BITCOIN_OPTIONS.find((o) => o.name === accountType);
    if (!option) {
      throw new Error(`Option not found for account type ${accountType}`);
    }
    const { addressType } = option;
    return `${BTC_ADDRESS_TYPE_TO_PREFIX[addressType]}'/${coinType}'/${index}'`;
  } else {
    return `${BTC_ADDRESS_TYPE_TO_PREFIX[BitcoinTypes.AddressType.BECH32]}'/${coinType}'/${index}'`;
  }
};

const getEthereumBasedDerivationPath = (coinType: string, index: string) => `m/44'/${coinType}'/${index}'/0/0`;

const derivationPaths = {
  [ChainId.Bitcoin]: (network: Network, index: string, accountType = AccountType.Default) => {
    const bitcoinNetwork = ChainNetworks[ChainId.Bitcoin][network];
    return getBitcoinDerivationPath(accountType, bitcoinNetwork.coinType, index);
  },

  [ChainId.Ethereum]: (network: Network, index: string) => {
    const ethNetwork = ChainNetworks[ChainId.Ethereum][network];
    return getEthereumBasedDerivationPath(ethNetwork.coinType, index);
  },

  [ChainId.Rootstock]: (network: Network, index: string, accountType = AccountType.Default) => {
    let coinType;
    if (accountType === AccountType.RskLedger) {
      coinType = network === 'mainnet' ? '137' : '37310';
    } else {
      const rskNetwork = ChainNetworks[ChainId.Rootstock][network];
      coinType = rskNetwork.coinType;
    }

    return getEthereumBasedDerivationPath(coinType, index);
  },

  [ChainId.BinanceSmartChain]: (network: Network, index: string) => {
    const bscNetwork = ChainNetworks[ChainId.BinanceSmartChain][network];
    return getEthereumBasedDerivationPath(bscNetwork.coinType, index);
  },

  [ChainId.Polygon]: (network: Network, index: string) => {
    const polygonNetwork = ChainNetworks[ChainId.Polygon][network];
    return getEthereumBasedDerivationPath(polygonNetwork.coinType, index);
  },

  [ChainId.Arbitrum]: (network: Network, index: string) => {
    const arbitrumNetwork = ChainNetworks[ChainId.Arbitrum][network];
    return getEthereumBasedDerivationPath(arbitrumNetwork.coinType, index);
  },

  [ChainId.Avalanche]: (network: Network, index: string) => {
    const avalancheNetwork = ChainNetworks[ChainId.Avalanche][network];
    return getEthereumBasedDerivationPath(avalancheNetwork.coinType, index);
  },

  [ChainId.Fuse]: (network, index) => {
    const fuseNetwork = ChainNetworks[ChainId.Fuse][network];
    return getEthereumBasedDerivationPath(fuseNetwork.coinType, index);
  },

  [ChainId.Near]: (network: Network, index: string) => {
    const nearNetwork = ChainNetworks[ChainId.Near][network];
    return `m/44'/${nearNetwork.coinType}'/${index}'`;
  },

  [ChainId.Solana]: (network: Network, index: string) => {
    const solanaNetwork = ChainNetworks[ChainId.Solana][network];
    return `m/44'/501'/${solanaNetwork.walletIndex}'/${index}'`;
  },

  [ChainId.Terra]: (network: Network, index: string) => {
    const terraNetwork = ChainNetworks[ChainId.Terra][network];
    return `'m/44'/${terraNetwork.coinType}'/${index}'`;
  },
};

export const getDerivationPath = (
  chainId: ChainId,
  network: Network,
  index: string | number,
  accountType: AccountType
) => {
  return derivationPaths[chainId](network, index, accountType);
};
