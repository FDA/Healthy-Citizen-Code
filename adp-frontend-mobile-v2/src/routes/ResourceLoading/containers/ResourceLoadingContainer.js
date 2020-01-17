import {connect} from 'react-redux';
import {getInterfaceDashboard} from '../../../redux/reducers/interfaceDashboard';
// import {getDashboard} from '../../../redux/reducers/dashboard';
import {getSchemas} from '../../../redux/reducers/schema';
import {getData} from '../../../redux/reducers/data';
import {unlockMenu} from '../../../redux/reducers/menu';
import ResourceLoadingView from '../components/ResourceLoadingView';

const mapDispatchToProps = {
  getInterfaceDashboard,
  getSchemas,
  getData,
  unlockMenu
};

const mapStateToProps = (state) => ({
  isReceived: state.data.isReceived,
  interfaces: state.interfaceDashboard.interfaces
});

export default connect(mapStateToProps, mapDispatchToProps)(ResourceLoadingView);
