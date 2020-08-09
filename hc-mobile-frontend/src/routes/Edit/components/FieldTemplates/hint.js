import React, {Component, PropTypes} from 'react';
import {
  TouchableWithoutFeedback
} from 'react-native';
import {
  Icon,
  Toast
} from 'native-base';
import styles from '../FormScreen/FormStylesheets';

class HintView extends Component {
  constructor() {
    super();

    this.showHint = this.showHint.bind(this);
  }

  showHint(text) {
    Toast.show({
      text: text,
      position: 'center',
      buttonText: 'Ok'
    });
  }

  render() {
    const {children} = this.props;

    return (
      <TouchableWithoutFeedback
        onPress={() => this.showHint(children)}
      >
        <Icon
          name='ios-information-circle-outline'
          size={5}
          style={styles.helpButton}
        />
      </TouchableWithoutFeedback>
    )
  }
}

HintView.propTypes = {
  children: PropTypes.string.isRequired
};

export default HintView;
