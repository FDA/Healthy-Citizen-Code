import {connect} from 'react-redux';
import {addFileToUpload, removeFileToUpload} from '../../redux/reducers/upload';
import FileChooser from './FileChooserView';

const mapDispatchToProps = {
  addFileToUpload,
  removeFileToUpload
};

const mapStateToProps = (state) => ({
  upload: state.upload,
});

export default connect(mapStateToProps, mapDispatchToProps)(FileChooser);
