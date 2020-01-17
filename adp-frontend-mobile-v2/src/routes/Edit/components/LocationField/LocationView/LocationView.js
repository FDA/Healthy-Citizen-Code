import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import styles from './LocationViewStyles';
import _ from 'lodash';
import RNGooglePlaces from 'react-native-google-places';
import logger from '../../../../../services/logger';

class LocationView extends Component {
  constructor(props) {
    super(props);

    this.placeholder = 'Your address here';
    this.openSearchModal = this.openSearchModal.bind(this);
  }

  openSearchModal() {
    const {locals} = this.props;
    const location_label = locals.fieldId;
    const location = location_label.replace('_label', '');

    return RNGooglePlaces.openPlacePickerModal({radius: 100})
      .then((place) => {
        locals.onChangeValue(location_label, place.address);
        locals.onChangeValue(location, [place.latitude, place.longitude]);
        return true;
      })
  }

  render() {
    const {locals} = this.props;
    if (locals.hidden) {
      return null;
    }

    const stylesheet = locals.stylesheet;
    let formGroupStyle = stylesheet.formGroup.normal;
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

    const locationTextStyle = help ? [styles.textboxStyle, {width: Dimensions.get('window').width - 54}] : styles.textboxStyle;
    return (
      <View style={styles.container}>
        {label}
        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
          <TouchableOpacity
            style={styles.button}
            onPress={this.openSearchModal}
          >
            <Text style={styles.buttonText}>Choose location</Text>
          </TouchableOpacity>
        </View>
        <View style={[textboxViewStyle]}>
          <Text
            ref='address'
            editable={false}
            placeholder={this.placeholder}
            style={locationTextStyle}
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

module.exports = LocationView;

