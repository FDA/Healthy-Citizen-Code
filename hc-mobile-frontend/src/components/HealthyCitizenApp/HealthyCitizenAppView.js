import React, {Component, PropTypes} from 'react';
import {
    View,
    BackAndroid,
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
import {getRoutes} from '../../routes';
import getStyle from '../../themes/healthy-citizen/components';
import styles from './HealthyCitizenAppViewStyles';
import WS from 'react-native-websocket';
import GlobalConfig from 'react-native-config';

class HealthyCitizenApp extends Component {
    constructor() {
        super();

        this.state = {
            appState: 1,
            loaded: false
        };

        this.exitTimer = 0;

        this._onLayout = this._onLayout.bind(this);
        this._handleAppStateChange = this._handleAppStateChange.bind(this);
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

        BackAndroid.addEventListener('hardwareBackPress', this.goBack);
        AppState.addEventListener('change', this._handleAppStateChange);
    }

    componentWillUnmount() {
        BackAndroid.removeEventListener('hardwareBackPress', this.goBack);
        AppState.removeEventListener('change', this._handleAppStateChange);
    }

    _onLayout(event) {
        const {changeOrientation} = this.props;

        changeOrientation(event.nativeEvent.layout);
    }

    _handleAppStateChange(nextAppState) {
        const {appState} = this.state;
        const {lockApp, navigation} = this.props;

        const currentAppState = !!nextAppState.match(/inactive|background/);

        if (appState !== currentAppState) {
            if (!currentAppState) {
                lockApp(navigation);
            }

            this.setState({
                appState: currentAppState
            });
        }
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
        const {navigation, dispatch, isLocked} = this.props;

        if (!loaded) {
            return null;
        }

        const Routes = getRoutes();

        const menu =
            <Menu
                closeMenu={() => this.closeMenu()}
            />;

        console.log( "Websocket" );
        console.log(GlobalConfig.WSS_URL);

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
                                showMenuButton: true, //!navigation.index,
                                toggleMenu: () => this.toggleMenu()
                              })}
                        />
                    </StyleProvider>
                </View>
            </DrawerLayout>
        )
    }
}

HealthyCitizenApp.propTypes = {
    goBack: PropTypes.func,
    lockApp: PropTypes.func,
    changeOrientation: PropTypes.func,
    dispatch: PropTypes.func,
    navigation: PropTypes.object,
    isLocked: PropTypes.bool
};

export default HealthyCitizenApp;
