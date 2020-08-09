import {connect} from 'react-redux';
import DashboardItemsView from '../components/DashboardItemsView';

const mapDispatchToProps = {
};

const mapStateToProps = (state) => ({
  orientation: state.orientation.orientation,
  dashboard: state.dashboard.data
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardItemsView);
