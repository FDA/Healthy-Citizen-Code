import {connect} from 'react-redux';
import {addData, saveData} from '../../../redux/reducers/data';
import {clearState, updateFileProgress, setUploadedFiles} from '../../../redux/reducers/upload';
import {getDashboard} from '../../../redux/reducers/dashboard';
import EditView from '../components/EditView';

const mapDispatchToProps = {
  addData,
  saveData,
  clearState,
  updateFileProgress,
  setUploadedFiles,
  getDashboard
};

const mapStateToProps = (state) => ({
  isSaving: state.data.isDataSaving,
  isSaved: state.data.isDataSaved,
  interfaces: state.interfaceDashboard.interfaces,
  layout: state.interfaceDashboard.layout,
  fields: state.schema.fields,
  data: state.data.data,
  upload: state.upload,
});

export default connect(mapStateToProps, mapDispatchToProps)(EditView);
