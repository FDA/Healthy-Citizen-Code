import {connect} from 'react-redux';
import DashboardItemsView from '../components/DashboardItemsView';

const mapDispatchToProps = {
};

const mapStateToProps = (state) => ({
  orientation: state.orientation.orientation,
  dashboards: state.interfaceDashboard.dashboards
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardItemsView);
