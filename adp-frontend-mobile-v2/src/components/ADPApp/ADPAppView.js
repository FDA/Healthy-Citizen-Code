import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  // BackAndroid, // depricated
  BackHandler,
  ToastAndroid,
  Dimensions,
  AppState
} from 'react-native';
import {
  StyleProvider
} from 'native-base';
import DrawerLayout from 'react-native-drawer-layout';
import {addNavigationHelpers} from 'react-navigation';
import SplashScreen from 'react-native-splash-screen';
import Menu from '../../containers/MenuContainer';
import {getRoutes, getNavigationOptions} from '../../routes';
import getStyle from '../../themes/adp/components';
import styles from './ADPAppViewStyles';
import WS from 'react-native-websocket';
import GlobalConfig from 'react-native-config';

class ADPApp extends Component {
  constructor() {
    super();

    this.state = {
      appState: 1,
      loaded: false
    };

    this.exitTimer = 0;

    this._onLayout = this._onLayout.bind(this);
    this.clearExitTimer = this.clearExitTimer.bind(this);
    this.checkExit = this.checkExit.bind(this);
    this.goBack = this.goBack.bind(this);
    this.openMenu = this.openMenu.bind(this);
    this.closeMenu = this.closeMenu.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
  }

  componentDidMount() {
    const {changeOrientation} = this.props;

    SplashScreen.hide();

    changeOrientation(Dimensions.get('window'));

    this.setState({
      loaded: true
    });

    BackHandler.addEventListener('hardwareBackPress', this.goBack);
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.goBack);
  }

  _onLayout(event) {
    const {changeOrientation} = this.props;

    changeOrientation(event.nativeEvent.layout);
  }

  clearExitTimer() {
    clearTimeout(this.exitTimer);
    this.exitTimer = 0;
  }

  checkExit() {
    if (this.exitTimer) {
      this.clearExitTimer();

      return false;
    } else {
      ToastAndroid.show('Press Back again to Exit', ToastAndroid.SHORT);

      this.exitTimer = setTimeout(() => {
        this.clearExitTimer();
      }, 2000);

      return true;
    }
  }

  goBack() {
    const {goBack, navigation} = this.props;

    if (navigation.index > 0) {
      goBack();

      return true;
    }

    return this.checkExit();
  }

  openMenu() {
    const {drawer} = this.refs;

    drawer.openDrawer();
  }

  closeMenu() {
    const {drawer} = this.refs;

    drawer.closeDrawer();
  }

  toggleMenu() {
    const {drawer} = this.refs;
    const {drawerShown} = drawer.state;

    !drawerShown ? this.openMenu() : this.closeMenu();
  }

  render() {
    const {loaded} = this.state;
    const {navigation, dispatch} = this.props;

    if (!loaded) {
      return null;
    }

    const Routes = getRoutes();

    const menu =
      <Menu
        closeMenu={() => this.closeMenu()}
      />;

    // console.log("Websocket");
    // console.log(GlobalConfig.WSS_URL);

    // TODO: on WebSocketEvent schedule reconnects in 1 min and then reload
    /*
     <WS
     ref={ref => {this.ws = ref}}
     url={GlobalConfig.WSS_URL}
     onOpen={() => {
     console.log('Open!')
     this.ws.send('Hello')
     }}
     onMessage={console.log}
     onError={console.log}
     onClose={console.log}
     reconnect // Will try to reconnect onClose
     />
     */

    return (
      <DrawerLayout
        keyboardDismissMode='on-drag'
        renderNavigationView={() => menu}
        drawerWidth={260}
        drawerLockMode='locked-closed'
        ref='drawer'
      >
        <View
          style={styles.container}
          onLayout={(event) => this._onLayout(event)}
        >
          <StyleProvider style={getStyle()}>
            <Routes
              navigation={addNavigationHelpers({
                dispatch: dispatch,
                state: navigation,
                showMenuButton: true,
                toggleMenu: () => this.toggleMenu()
              })}
              screenProps={{
                showMenuButton: true,
                toggleMenu: () => this.toggleMenu()
              }}
            />
          </StyleProvider>
        </View>
      </DrawerLayout>
    )
  }
}

ADPApp.propTypes = {
  goBack: PropTypes.func,
  lockApp: PropTypes.func,
  changeOrientation: PropTypes.func,
  dispatch: PropTypes.func,
  navigation: PropTypes.object,
  isLocked: PropTypes.bool
};

export default ADPApp;
