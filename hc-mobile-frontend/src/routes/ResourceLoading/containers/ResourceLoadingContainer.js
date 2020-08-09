import {connect} from 'react-redux';
import {getInterface} from '../../../redux/reducers/interface';
import {getDashboard} from '../../../redux/reducers/dashboard';
import {getSchemas} from '../../../redux/reducers/schema';
import {getData} from '../../../redux/reducers/data';
import {unlockMenu} from '../../../redux/reducers/menu';
import ResourceLoadingView from '../components/ResourceLoadingView';

const mapDispatchToProps = {
  getInterface,
  getDashboard,
  getSchemas,
  getData,
  unlockMenu
};

const mapStateToProps = (state) => ({
  isReceived: state.data.isReceived
});

export default connect(mapStateToProps, mapDispatchToProps)(ResourceLoadingView);
