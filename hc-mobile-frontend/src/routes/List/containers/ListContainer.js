import {connect} from 'react-redux';
import {deleteData} from '../../../redux/reducers/data';
import ListView from '../components/ListView';
import {getDashboard} from '../../../redux/reducers/dashboard';

const mapDispatchToProps = {
  deleteData,
  getDashboard
};

const mapStateToProps = (state) => ({
  isDeleting: state.data.isDataDeleting,
  isDeleted: state.data.isDataDeleted,
  data: state.data.data,
  interfaces: state.interface.data,
  fields: state.schema.fields
});

export default connect(mapStateToProps, mapDispatchToProps)(ListView);
