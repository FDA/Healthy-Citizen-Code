import React, {Component, PropTypes} from 'react';
import {
  View,
  Text,
  Image,
  TouchableHighlight
} from 'react-native';
import {
  Container,
  Content,
  Grid,
  Col
} from 'native-base';
import Loader from '../../../components/Loader';
import {PORTRAIT} from '../../../redux/reducers/orientation';
import {array_chunk} from '../../../helpers/funcs';
import {getAbsoluteUrl} from '../../../helpers/fetch';
import styles from './DashboardViewStyles';

class DashboardView extends Component {
  constructor() {
    super();

    this.state = {
      loaded: false
    };

    this.loadingTimer = 0;

    this.goToItem = this.goToItem.bind(this);
  }

  static navigationOptions = {
    title: ({state}) => state.params && state.params.subtitle ? state.params.subtitle : 'Healthy Citizen',
    header: ({state, showMenuButton, toggleMenu}, defaultHeader) => ({
      ...defaultHeader,
      title: (
        <View
          style={styles.headerBody}
        >
          <Text
            style={styles.headerTitle}
          >
            Healthy Citizen
          </Text>
          <Text
            style={styles.headerSubTitle}
          >
            {`Welcome ${state.params && state.params.userName ? state.params.userName : 'User'}`}
          </Text>
        </View>
      )
    })
  };

  componentWillMount() {
    const {navigation, profile} = this.props;

    navigation.setParams({
      userName: profile ? profile.firstName : null
    });
  }

  componentDidMount() {
    this.loadingTimer = setTimeout(() => {
      this.setState({
        loaded: true
      });
    });
  }

  getButtonsGroupLength() {
    const {orientation} = this.props;

    return orientation === PORTRAIT ? 2 : 4;
  }

  goToItem(index) {
    const {navigation} = this.props;

    navigation.navigate('DashboardItems', {
      contentIndex: index
    });
  }

  render() {
    const {dashboard} = this.props;
    const {loaded} = this.state;

    const dashboardButtonsGroupLength = this.getButtonsGroupLength();
    const dashboardButtons = array_chunk(dashboard.map((item, index) => ({
      index: index,
      fullName: item.fullName,
      color: item.color,
      icon: item.icon,
      count: item.count || null
    })), dashboardButtonsGroupLength);

    return (
      <Container
        style={styles.container}
      >
        <Content
          contentContainerStyle={styles.content}
        >
          {
            loaded ?
              dashboardButtons.map((dashboardButtonsGroup, key) => (
                <Grid
                  key={key}
                  style={styles.buttonsGrid}
                >
                  {
                    dashboardButtonsGroup.map((dashboardButtonsItem, key) => (
                      <Col
                        key={key}
                        style={[styles.buttonsColumn, {backgroundColor: dashboardButtonsItem.color}]}
                      >
                        <TouchableHighlight
                          style={styles.buttonLink}
                          onPress={() => this.goToItem(dashboardButtonsItem.index)}
                        >
                          <View
                            style={styles.buttonView}
                          >
                            <Image
                              style={styles.buttonIcon}
                              source={{uri: getAbsoluteUrl(dashboardButtonsItem.icon)}}
                              resizeMode='contain'
                            />
                            {
                              dashboardButtonsItem.count ?
                                <Text
                                  style={styles.buttonCount}
                                >
                                  {dashboardButtonsItem.count}
                                </Text>
                                : null
                            }
                            <Text
                              style={styles.buttonTitle}
                            >
                              {dashboardButtonsItem.fullName.toUpperCase()}
                            </Text>
                          </View>
                        </TouchableHighlight>
                      </Col>
                    ))
                  }
                </Grid>
              )) :
              <Loader
                isShowed={true}
              />
          }
        </Content>
      </Container>
    );
  }
}

DashboardView.propTypes = {
  orientation: PropTypes.string.isRequired,
  profile: PropTypes.object.isRequired,
  dashboard: PropTypes.array.isRequired
};

export default DashboardView;
