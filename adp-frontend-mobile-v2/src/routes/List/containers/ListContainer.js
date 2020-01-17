import {connect} from 'react-redux';
import {deleteData} from '../../../redux/reducers/data';
import {getDashboard} from '../../../redux/reducers/dashboard';
import ListView from '../components/ListView';

const mapDispatchToProps = {
  deleteData,
  getDashboard
};

const mapStateToProps = (state) => ({
  isDeleting: state.data.isDataDeleting,
  isDeleted: state.data.isDataDeleted,
  data: state.data.data,
  interfaces: state.interfaceDashboard.interfaces,
  layout: state.interfaceDashboard.layout,
  fields: state.schema.fields
});

export default connect(mapStateToProps, mapDispatchToProps)(ListView);
