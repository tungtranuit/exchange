import { hot } from 'react-hot-loader/root';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Header from '../../components/header';
import Footer from '../../components/footer';
import Exchange from '../exchange';
import ConnectToWallet from '../connect-to-wallet';
import Transactions from '../transactions';
import Markets from '../markets';
import AppDown from '../app-down';
// Disabled until the next trading comp
// import TradingComp from '../trading-comp';

import Overlay from '../../components/overlay';
import WalletSelectorPopup from '../../components/wallet-selector-popup';
import TransactionStatusPopup from '../../components/transaction-status-popup';
import TestnetPopup from '../../components/testnet-popup';
import DepotPopup from '../../components/depot-popup';
import FeedbackPopup from '../../components/feedback-popup';
import WalkthroughPopup from '../../components/walkthrough-popup';
import LoadingScreen from '../../components/loading-screen';
// import Announcement from './Announcement';

import {
  getCurrentScreen,
  getAvailableSynths,
  transactionStatusPopupIsVisible,
  depotPopupIsVisible,
  feedbackPopupIsVisible,
  testnetPopupIsVisible,
  loadingScreenIsVisible,
  walkthroughPopupIsVisible,
  walletSelectorPopupIsVisible,
} from '../../ducks/';
import {
  updateExchangeRates,
  setAvailableSynths,
  updateFrozenSynths,
} from '../../ducks/synths';
import { toggleLoadingScreen } from '../../ducks/ui';
import {
  connectToWallet,
  updateGasAndSpeedInfo,
  updateExchangeFeeRate,
} from '../../ducks/wallet';
// import { getEthereumNetwork } from '../../utils/metamaskTools';
import { getTronNetwork } from '../../utils/tronLinkTools';
import synthetixJsTools from '../../synthetixJsTool';
import { getGasAndSpeedInfo } from '../../utils/ethUtils';

import styles from './root.module.scss';

class Root extends Component {
  constructor() {
    super();
    this.state = {
      isOnMaintenance: false,
    };
    this.refreshData = this.refreshData.bind(this);
  }

  async updateRates() {
    const {
      availableSynths,
      updateExchangeRates,
      toggleLoadingScreen,
    } = this.props;
    if (!availableSynths) return;
    let formattedSynthRates = {};
    try {
      /*const [synthRates, ethRate] = await Promise.all([
        synthetixJsTools.synthetixJs.ExchangeRates.ratesForCurrencies(
          availableSynths.map(synth =>
            synthetixJsTools.getUtf8Bytes(synth.name)
          )
        ),
        synthetixJsTools.synthetixJs.Depot.usdToEthPrice(),
      ]);*/
      const synthRates = await synthetixJsTools.synthetixJs.ExchangeRates.ratesForCurrencies(
        availableSynths.map(synth => synthetixJsTools.getUtf8Bytes(synth.name))
      );
      let trxRate;
      synthRates.forEach((rate, i) => {
        formattedSynthRates[availableSynths[i].name] = Number(
          synthetixJsTools.synthetixJs.utils.formatEther(rate)
        );
        if (availableSynths[i].name == 'sTRX') {
          trxRate = rate;
        }
      });
      const formattedEthRate = synthetixJsTools.synthetixJs.utils.formatEther(
        trxRate
      );
      updateExchangeRates(formattedSynthRates, formattedEthRate);
      toggleLoadingScreen(false);
    } catch (e) {
      console.log(e);
    }
  }

  async updateGasAndSpeedPrices() {
    const { updateGasAndSpeedInfo } = this.props;
    const gasAndSpeedInfo = await getGasAndSpeedInfo();
    updateGasAndSpeedInfo(gasAndSpeedInfo);
  }

  async updateExchangeFeeRate() {
    const { updateExchangeFeeRate } = this.props;
    const { formatEther } = synthetixJsTools.synthetixJs.utils;
    try {
      const exchangeFeeRate = await synthetixJsTools.synthetixJs.FeePool.exchangeFeeRate();
      updateExchangeFeeRate(100 * Number(formatEther(exchangeFeeRate)));
    } catch (e) {
      console.log(e);
    }
  }

  async getFrozenSynths() {
    const { availableSynths, updateFrozenSynths } = this.props;
    if (!availableSynths) return;
    let frozenSynths = {};
    const inverseSynths = availableSynths
      .filter(synth => synth.name.charAt(0) === 'i')
      .map(synth => synth.name);
    const results = await Promise.all(
      inverseSynths.map(synth =>
        synthetixJsTools.synthetixJs.ExchangeRates.rateIsFrozen(
          synthetixJsTools.getUtf8Bytes(synth)
        )
      )
    );
    results.forEach((isFrozen, index) => {
      if (isFrozen) frozenSynths[inverseSynths[index]] = true;
    });
    updateFrozenSynths(frozenSynths);
  }

  async getAppState() {
    if (process.env.REACT_APP_CONTEXT !== 'production') return;
    try {
      const isOnMaintenance = await synthetixJsTools.synthetixJs.DappMaintenance.isPausedSX();
      this.setState({ isOnMaintenance });
    } catch (e) {
      console.log(e);
      this.setState({ isOnMaintenance: false });
    }
  }

  refreshData() {
    this.updateRates();
    this.getFrozenSynths();
    this.updateGasAndSpeedPrices();
    this.updateExchangeFeeRate();
    this.getAppState();
  }

