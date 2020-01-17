import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {NavigationActions} from 'react-navigation';
import Menu from '../components/Menu';

const mapDispatchToProps = (dispatch) => ({
  reset: bindActionCreators(NavigationActions.reset, dispatch)
});

const mapStateToProps = (state) => {
  const currentRoute = state.navigation.routes[state.navigation.index];

  return {
    interfaces: state.interfaceDashboard.interfaces,
    appInfo: state.interfaceDashboard.appInfo,
    profile: state.data.profile,
    currentRoute: currentRoute.routeName || '',
    currentPath: currentRoute.params ? currentRoute.params.currentPath : null
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
