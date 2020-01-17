import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import styles from './BarcodeViewStyles';
import _ from 'lodash';
import RNGooglePlaces from 'react-native-google-places';
import logger from '../../../../../services/logger';

class BarcodeView extends Component {
  constructor(props) {
    super(props);

    this.placeholder = 'Your address here';
    this.scanBarcode = this.scanBarcode.bind(this);
    this.onBarcodeCallback = this.onBarcodeCallback.bind(this);
  }

  onBarcodeCallback = (barcodeData) => {
    const {locals} = this.props;
    locals.onChangeValue(locals.fieldId, barcodeData);
  };

  scanBarcode() {
    const {locals} = this.props;
    locals.navigation.navigate('Camera', {cameraType: 'barcode', onBarcodeCallback: this.onBarcodeCallback})
  }

  render() {
    const {locals} = this.props;
    if (locals.hidden) {
      return null;
    }

    const stylesheet = locals.stylesheet;
    let controlLabelStyle = stylesheet.controlLabel.normal;
    let textboxStyle = stylesheet.textbox.normal;
    let textboxViewStyle = stylesheet.textboxView.normal;
    const errorBlockStyle = stylesheet.errorBlock;

    if (locals.hasError) {
      controlLabelStyle = stylesheet.controlLabel.error;
      textboxStyle = stylesheet.textbox.error;
      textboxViewStyle = stylesheet.textboxView.error;
    }

    textboxStyle = Object.assign({}, textboxStyle);

    const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
    const help = locals.help ? <Hint>{locals.help}</Hint> : null;
    const error = locals.hasError && locals.error ?
      <Text accessibilityLiveRegion='polite' style={errorBlockStyle}>{locals.error}</Text> : null;

    const barcodeTextStyle = help ? [textboxStyle, {width: Dimensions.get('window').width - 54}] : textboxStyle;
    return (
      <View style={styles.container}>
        {label}
        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
          <TouchableOpacity
            style={styles.button}
            onPress={this.scanBarcode}
          >
            <Text style={styles.buttonText}>Scan barcode</Text>
          </TouchableOpacity>
        </View>
        <View style={[textboxViewStyle]}>
          <Text
            ref='barcode'
            editable={false}
            placeholder={this.placeholder}
            style={barcodeTextStyle}
          >
            {locals.value}
          </Text>
          {help}
        </View>
        {error}
      </View>
    );
  }
};

module.exports = BarcodeView;

