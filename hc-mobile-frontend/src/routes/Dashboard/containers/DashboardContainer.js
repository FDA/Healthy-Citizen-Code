import {connect} from 'react-redux';
import DashboardView from '../components/DashboardView';

const mapDispatchToProps = {
};

const mapStateToProps = (state) => ({
  orientation: state.orientation.orientation,
  dashboard: state.dashboard.data,
  profile: state.data.profile
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardView);
