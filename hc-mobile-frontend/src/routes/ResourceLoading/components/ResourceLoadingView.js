import React, {Component, PropTypes} from 'react';
import {
  Text
} from 'react-native';
import {
  Container,
  Content
} from 'native-base';
import {NavigationActions} from 'react-navigation';
import LinearGradient from 'react-native-linear-gradient';
import {Circle as ProgressCircle} from 'react-native-progress';
import {removeStorageItem} from '../../../services/globalStorage';
import {getOption} from '../../../services/localStorage';
import styles from './ResourceLoadingViewStyles';

class ResourceLoadingView extends Component {
  constructor() {
    super();

    this.state = {
      step: 0
    };

    this.maxSteps = 4;

    this.makeProgress = this.makeProgress.bind(this);
    this.loadResources = this.loadResources.bind(this);
  }

  static navigationOptions = {
    header: {
      visible: false
    }
  };

  componentDidMount() {
    this.loadResources();
  }

  makeProgress() {
    this.setState({
      step: Math.min(this.state.step + 1, this.maxSteps)
    });
  }

  loadResources() {
    const {unlockMenu, getInterface, getDashboard, getSchemas, getData, navigation, isReceived} = this.props;

    if (isReceived) {
      navigation.dispatch(
        NavigationActions.reset({
          index: 0,
          actions: [
            NavigationActions.navigate({
              routeName: 'Dashboard'
            })
          ]
        })
      );

      return false;
    }

    this.setState({
      step: 0
    });

    getInterface()
      .then(() => {
        this.makeProgress();

        return getDashboard();
      })
      .then(() => {
        this.makeProgress();

        return getSchemas();
      })
      .then(schema => {
        this.makeProgress();

        return getData(schema, getOption('piiId'), getOption('phiId'));
      })
      .then(() => {
        // TODO: is this necessary? It does nothing, right?
        this.makeProgress();

        return new Promise(resolve => setTimeout(() => resolve(), 500));
      })
      .then(() => {
        unlockMenu();

        navigation.dispatch(
          NavigationActions.reset({
            index: 0,
            actions: [
              NavigationActions.navigate({
                routeName: 'Dashboard'
              })
            ]
          })
        );
      })
      .catch(() => {
        Promise.all([
          removeStorageItem('token'),
          removeStorageItem('piiId'),
          removeStorageItem('phiId'),
          removeStorageItem('attempts')
        ]).then(() => {
          navigation.navigate('Auth');
        });
      });
  }

  render() {
    const {step} = this.state;

    return (
      <Container
        style={styles.container}
      >
        <LinearGradient
          colors={['#5BC9F5', '#EFEFF4']}
          style={styles.gradientContainer}
        >
          <Content
            contentContainerStyle={styles.content}
          >
            <Text
              style={styles.loadingText}
            >
              Loading...
            </Text>
            <ProgressCircle
              showsText={true}
              progress={step / this.maxSteps}
              size={100}
              color='#2196f3'
            />
          </Content>
        </LinearGradient>
      </Container>
    );
  }
}

ResourceLoadingView.propTypes = {
  unlockMenu: PropTypes.func.isRequired,
  getInterface: PropTypes.func.isRequired,
  getDashboard: PropTypes.func.isRequired,
  getSchemas: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  isReceived: PropTypes.bool.isRequired
};

export default ResourceLoadingView;