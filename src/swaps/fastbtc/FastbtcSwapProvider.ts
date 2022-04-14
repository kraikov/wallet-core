import { io } from 'socket.io-client';
import BN from 'bignumber.js';
import { mapValues } from 'lodash';
import { QuoteRequest, SwapProvider } from '../SwapProvider';
import { v4 as uuidv4 } from 'uuid';
import { chains, currencyToUnit, unitToCurrency } from '@liquality/cryptoassets';
import { withInterval } from '../../store/actions/performNextAction/utils';
import { prettyBalance } from '../../utils/coinFormatter';
import cryptoassets from '../../utils/cryptoassets';
import { Client } from '@liquality/client';
import { BitcoinBaseWalletProvider, BitcoinEsploraApiProvider } from '@liquality/bitcoin';

const fastBtcSatoshiFee = 5000;
const fastBtcPercentageFee = 0.2;

class FastbtcSwapProvider extends SwapProvider {
  socketConnection: any;
  constructor(config) {
    super(config);
    this.socketConnection = io(this.config.bridgeEndpoint, {
      reconnectionDelayMax: 10000,
    });

    this.socketConnection.on('connect', function () {
      console.log('FatBtc socket connected');
    });

    this.socketConnection.on('disconnect', function () {
      console.log('FastBtc socket disconnected');
    });
  }

  async getSupportedPairs() {
    const validAmountRange = await this._getTxAmount();
    return [
      {
        from: 'BTC',
        to: 'RBTC',
        rate: 0.998,
        max: currencyToUnit(cryptoassets.BTC, new BN(validAmountRange.max)).toFixed(),
        min: currencyToUnit(cryptoassets.BTC, new BN(validAmountRange.min)).toFixed(),
      },
    ];
  }

