import {connect} from 'react-redux';
import DashboardView from '../components/DashboardView';

const mapDispatchToProps = {
};

const mapStateToProps = (state) => ({
  orientation: state.orientation.orientation,
  dashboards: state.interfaceDashboard.dashboards,
  appInfo: state.interfaceDashboard.appInfo,
  profile: state.data.profile
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardView);
