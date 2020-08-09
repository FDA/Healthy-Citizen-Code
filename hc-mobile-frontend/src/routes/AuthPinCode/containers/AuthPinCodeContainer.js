import {connect} from 'react-redux';
import {NavigationActions} from 'react-navigation';
import {lockMenu, unlockMenu} from '../../../redux/reducers/menu';
import AuthPinCodeView from '../components/AuthPinCodeView';

const mapDispatchToProps = (dispatch) => ({
  logout: () => {
    dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [
          NavigationActions.navigate({
            routeName: 'Auth'
          })
        ]
      })
    );

    dispatch({
      type: 'USER_LOGOUT'
    });
  },
  lockMenu: () => dispatch(lockMenu()),
  unlockMenu: () => dispatch(unlockMenu())
});

const mapStateToProps = (state) => ({
  isReceived: state.data.isReceived
});

export default connect(mapStateToProps, mapDispatchToProps)(AuthPinCodeView);
