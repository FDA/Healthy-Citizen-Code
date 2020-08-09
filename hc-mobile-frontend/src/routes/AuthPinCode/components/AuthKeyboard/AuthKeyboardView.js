import React, {Component, PropTypes} from 'react';
import {
  View,
  Text,
  Alert,
  Dimensions
} from 'react-native';
import {
  Button,
  Icon
} from 'native-base';
import styles from '../AuthPinCodeViewStyles';

class AuthKeyboardView extends Component {
  constructor() {
    super();

    this.leftBottomBtnClick = this.leftBottomBtnClick.bind(this);
  }

  leftBottomBtnClick() {
    const {mode, skipPinCode, skip, lockPinCode, goToDashboard} = this.props;

    if (mode === 'set') {
      if (skipPinCode) {
        goToDashboard();
      } else {
        Alert.alert(
          'Skipping PIN code',
          'Do you want to skip\nentering the PIN code?\n\nYou will be able to set the PIN code at any time using an item "Set PIN code" in the Main menu.',
          [
            {
              text: 'Cancel'
            },
            {
              text: 'OK',
              onPress: () => {
                skip();
              }
            }
          ],
          {
            cancelable: false
          }
        );
      }
    } else {
      Alert.alert(
        'Restore authorization',
        'Do you want to reset authorization\nand log in again?',
        [
          {
            text: 'Cancel'
          },
          {
            text: 'OK',
            onPress: () => {
              lockPinCode(true);
            }
          }
        ],
        {
          cancelable: false
        }
      );
    }
  }

  render() {
    const {disabled, mode, skipPinCode, keyNumberPress, deleteNumber, _window} = this.props;

    return (
      <View
        style={[styles.keyboardGridContainer, {
          width: _window.width,
          height: _window.width
        }]}
      >
        <View
          style={styles.keyboardGrid}
        >
          <View
            style={styles.keyboardGridColumn}
          >
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(1)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  1
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(4)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  4
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(7)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  7
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                transparent
                disabled={disabled}
                style={styles.keyboardKeyButton}
                onPress={() => this.leftBottomBtnClick()}
              >
                <Text
                  style={styles.keyboardButtonText}
                >
                  {
                    mode === 'set' ? skipPinCode ? 'CLOSE' : 'SKIP' : 'FORGOT?'
                  }
                </Text>
              </Button>
            </View>
          </View>
          <View
            style={styles.keyboardGridColumn}
          >
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(2)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  2
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(5)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  5
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(8)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  8
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(0)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  0
                </Text>
              </Button>
            </View>
          </View>
          <View
            style={styles.keyboardGridColumn}
          >
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(3)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  3
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(6)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  6
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                bordered
                disabled={disabled}
                style={styles.keyboardKeyNumber}
                onPress={() => keyNumberPress(9)}
              >
                <Text
                  style={styles.keyboardKeyText}
                >
                  9
                </Text>
              </Button>
            </View>
            <View
              style={styles.keyboardGridCell}
            >
              <Button
                transparent
                disabled={disabled}
                style={styles.keyboardKeyButton}
                onPress={() => deleteNumber()}
              >
                <Icon
                  name='backspace'
                  style={styles.keyboardButtonIcon}
                />
              </Button>
            </View>
          </View>
        </View>
      </View>
    );
  }
}

AuthKeyboardView.propTypes = {
  keyNumberPress: PropTypes.func.isRequired,
  deleteNumber: PropTypes.func.isRequired,
  skip: PropTypes.func.isRequired,
  lockPinCode: PropTypes.func.isRequired,
  goToDashboard: PropTypes.func.isRequired,
  mode: PropTypes.string.isRequired,
  skipPinCode: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  _window: PropTypes.object.isRequired
};

export default AuthKeyboardView;
