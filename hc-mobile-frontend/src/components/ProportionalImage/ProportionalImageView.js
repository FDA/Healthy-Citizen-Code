import React, {Component, PropTypes} from 'react';
import {
  View,
  Image
} from 'react-native';
import styles from './ProportionalImageViewStyles';

class ProportionalImageView extends Component {
  constructor() {
    super();

    this.state = {
      width: 1,
      height: 1,
      realImageWidth: 0,
      realImageHeight: 0,
      containerWidth: 0
    };

    this.mounted = false;

    this._setState = this._setState.bind(this);
    this._onLoad = this._onLoad.bind(this);
    this._onLayout = this._onLayout.bind(this);
    this._resize = this._resize.bind(this);
  }

  componentWillMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  _setState(object) {
    if (this.mounted) {
      this.setState(object);
    }
  }

  _onLoad() {
    const {source} = this.props;

    Image.getSize(source, (width, height) => {
      this._setState({
        realImageWidth: width,
        realImageHeight: height
      });

      this._resize();
    });
  }

  _onLayout(event) {
    const {width} = event.nativeEvent.layout;
    const {containerWidth} = this.state;

    if (containerWidth === width) {
      return false;
    }

    this._setState({
      containerWidth: width
    });

    this._resize();
  }

  _resize() {
    setTimeout(() => {
      const {realImageWidth, realImageHeight, containerWidth} = this.state;

      if (realImageWidth && realImageHeight && containerWidth) {
        this._setState({
          width: containerWidth,
          height: realImageHeight * containerWidth / realImageWidth
        });
      }
    });
  }

  render() {
    const {source, style} = this.props;
    const {width, height} = this.state;

    return (
      <View
        style={styles.container}
        onLayout={(event) => this._onLayout(event)}
      >
        <Image
          style={[styles.image, style, {width, height}]}
          source={{uri: source}}
          resizeMode='contain'
          onLoad={() => this._onLoad()}
        />
      </View>
    );
  }
}

ProportionalImageView.propTypes = {
  source: PropTypes.string.isRequired,
  style: PropTypes.object
};

export default ProportionalImageView;
