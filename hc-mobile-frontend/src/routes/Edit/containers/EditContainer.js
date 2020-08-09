import {connect} from 'react-redux';
import {addData, saveData} from '../../../redux/reducers/data';
import EditView from '../components/EditView';
import {getDashboard} from '../../../redux/reducers/dashboard';

const mapDispatchToProps = {
  addData,
  saveData,
  getDashboard
};

const mapStateToProps = (state) => ({
  isSaving: state.data.isDataSaving,
  isSaved: state.data.isDataSaved,
  interfaces: state.interface.data,
  fields: state.schema.fields,
  data: state.data.data
});

export default connect(mapStateToProps, mapDispatchToProps)(EditView);