  async componentDidMount() {
    const {
      toggleLoadingScreen,
      connectToWallet,
      setAvailableSynths,
      currentScreen,
    } = this.props;
    if (currentScreen === 'appDown') return;
    toggleLoadingScreen(true);
    setInterval(this.refreshData, 30 * 1000);
    // const { networkId } = await getEthereumNetwork();
    const { networkId } = await getTronNetwork();
    synthetixJsTools.setContractSettings({ networkId });
    // We remove all the synths which aren't considered as assets (eg: ODR)
    const allSynths = synthetixJsTools.synthetixJs.contractSettings.synths.filter(
      synth => synth.asset
    );
    /*
    const devSynths = [
      {
        name: 'sAUD',
        asset: 'AUD',
        category: 'forex',
        sign: '$',
        desc: 'Australian Dollars',
        aggregator: '',
      },
      {
        name: 'sUSD',
        asset: 'USD',
        category: 'forex',
        sign: '$',
        desc: 'US Dollars',
      },
    ];
    */
    /*
    TODO: @kev
    setAvailableSynths(allSynths);
    */
    // setAvailableSynths(devSynths);
    setAvailableSynths(allSynths);

    connectToWallet({
      networkId,
    });
    this.refreshData();
  }

  renderScreen() {
    const { currentScreen } = this.props;
    switch (currentScreen) {
      case 'exchange':
        return <Exchange />;
      case 'connectToWallet':
        return <ConnectToWallet />;
      case 'transactions':
        return <Transactions />;
      case 'markets':
        return <Markets />;
      // Disabled until the next trading comp
      // case 'tradingComp':
      //   return <TradingComp />;
      default:
        return <Exchange />;
    }
  }

  hasOpenPopup() {
    const {
      transactionStatusPopupIsVisible,
      depotPopupIsVisible,
      feedbackPopupIsVisible,
      testnetPopupIsVisible,
      loadingScreenIsVisible,
      walletSelectorPopupIsVisible,
      walkthroughPopupIsVisible,
    } = this.props;
    return (
      transactionStatusPopupIsVisible ||
      depotPopupIsVisible ||
      testnetPopupIsVisible ||
      loadingScreenIsVisible ||
      walletSelectorPopupIsVisible ||
      feedbackPopupIsVisible ||
      walkthroughPopupIsVisible
    );
  }
  render() {
    const {
      walletSelectorPopupIsVisible,
      transactionStatusPopupIsVisible,
      loadingScreenIsVisible,
      testnetPopupIsVisible,
      depotPopupIsVisible,
      feedbackPopupIsVisible,
      walkthroughPopupIsVisible,
    } = this.props;
    const { isOnMaintenance } = this.state;
    const overlayIsVisible = this.hasOpenPopup();
    return (
      <div className={styles.root}>
        {/*<Announcement />*/}
        <Overlay isVisible={overlayIsVisible} />
        {!isOnMaintenance ? (
          <div className={styles.rootInner}>
            <Header />
            <div className={styles.mainComponentWrapper}>
              {this.renderScreen()}
            </div>
            <Footer />
          </div>
        ) : (
          <AppDown />
        )}
        <WalletSelectorPopup isVisible={walletSelectorPopupIsVisible} />
        <TransactionStatusPopup isVisible={transactionStatusPopupIsVisible} />
        <TestnetPopup isVisible={testnetPopupIsVisible} />
        <DepotPopup isVisible={depotPopupIsVisible} />
        <FeedbackPopup isVisible={feedbackPopupIsVisible} />
        <LoadingScreen isVisible={loadingScreenIsVisible} />
        {walkthroughPopupIsVisible ? (
          <WalkthroughPopup isVisible={walkthroughPopupIsVisible} />
        ) : null}
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    currentScreen: getCurrentScreen(state),
    availableSynths: getAvailableSynths(state),
    transactionStatusPopupIsVisible: transactionStatusPopupIsVisible(state),
    depotPopupIsVisible: depotPopupIsVisible(state),
    feedbackPopupIsVisible: feedbackPopupIsVisible(state),
    testnetPopupIsVisible: testnetPopupIsVisible(state),
    loadingScreenIsVisible: loadingScreenIsVisible(state),
    walletSelectorPopupIsVisible: walletSelectorPopupIsVisible(state),
    walkthroughPopupIsVisible: walkthroughPopupIsVisible(state),
  };
};

const mapDispatchToProps = {
  updateExchangeRates,
  setAvailableSynths,
  toggleLoadingScreen,
  connectToWallet,
  updateGasAndSpeedInfo,
  updateFrozenSynths,
  updateExchangeFeeRate,
};

Root.propTypes = {
  updateExchangeRates: PropTypes.func.isRequired,
  setAvailableSynths: PropTypes.func.isRequired,
  currentScreen: PropTypes.string.isRequired,
  availableSynths: PropTypes.array.isRequired,
  toggleLoadingScreen: PropTypes.func.isRequired,
  connectToWallet: PropTypes.func.isRequired,
  updateGasAndSpeedInfo: PropTypes.func.isRequired,
  transactionStatusPopupIsVisible: PropTypes.bool.isRequired,
  depotPopupIsVisible: PropTypes.bool.isRequired,
  feedbackPopupIsVisible: PropTypes.bool.isRequired,
  testnetPopupIsVisible: PropTypes.bool.isRequired,
  walkthroughPopupIsVisible: PropTypes.bool.isRequired,
  loadingScreenIsVisible: PropTypes.bool.isRequired,
  walletSelectorPopupIsVisible: PropTypes.bool.isRequired,
  updateFrozenSynths: PropTypes.func.isRequired,
  updateExchangeFeeRate: PropTypes.func.isRequired,
};

export default hot(connect(mapStateToProps, mapDispatchToProps)(Root));
