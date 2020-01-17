import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  Image,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  StatusBar,
  TouchableOpacity,
  Vibration,
  View,
  PermissionsAndroid,
} from 'react-native';
import Camera from 'react-native-camera';
import * as mime from 'react-native-mime-types';
import logger from '../../services/logger';

class CameraComponent extends Component {
  constructor(props) {
    super(props);
    this.takePicture = this.takePicture.bind(this);
    this.getCameraButtons = this.getCameraButtons.bind(this);
    this.processBarcode = this.processBarcode.bind(this);

    this.camera = null;

    this.state = {
      camera: {
        aspect: Camera.constants.Aspect.fill,
        captureTarget: Camera.constants.CaptureTarget.cameraRoll,
        type: Camera.constants.Type.back,
        orientation: Camera.constants.Orientation.auto,
        flashMode: Camera.constants.FlashMode.auto,
      },
      cameraViewType: props.navigation.state.params.cameraType,
      hasPermission: false,
      isRecording: false,
      isBarCodeRead: false,
      isTakingPicture: false // needed to avoid multiple button press
    };
  }

  componentDidMount() {
    const that = this;
    const {navigation} = this.props;
    this._checkPermission()
      .then((hasPermission) => {
        if (!hasPermission) {
          navigation.goBack();
        }
        that.setState({hasPermission});
      });
  }

  static navigationOptions = {
    header: null
  };

  static types = {
    video: 'video',
    barcode: 'barcode',
    photo: 'photo'
  };

