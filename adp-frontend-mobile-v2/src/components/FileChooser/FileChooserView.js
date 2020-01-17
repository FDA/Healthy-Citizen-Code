import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
  CameraRoll,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Icon
} from 'native-base';
import {getOption} from '../../services/localStorage';
import Config from '../../config';
import _ from 'lodash';
import Camera from '../Camera';
// import ProportionalImageView from '../../components/ProportionalImage';

import {DocumentPicker, DocumentPickerUtil} from 'react-native-document-picker';

class FileChooserView extends Component {
  constructor(props) {
    super(props);
    const {locals} = props;

    this.state = {
      uploading: false,
      showUploadModal: false,
      uploadProgress: 0,
      uploadTotal: 0,
      uploadWritten: 0,
      uploadStatus: undefined,
      cancelled: false,
      files: locals.value || [],
    };
    // move to props?
    this.uploadUrl = Config.api.host + '/upload';

    this._chooseDoc = this._chooseDoc.bind(this);
    this.uploadProgressModal = this.uploadProgressModal.bind(this);
    this._getPickerFileTypes = this._getPickerFileTypes.bind(this);
    this._cancelUpload = this._cancelUpload.bind(this);
    this._closeUploadModal = this._closeUploadModal.bind(this);
    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.getActionButton = this.getActionButton.bind(this);
  }

  static imageExtensions = ['jpg', 'jpeg', 'png', 'bmp']; // tiff, gif?
  static videoExtensions = [
    'webm', 'mkv', 'flv', 'ogv', 'avi', 'mov', 'qt', 'wmv', 'mp4', 'm4p', 'm4v',
    '.mpg', '.mp2', '.mpeg', '.mpe', '.mpv', '3gp'
  ];
  static documentExtensions = ['doc', 'docx', 'xls', 'xlt', 'xlsx', 'xltx', 'ppt', 'pptx', 'txt', 'md'];
  static audioExtensions = [
    '3gp', 'aa', 'aac', 'aax', 'act', 'aiff', 'amr', 'ape', 'au', 'awb', 'dct',
    'dss', 'dvf', 'flac', 'gsm', 'iklax', 'ivs', 'm4a', 'm4b', 'm4p', 'mmf', 'mp3', 'mpc', 'msv', 'ogg',
    'oga', 'mogg', 'opus', 'ra, rm', 'raw', 'sln', 'tta', 'vox', 'wav', 'wma', 'wv', 'webm', '8svx'
  ];

  _closeUploadModal() {
    this.setState({
      showUploadModal: false,
      uploadProgress: 0,
      uploadTotal: 0,
      uploadWritten: 0,
      files: [],
      cancelled: false,
    });
  }

  _cancelUpload() {
    this.setState({uploading: false, cancelled: true});
  }

