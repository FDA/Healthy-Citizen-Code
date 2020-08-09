import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {NavigationActions} from 'react-navigation';
import {changeOrientation} from '../redux/reducers/orientation';
import {lockMenu} from '../redux/reducers/menu';
import HealthyCitizenApp from '../components/HealthyCitizenApp';
import {getOption} from '../services/localStorage';

const mapDispatchToProps = (dispatch) => ({
  goBack: bindActionCreators(NavigationActions.back, dispatch),
  changeOrientation: bindActionCreators(changeOrientation, dispatch),
  lockApp: navigation => {
    const hasPinCode = getOption('token') && getOption('pinCode');

    if (
      (
        !hasPinCode &&
        navigation.routes[navigation.index].routeName === 'Auth'
      ) ||
      (
        hasPinCode &&
        navigation.routes[navigation.index].routeName === 'AuthPinCode'
      )
    ) {
      return false;
    }

    dispatch(lockMenu());

    dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [
          NavigationActions.navigate(hasPinCode
            ? {
              routeName: 'AuthPinCode',
              params: {
                action: 'checkPinCode',
                routes: navigation.routes
              }
            }
            : {
              routeName: 'Auth'
            }
          )
        ]
      })
    );

    if (!getOption('pinCode')) {
      dispatch({
        type: 'USER_LOGOUT'
      });
    }
  },
  dispatch: dispatch
});

const mapStateToProps = (state, dispatch) => ({
  isLocked: state.menu.locked,
  navigation: state.navigation
});

export default connect(mapStateToProps, mapDispatchToProps)(HealthyCitizenApp);
