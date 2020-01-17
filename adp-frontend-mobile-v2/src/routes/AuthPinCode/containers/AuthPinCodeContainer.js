import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {lockMenu, unlockMenu} from '../../../redux/reducers/menu';
import {logout} from '../../../redux/reducers/auth';
import AuthPinCodeView from '../components/AuthPinCodeView';
import {authNoAlert} from '../../../redux/reducers/auth';

const mapDispatchToProps = (dispatch) => ({
  authNoAlert: bindActionCreators(authNoAlert, dispatch),
  logout: bindActionCreators(logout, dispatch),
  lockMenu: () => dispatch(lockMenu()),
  unlockMenu: () => dispatch(unlockMenu())
});

const mapStateToProps = (state) => ({
  isReceived: state.data.isReceived,
  interfaces: state.interfaceDashboard.interfaces,
});

export default connect(mapStateToProps, mapDispatchToProps)(AuthPinCodeView);
