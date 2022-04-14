// @ts-nocheck
import EventEmitter from 'events';
import { random, findKey, mapKeys, mapValues } from 'lodash';
import axios from 'axios';
import cryptoassets from '../utils/cryptoassets';
import { EvmChainProvider, EvmWalletProvider } from '@liquality/evm';
import { ChainNetworks } from '../utils/networks';
import { ChainId } from '@liquality/cryptoassets';

export const CHAIN_LOCK = {};

export const emitter = new EventEmitter();

const wait = (millis) => new Promise((resolve) => setTimeout(() => resolve(), millis));

export { wait };

export const waitForRandom = (min, max) => wait(random(min, max));

export const timestamp = () => Date.now();

export const attemptToLockAsset = (network, walletId, asset) => {
  const chain = cryptoassets[asset].chain;
  const key = [network, walletId, chain].join('-');

  if (CHAIN_LOCK[key]) {
    return {
      key,
      success: false,
    };
  }

  CHAIN_LOCK[key] = true;

  return {
    key,
    success: true,
  };
};

export const unlockAsset = (key) => {
  CHAIN_LOCK[key] = false;

  emitter.emit(`unlock:${key}`);
};

const COIN_GECKO_API = 'https://api.coingecko.com/api/v3';

const getRskERC20Assets = () => {
  const erc20 = Object.keys(cryptoassets).filter(
    (asset) => cryptoassets[asset].chain === ChainId.Rootstock && cryptoassets[asset].type === 'erc20'
  );

  return erc20.map((erc) => cryptoassets[erc]);
};

export const shouldApplyRskLegacyDerivation = async (accounts, mnemonic?, indexPath = 0) => {
  const rskERC20Assets = getRskERC20Assets().map((asset) => {
    return { ...asset, isNative: asset.type === 'native' };
  });
  const walletIds = Object.keys(accounts);

  const addresses = [];

  walletIds.forEach((wallet) => {
    const walletAccounts = accounts[wallet].mainnet;

    walletAccounts.forEach((account) => {
      if (account.chain === 'rsk') {
        addresses.push(...account.addresses);
      }
    });
  });

  if (mnemonic) {
    const walletProvider = new EvmWalletProvider({
      network: ChainNetworks.rsk.mainnet,
      mnemonic,
      derivationPath: `m/44'/137'/${indexPath}'/0/0`,
    });

    const _addresses = await walletProvider.getAddresses();
    addresses.push(..._addresses.map((e) => e.address));
  }

  const chainProvider = new EvmChainProvider(ChainNetworks.rsk.mainnet);
  const balances = await chainProvider.getBalance(addresses, rskERC20Assets);

  return balances.some((amount) => amount.isGreaterThan(0));
};

export async function getPrices(baseCurrencies, toCurrency) {
  const coindIds = baseCurrencies
    .filter((currency) => cryptoassets[currency]?.coinGeckoId)
    .map((currency) => cryptoassets[currency].coinGeckoId);
  const { data } = await axios.get(
    `${COIN_GECKO_API}/simple/price?ids=${coindIds.join(',')}&vs_currencies=${toCurrency}`
  );
  let prices = mapKeys(data, (v, coinGeckoId) => findKey(cryptoassets, (asset) => asset.coinGeckoId === coinGeckoId));
  prices = mapValues(prices, (rates) => mapKeys(rates, (v, k) => k.toUpperCase()));

  for (const baseCurrency of baseCurrencies) {
    if (!prices[baseCurrency] && cryptoassets[baseCurrency]?.matchingAsset) {
      prices[baseCurrency] = prices[cryptoassets[baseCurrency]?.matchingAsset];
    }
  }
  const symbolPrices = mapValues(prices, (rates) => rates[toCurrency.toUpperCase()]);
  return symbolPrices;
}