  _checkPermission() {
    if (Platform.OS !== 'android') {
      return Promise.resolve(true);
    }

    const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE];
    return PermissionsAndroid.requestMultiple(permissions)
      .then((result) => {
        const hasPermission = Object.values(result).every(val => val === PermissionsAndroid.RESULTS.GRANTED);
        return hasPermission;
      })
  }

  takePicture() {
    if (this.state.isTakingPicture) {
      return;
    }
    this.state.isTakingPicture = true;

    const options = {};
    const {navigation} = this.props;
    const {onTakePictureCallback} = navigation.state.params;
    //options.location = ...
    if (this.camera) {
      this.camera.capture({metadata: options})
        .then((data) => {
          if (onTakePictureCallback) {
            const filename = data.path.split('/').pop();
            return onTakePictureCallback({
              name: filename,
              uri: data.path,
              type: mime.lookup(data.path) || 'application/octet-stream'
            });
          }
          return data;
        })
        .then(() => {
          navigation.goBack();
        })
        .catch(err => {
          logger.error(err)
        });
    }
  }

  startRecording = () => {
    const {navigation} = this.props;
    const {onRecordVideoCallback} = navigation.state.params;

    if (this.camera) {
      this.camera.capture({mode: Camera.constants.CaptureMode.video})
        .then((data) => {
          if (onRecordVideoCallback) {
            const filename = data.path.split('/').pop();
            return onRecordVideoCallback({
              name: filename,
              uri: data.path,
              type: mime.lookup(data.path) || 'application/octet-stream'
            });
          }
          return data;
        })
        .then(() => {
          navigation.goBack()
        })
        .catch(err => logger.error(err));

      this.setState({isRecording: true});
    }
  };

  stopRecording = () => {
    if (this.camera) {
      this.camera.stopCapture();
      this.setState({isRecording: false});
    }
  };

  switchType = () => {
    let newType;
    const {back, front} = Camera.constants.Type;

    if (this.state.camera.type === back) {
      newType = front;
    } else if (this.state.camera.type === front) {
      newType = back;
    }

    this.setState({
      camera: {
        ...this.state.camera,
        type: newType,
      },
    });
  };

  get typeIcon() {
    let icon;
    const {back, front} = Camera.constants.Type;

    if (this.state.camera.type === back) {
      icon = require('./assets/ic_camera_rear_white.png');
    } else if (this.state.camera.type === front) {
      icon = require('./assets/ic_camera_front_white.png');
    }

    return icon;
  }

  switchFlash = () => {
    let newFlashMode;
    const {auto, on, off} = Camera.constants.FlashMode;

    if (this.state.camera.flashMode === auto) {
      newFlashMode = on;
    } else if (this.state.camera.flashMode === on) {
      newFlashMode = off;
    } else if (this.state.camera.flashMode === off) {
      newFlashMode = auto;
    }

    this.setState({
      camera: {
        ...this.state.camera,
        flashMode: newFlashMode,
      },
    });
  };

  get flashIcon() {
    let icon;
    const {auto, on, off} = Camera.constants.FlashMode;

    if (this.state.camera.flashMode === auto) {
      icon = require('./assets/ic_flash_auto_white.png');
    } else if (this.state.camera.flashMode === on) {
      icon = require('./assets/ic_flash_on_white.png');
    } else if (this.state.camera.flashMode === off) {
      icon = require('./assets/ic_flash_off_white.png');
    }

    return icon;
  }

  render() {
    if (!this.state.hasPermission) {
      return <View/>;
    }
    return (
      <View style={styles.container}>
        <StatusBar
          animated
          hidden
        />
        <Camera
          ref={(cam) => {
            this.camera = cam;
          }}
          style={styles.preview}
          aspect={this.state.camera.aspect}
          captureTarget={this.state.camera.captureTarget}
          type={this.state.camera.type}
          flashMode={this.state.camera.flashMode}
          onBarCodeRead={(barcode) => this.processBarcode(barcode)}
          barcodeFinderVisible={true}
          barcodeFinderWidth={280}
          barcodeFinderHeight={220}
          barcodeFinderBorderColor="red"
          barcodeFinderBorderWidth={2}
          // onFocusChanged={() => {}}
          // onZoomChanged={() => {}}
          defaultTouchToFocus
          mirrorImage={false}
        />
        <View style={[styles.overlay, styles.topOverlay]}>
          <TouchableOpacity
            style={styles.typeButton}
            onPress={this.switchType}
            disabled={this.state.isRecording}
          >
            <Image
              source={this.typeIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={this.switchFlash}
            disabled={this.state.isRecording}
          >
            <Image
              source={this.flashIcon}
            />
          </TouchableOpacity>
        </View>
        <View style={[styles.overlay, styles.bottomOverlay]}>
          {
            this.getCameraButtons()
          }
        </View>
      </View>
    );
  }

  /**
   * @param barcode contains barcode.data, barcode.type and barcode.bounds (coordinates of rectangle in which the barcode is)
   */
  processBarcode(barcode) {
    const {cameraType} = this.props.navigation.state.params;
    if (this.state.cameraViewType !== 'barcode' || this.state.isBarCodeRead) {
      return;
    }

    this.state.isBarCodeRead = true;
    const {navigation} = this.props;
    const {onBarcodeCallback} = navigation.state.params;

    Vibration.vibrate(500);
    onBarcodeCallback(barcode.data);
    navigation.goBack();
  }

  getTakePhotoButton() {
    return (
      <TouchableOpacity
        style={styles.captureButton}
        disabled={this.state.isTakingPicture}
        onPress={this.takePicture}
      >
        <Image
          source={require('./assets/ic_photo_camera_36pt.png')}
        />
      </TouchableOpacity>
    );
  }

  getCameraButtons() {
    switch (this.state.cameraViewType) {
      case CameraComponent.types.video:
        if (!this.state.isRecording) {
          return this.getRecordVideoButton();
        } else {
          return this.getStopVideoButton();
        }
      case CameraComponent.types.barcode:
        return this.getBarcodeButton();
      case CameraComponent.types.photo:
      default:
        return this.getTakePhotoButton();
    }
  }

  getStopVideoButton() {
    return (
      <TouchableOpacity
        style={styles.captureButton}
        onPress={this.stopRecording}
      >
        <Image
          source={require('./assets/ic_stop_36pt.png')}
        />
      </TouchableOpacity>
    );
  }

  getRecordVideoButton() {
    return (
      <TouchableOpacity
        style={styles.captureButton}
        onPress={this.startRecording}
      >
        <Image
          source={require('./assets/ic_videocam_36pt.png')}
        />
      </TouchableOpacity>
    );
  }

  getBarcodeButton() {
    return (
      <Text
        style={styles.captureButton}
      >
        Point the camera at the barcode
      </Text>
    );
  }
}

CameraComponent.propTypes = {
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    padding: 16,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  topOverlay: {
    top: 0,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomOverlay: {
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 40,
  },
  typeButton: {
    padding: 5,
  },
  flashButton: {
    padding: 5,
  },
  buttonsSpace: {
    width: 10,
  },
});

export default CameraComponent;
