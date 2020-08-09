import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {auth} from '../../../redux/reducers/auth';
import AuthView from '../components/AuthView';

const mapDispatchToProps = (dispatch) => ({
  auth: bindActionCreators(auth, dispatch),
  logout: () => {
    dispatch({
      type: 'USER_LOGOUT'
    });
  }
});

const mapStateToProps = (state) => ({
});

export default connect(mapStateToProps, mapDispatchToProps)(AuthView);