  uploadProgressModal() {
    const {locals, upload} = this.props;
    const progress = _.get(upload, ['progress', locals.formUrl, locals.fieldId], {});
    let uploadProgress;

    const uploadStatus = progress.uploadStatus;
    if (progress.cancelled) {
      uploadProgress = (
        <View style={{margin: 5, alignItems: 'center',}}>
          <Text>
            Upload Cancelled
          </Text>
          <TouchableOpacity style={styles.button} onPress={this._closeUploadModal}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (!progress.uploading && uploadStatus) {
      const statusMessage = uploadStatus === 200 ? 'Successfully uploaded' :
        uploadStatus === 413 ? 'Too big file to upload' : 'Error occurred during uploading. Please try again.';
      uploadProgress = (
        <View style={{flexDirection: 'row', alignItems: 'center', padding: 4}}>
          <Text>
            {statusMessage}
          </Text>
          {/*<TouchableOpacity style={[styles.button, {marginLeft: 4}]} onPress={this._closeUploadModal}>*/}
          {/*<Text>{this.state.uploading ? '' : 'Close'}</Text>*/}
          {/*</TouchableOpacity>*/}
        </View>
      );
    } else if (progress.uploading) {
      uploadProgress = (
        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center',}}>
          {/*<Text style={styles.title}>Uploading {this.state.files.length}*/}
          {/*File{this.state.files.length === 1 ? '' : 's'}</Text>*/}
          <ActivityIndicator
            animating={this.state.animating}
            style={{height: 8}}
            size="large"/>
          <Text>{progress.uploadProgress.toFixed(0)}%</Text>
          <Text style={{fontSize: 11, color: 'gray', marginTop: 5, marginLeft: 5,}}>
            {(progress.uploadWritten / 1024).toFixed(0)}/{(progress.uploadTotal / 1024).toFixed(0)} KB
          </Text>
          {/*<TouchableOpacity style={[styles.button, {marginTop: 5}]} onPress={this._cancelUpload}>*/}
          {/*<Text>Cancel</Text>*/}
          {/*</TouchableOpacity>*/}
        </View>
      );
    }

    const modalStyle = !progress.uploading && uploadStatus !== 200 ? [styles.modal, styles.modalError] : styles.modal;
    return <View style={modalStyle}>
      {uploadProgress}
    </View>;
  }

  _getPickerFileTypes(filetype) {
    if (!filetype || !_.isString(filetype)) {
      return DocumentPickerUtil.allFiles();
    }

    switch (filetype.toLowerCase()) {
      case 'file':
        return DocumentPickerUtil.allFiles();
      case 'image':
        return DocumentPickerUtil.images();
      case 'audio':
        return DocumentPickerUtil.audio();
      case 'video':
        return (Platform.OS === 'android') ? "video/*" : "public.movie";
      default:
        return DocumentPickerUtil.allFiles();
    }
  }

  _chooseDoc() {
    const documentPickerFileTypes = this._getPickerFileTypes(this.props.locals.filetype);
    const that = this;
    const {locals} = this.props;
    DocumentPicker.show({
      filetype: [documentPickerFileTypes],
    }, (error, res) => {
      if (error) {
        return;
      }
      const file = {
        uri: res.uri,
        type: res.type,
        name: res.fileName,
        size: res.fileSize
      };

      that.addFile(file);
    });
  }

  addFile(file) {
    const {locals, addFileToUpload} = this.props;
    addFileToUpload(locals.formUrl, locals.fieldId, file);
    const newValue = (locals.value || []).concat([file]);
    locals.onChange(newValue);
  }

  removeFile(file) {
    const {locals, removeFileToUpload} = this.props;
    removeFileToUpload(locals.formUrl, locals.fieldId, file.id || file.uri);
    const newValue = locals.value.filter(curFile => {
      if (file.id) {
        return curFile.id !== file.id;
      } else if (file.uri) {
        return curFile.uri !== file.uri;
      }
    });
    locals.onChange(newValue);
  }

  getActionButton(filetype, isActionButtonsDisabled, messageStyle) {
    const {navigate} = this.props.locals.navigation;
    switch (filetype) {
      case 'image':
        return (
          <TouchableOpacity
            disabled={isActionButtonsDisabled}
            style={styles.button}
            onPress={() => navigate('Camera', {cameraType: Camera.types.photo, onTakePictureCallback: this.addFile})}
          >
            <Text style={messageStyle}>Take a photo</Text>
          </TouchableOpacity>
        );
      case 'audio':
        return (
          <TouchableOpacity
            disabled={isActionButtonsDisabled}
            style={styles.button}
            onPress={() => navigate('AudioRecorder', {onRecordAudioCallback: this.addFile})}>
            <Text style={messageStyle}>Record audio</Text>
          </TouchableOpacity>
        );
      case 'video':
        return (
          <TouchableOpacity
            disabled={isActionButtonsDisabled}
            style={styles.button}
            onPress={() => navigate('Camera', {cameraType: Camera.types.video, onRecordVideoCallback: this.addFile})}>
            <Text style={messageStyle}>Record video</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  }

  render() {
    const {locals, upload} = this.props;
    // const files = _.get(upload, ['files', locals.formUrl, locals.fieldId], []);
    const progress = _.get(upload, ['progress', locals.formUrl, locals.fieldId], {});

    let typeMsg = _.get(locals, 'filetype', 'file');
    if (!locals.isSingleUpload) {
      typeMsg = typeMsg.replace('[]', 's');
    }
    const chooseMessage = `Choose ${typeMsg}`;

    const isActionButtonsDisabled = locals.isSingleUpload && (locals.value || []).length > 0;
    const messageStyle = [styles.buttonText, isActionButtonsDisabled ? {color: 'rgba(0, 0, 0, .12)'} : {}];
    const filetype = _.get(locals, 'filetype');
    return (
      <View style={styles.container}>
        {
          progress.showUploadModal ? this.uploadProgressModal() : null
        }
        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
          <TouchableOpacity
            disabled={isActionButtonsDisabled}
            style={styles.button}
            onPress={this._chooseDoc}
          >
            <Text style={messageStyle}>{chooseMessage}</Text>
          </TouchableOpacity>
          {
            this.getActionButton(filetype, isActionButtonsDisabled, messageStyle)
          }
        </View>

        <View style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8}}>
          {
            _.map(locals.value, (file) => {
              return this.getThumbnail(file)
            })
          }
        </View>
      </View>
    );
  }

  getThumbnail(file) {
    const thumbnail = this.getThumbnailSourceByExtension(file);
    const key = file.uri || file.id;
    return (
      [
        <View key={'close_' + key}>
          <View
            style={styles.closeThumbnailContainer}>
            <TouchableOpacity
              style={{marginTop: -1, marginLeft: 1}}
              onPress={() => this.removeFile(file)}
            >
              <Icon name='close-circle' active
              />
            </TouchableOpacity>
          </View>
        </View>,
        <View key={key} style={styles.thumbnailContainer}>
          {thumbnail}
          <Text numberOfLines={1} style={styles.thumbnailTitle}>{file.name}</Text>
        </View>
      ]
    );
  }

  getThumbnailSourceByExtension(file) {
    const extension = _.get(file, 'name', '').split('.').pop();
    let source;

    if (file.id) {
      // if file is already on server - load thumbnail for it
      source = {uri: Config.api.host + '/file-thumbnail' + `/${file.id}`};
    } else if (FileChooserView.imageExtensions.includes(extension)) {
      source = {uri: file.uri};
    } else if (FileChooserView.videoExtensions.includes(extension)) {
      source = require('./assets/video_thumbnail.jpeg');
    } else if (FileChooserView.documentExtensions.includes(extension)) {
      source = require('./assets/document.png');
    } else if (FileChooserView.audioExtensions.includes(extension)) {
      source = require('./assets/audio_thumbnail.jpg');
    } else {
      source = require('./assets/default.png');
    }
    return <Image source={source} style={styles.thumbnail}/>;
  }
}

FileChooserView.propTypes = {
  locals: PropTypes.object.isRequired,
  uploadCallback: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    padding: 5,
    borderRadius: 8,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 14,
  },
  thumbnailContainer: {
    flexDirection: 'column',
    width: 64,
    height: 80,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 4,
  },
  closeThumbnailContainer: {
    zIndex: 1,
    width: 25,
    height: 25,
    backgroundColor: 'rgba(200,200,200,0.5)',
    position: 'absolute',
    top: 0,
    left: 40
  },
  thumbnail: {
    width: 64,
    height: 64,
    flex: 1,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  thumbnailTitle: {
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 10,
    maxWidth: 64,
    maxHeight: 16
  },
  modal: {
    // margin: 50,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 5,
    // padding: 10,
    borderRadius: 8,
    backgroundColor: '#5add64',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalError: {
    backgroundColor: '#dd444e',
  },
  title: {
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 14,
  },
  button: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#EEE',
    marginHorizontal: 5,
  }
});

module.exports = FileChooserView;
