import React, {Component} from 'react';
import PropTypes from 'prop-types';
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
import {getStorageItem, removeStorageItem} from '../../../services/globalStorage';
import styles from './ResourceLoadingViewStyles';
import logger from '../../../services/logger';

class ResourceLoadingView extends Component {
  constructor() {
    super();

    this.state = {
      step: 0
    };

    this.firstMenuRoute;
    this.maxSteps = 3;

    this.makeProgress = this.makeProgress.bind(this);
    this.loadResources = this.loadResources.bind(this);
  }

  static navigationOptions = {
    header: null
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
    const {unlockMenu, getInterfaceDashboard, getSchemas, getData, navigation, isReceived, interfaces} = this.props;
    if (isReceived) {
      navigation.dispatch(
        NavigationActions.reset({
          index: 0,
          actions: [
            NavigationActions.navigate({
              routeName: interfaces[0].route,
              params: interfaces[0].params
            })
          ]
        })
      );

      return false;
    }

    this.setState({
      step: 0
    });

    const that = this;
    getInterfaceDashboard()
      .then(({_, interfaces}) => {
        that.firstMenuRoute = interfaces[0];
        this.makeProgress();
        return Promise.all([
          getSchemas(),
          interfaces
        ]);
      })
      .then(([schema, interfaces]) => {
        this.makeProgress();

        return getData(schema, interfaces);
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
                routeName: that.firstMenuRoute.route,
                params: that.firstMenuRoute.params
              })
            ]
          })
        );
      })
      .catch((e) => {
        logger.error('errorInResourceLoading', e);
        Promise.all([
          removeStorageItem('token'),
          removeStorageItem('userRecordId'),
          removeStorageItem('attempts')
        ]).then(() => {
          navigation.dispatch(
            NavigationActions.reset({
              index: 0,
              actions: [
                NavigationActions.navigate({
                  routeName: 'Auth'
                })
              ]
            })
          );
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
  getInterfaceDashboard: PropTypes.func.isRequired,
  getSchemas: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  isReceived: PropTypes.bool.isRequired
};

export default ResourceLoadingView;