  // TODO: return type
  async _getHistory(web3Addr): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.socketConnection.emit('getDepositHistory', web3Addr, (res) => {
        if (res && res.error) {
          reject(res.err);
        }
        resolve(res);
      });
    });
  }

  // TODO: type
  async _getAddress(web3Addr): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socketConnection.emit('getDepositAddress', web3Addr, (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
  }

  // TODO: type
  async _getTxAmount(): Promise<any> {
    return new Promise((resolve) => {
      this.socketConnection.emit('txAmount', (res) => {
        resolve(res);
      });
    });
  }

  // @ts-ignore
  async getQuote({ from, to, amount }: QuoteRequest) {
    if (from !== 'BTC' || to !== 'RBTC') return null;
    const fromAmountInUnit = new BN(currencyToUnit(cryptoassets[from], new BN(amount)));
    const validAmountRange = await this._getTxAmount();
    const isQuoteAmountInTheRange = amount <= validAmountRange.max && amount >= validAmountRange.min;
    if (!isQuoteAmountInTheRange) return null;
    const toAmountInUnit = new BN(
      currencyToUnit(cryptoassets[to], new BN(amount).minus(unitToCurrency(cryptoassets[from], fastBtcSatoshiFee)))
    ).times(1 - fastBtcPercentageFee / 100);
    return {
      from,
      to,
      // TODO: Amounts should be in BigNumber to prevent loss of precision
      fromAmount: fromAmountInUnit.toNumber(),
      toAmount: toAmountInUnit.toNumber(),
    };
  }

  async sendSwap({ network, walletId, quote }) {
    if (quote.from !== 'BTC' || quote.to !== 'RBTC') return null;
    const toChain = cryptoassets[quote.to].chain;
    const client = this.getClient(network, walletId, quote.from, quote.fromAccountId);
    const toAddressRaw = await this.getSwapAddress(network, walletId, quote.to, quote.toAccountId);
    const toAddress = chains[toChain].formatAddress(toAddressRaw, network);
    const relayAddress = await this._getAddress(toAddress);

    await this.sendLedgerNotification(quote.fromAccountId, 'Signing required to complete the swap.');
    const swapTx = await client.wallet.sendTransaction({
      to: relayAddress.btcadr,
      value: new BN(quote.fromAmount),
      data: '',
      fee: quote.fee,
    });
    return {
      status: 'WAITING_FOR_SEND_CONFIRMATIONS',
      swapTx,
      swapTxHash: swapTx.hash,
    };
  }

  async newSwap({ network, walletId, quote }) {
    const updates = await this.sendSwap({ network, walletId, quote });

    return {
      id: uuidv4(),
      fee: quote.fee,
      slippage: 50,
      ...updates,
    };
  }

  async estimateFees({ network, walletId, asset, txType, quote, feePrices, max }) {
    if (txType === FastbtcSwapProvider.txTypes.SWAP && asset === 'BTC') {
      const client = this.getClient(network, walletId, asset, quote.fromAccountId) as Client<
        BitcoinEsploraApiProvider,
        BitcoinBaseWalletProvider
      >;
      const value = max ? undefined : new BN(quote.fromAmount);
      const txs = feePrices.map((fee) => ({ to: '', value, fee }));
      const totalFees = await client.wallet.getTotalFees(txs, max);
      return mapValues(totalFees, (f) => unitToCurrency(cryptoassets[asset], f));
    }
    return null;
  }

  async waitForSendConfirmations({ swap, network, walletId }) {
    const client = this.getClient(network, walletId, swap.from, swap.fromAccountId);

    try {
      const tx = await client.chain.getTransactionByHash(swap.swapTxHash);
      if (tx && tx.confirmations && tx.confirmations > 0) {
        return {
          endTime: Date.now(),
          status: 'WAITING_FOR_RECEIVE',
        };
      }
    } catch (e) {
      if (e.name === 'TxNotFoundError') console.warn(e);
      else throw e;
    }
  }

  async waitForReceive({ swap, network, walletId }) {
    try {
      const toChain = cryptoassets[swap.to].chain;
      const toAddressRaw = await this.getSwapAddress(network, walletId, swap.to, swap.toAccountId);
      const toAddress = chains[toChain].formatAddress(toAddressRaw, network);
      const addressHistory = (await this._getHistory(toAddress)).sort((a, b) =>
        new Date(a.dateAdded).getTime() > new Date(b.dateAdded).getTime() ? 1 : -1
      );
      let isDepositConfirmed = false;
      let isReceiveConfirmed = false;
      let depositConfirmationDate = 0;
      let depositAmount = 0;
      for (const transaction of addressHistory) {
        if (
          transaction.txHash === swap.swapTxHash &&
          transaction.status === 'confirmed' &&
          transaction.type === 'deposit'
        ) {
          isDepositConfirmed = true;
          depositConfirmationDate = new Date(transaction.dateAdded).getTime();
          depositAmount = transaction.valueBtc;
        } else if (
          isDepositConfirmed &&
          transaction.status === 'confirmed' &&
          transaction.type === 'transfer' &&
          transaction.valueBtc === depositAmount &&
          new Date(transaction.dateAdded).getTime() - depositConfirmationDate > 0 &&
          new Date(transaction.dateAdded).getTime() - depositConfirmationDate < 86400000
        ) {
          isReceiveConfirmed = true;
        }
      }
      if (isDepositConfirmed && isReceiveConfirmed) {
        return {
          endTime: Date.now(),
          status: 'SUCCESS',
        };
      }
    } catch (e) {
      console.log(e);
    }
  }

  async performNextSwapAction(_store, { network, walletId, swap }) {
    let updates;

    switch (swap.status) {
      case 'WAITING_FOR_SEND_CONFIRMATIONS':
        updates = await withInterval(async () => this.waitForSendConfirmations({ swap, network, walletId }));
        break;
      case 'WAITING_FOR_RECEIVE':
        updates = await withInterval(async () => this.waitForReceive({ swap, network, walletId }));
        break;
    }

    return updates;
  }

  static txTypes = {
    SWAP: 'SWAP',
  };

  static statuses = {
    WAITING_FOR_SEND_CONFIRMATIONS: {
      step: 0,
      label: 'Swapping {from}',
      filterStatus: 'PENDING',
      notification() {
        return {
          message: 'Swap initiated',
        };
      },
    },
    WAITING_FOR_RECEIVE: {
      step: 1,
      label: 'Swapping {from}',
      filterStatus: 'PENDING',
    },
    SUCCESS: {
      step: 2,
      label: 'Completed',
      filterStatus: 'COMPLETED',
      notification(swap) {
        return {
          message: `Swap completed, ${prettyBalance(swap.toAmount, swap.to)} ${swap.to} ready to use`,
        };
      },
    },
    FAILED: {
      step: 2,
      label: 'Swap Failed',
      filterStatus: 'REFUNDED',
      notification() {
        return {
          message: 'Swap failed',
        };
      },
    },
  };

  static fromTxType = FastbtcSwapProvider.txTypes.SWAP;
  static toTxType = null;

  static timelineDiagramSteps = ['SWAP'];

  static totalSteps = 3;
}

export { FastbtcSwapProvider };
