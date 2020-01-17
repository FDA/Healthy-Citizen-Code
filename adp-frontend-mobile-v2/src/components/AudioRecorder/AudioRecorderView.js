import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from 'react-native';

import Sound from 'react-native-sound';
import {AudioRecorder, AudioUtils} from 'react-native-audio';
import * as mime from 'react-native-mime-types';
import _ from 'lodash';
import logger from '../../services/logger';

class AudioRecorderView extends Component {
  constructor() {
    super();

    this.state = {
      currentTime: 0.0,
      recording: false,
      stoppedRecording: false,
      finished: false,
      audioPath: AudioUtils.DocumentDirectoryPath + `/recorded_audio_${Date.now()}.aac`,
      hasPermission: undefined,
      isPlaying: false,
      filePath: null,
    };

    this._finishRecording = this._finishRecording.bind(this);
    this._record = this._record.bind(this);
    this._play = this._play.bind(this);
    this._stop = this._stop.bind(this);
    this._submit = this._submit.bind(this);
  }

  static navigationOptions = {
    header: null
  };

  prepareRecordingPath(audioPath) {
    AudioRecorder.prepareRecordingAtPath(audioPath, {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: "Low",
      AudioEncoding: "aac",
      AudioEncodingBitRate: 32000
    });
  }

  componentDidMount() {
    this._checkPermission()
      .then((hasPermission) => {
        if (!hasPermission) {
          this.props.navigation.goBack();
          return;
        }
        this.setState({hasPermission});

        if (!hasPermission) return;

        this.prepareRecordingPath(this.state.audioPath);

        AudioRecorder.onProgress = (data) => {
          this.setState({currentTime: Math.floor(data.currentTime)});
        };

        AudioRecorder.onFinished = (data) => {
          // Android callback comes in the form of a promise instead.
          if (Platform.OS === 'ios') {
            this._finishRecording(data.status === "OK", data.audioFileURL);
          }
        };
      })
  }

  _checkPermission() {
    if (Platform.OS !== 'android') {
      return Promise.resolve(true);
    }

    const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE];
    return PermissionsAndroid.requestMultiple(permissions)
      .then((result) => {
        const hasPermission = Object.values(result).every(val => val === PermissionsAndroid.RESULTS.GRANTED);
        return hasPermission;
      })
  }

  _renderButton(title, onPress, active) {
    const style = (active) ? styles.activeButtonText : styles.buttonText;

    return (
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Text style={style}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  async _stop() {
    if (!this.state.recording) {
      console.warn('Can\'t stop, not recording!');
      return;
    }

    this.setState({stoppedRecording: true, recording: false});

    try {
      const filePath = await AudioRecorder.stopRecording();

      if (Platform.OS === 'android') {
        this._finishRecording(true, filePath);
      }
      return filePath;
    } catch (error) {
      logger.error(error);
    }
  }

  async _play() {
    const that = this;
    if (this.state.isPlaying) {
      return;
    }
    that.setState({isPlaying: true});

    if (this.state.recording) {
      await this._stop();
    }

    // These timeouts are a hacky workaround for some issues with react-native-sound.
    // See https://github.com/zmxv/react-native-sound/issues/89.
    setTimeout(() => {
      const sound = new Sound(this.state.audioPath, '', (error) => {
        if (error) {
          logger.error('failed to load the sound', error);
        }
      });

      setTimeout(() => {
        sound.play((success) => {
          if (success) {
            logger.debug('successfully finished playing');
            that.setState({isPlaying: false});
          } else {
            logger.error('playback failed due to audio decoding errors');
          }
        });
      }, 30);
    }, 30);
  }

  async _record() {
    if (this.state.recording) {
      console.warn('Already recording!');
      return;
    }

    if (!this.state.hasPermission) {
      console.warn('Can\'t record, no permission granted!');
      return;
    }

    if (this.state.stoppedRecording) {
      this.prepareRecordingPath(this.state.audioPath);
    }

    this.setState({recording: true});

    try {
      const filePath = await AudioRecorder.startRecording();
    } catch (error) {
      logger.error(error);
    }
  }

  _finishRecording(didSucceed, filePath) {
    this.setState({finished: didSucceed, filePath});
    logger.debug(`Finished recording of duration ${this.state.currentTime} seconds at path: ${filePath}`);
  }

  _submit() {
    let {filePath} = this.state;
    const onRecordAudioCallback = this.props.navigation.state.params.onRecordAudioCallback;
    if (!filePath || !_.isFunction(onRecordAudioCallback)) {
      return;
    }
    if (Platform.OS === 'android') {
      filePath = 'file://' + filePath;
    }
    const filename = filePath.split('/').pop();
    onRecordAudioCallback({
      uri: filePath,
      name: filename,
      type: mime.lookup(filePath) || 'application/octet-stream'
    });
    this.props.navigation.goBack();
  }

  render() {
    if (!this.state.hasPermission) {
      return <View/>;
    }
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          {this._renderButton("RECORD", () => {
            this._record()
          }, this.state.recording)}
          {this._renderButton("PLAY", () => {
            this._play()
          }, this.state.isPlaying)}
          {this._renderButton("STOP", () => {
            this._stop()
          })}
          <Text style={styles.progressText}>{this.state.currentTime}s</Text>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={this._submit}
            disabled={this.state.filePath === null}
          >
            <Text style={styles.submitButtonText}>
              SUBMIT
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

AudioRecorderView.propTypes = {
  noLockBackground: PropTypes.func.isRequired,
  lockBackground: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2b608a",
  },
  controls: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  progressText: {
    paddingTop: 50,
    fontSize: 50,
    color: "#fff"
  },
  button: {
    padding: 20,
    margin: 5,
    // backgroundColor: "rgba(224,224,224,0.5)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#eee',
  },
  submitButton: {
    padding: 20,
    margin: 5,
    backgroundColor: "rgba(106,224,101,0.5)",

    borderColor: '#DDD',
    // backgroundColor: '#5add64',
  },
  disabledButtonText: {
    color: '#eee'
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 18,
    color: "#eee"
  },
  submitButtonText: {
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 24,
    color: "#eee"
  },
  activeButtonText: {
    fontSize: 20,
    color: "#B81F00"
  }

});

export default AudioRecorderView;
