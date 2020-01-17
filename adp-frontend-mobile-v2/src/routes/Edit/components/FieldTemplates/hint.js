import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  TouchableWithoutFeedback,
  View
} from 'react-native';
import {
  Icon,
  Toast,
  Container
} from 'native-base';
import styles from '../FormScreen/FormStylesheets';

// import Toast, {DURATION} from 'react-native-easy-toast'

class HintView extends Component {
  constructor() {
    super();

    this.showHint = this.showHint.bind(this);
    this.state = {
      isToastOpened: false
    };
  }

  showHint(text) {
    this.refs.toast._root.showToast({
      config: {
        text: text,
        position: 'center',
        buttonText: 'Ok'
      }
    });
  }

  render() {
    const {children} = this.props;

    return (
      [
        <TouchableWithoutFeedback
          key={0}
          onPress={() => this.showHint(children)}
        >
          <Icon
            name='ios-information-circle-outline'
            size={5}
            style={styles.helpButton}
          />
        </TouchableWithoutFeedback>,
        <Toast key={1} ref="toast"/>
      ]
    )
  }
}

HintView.propTypes = {
  children: PropTypes.string.isRequired
};

export default HintView;
