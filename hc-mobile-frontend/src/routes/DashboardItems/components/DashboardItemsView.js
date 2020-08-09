import React, {Component, PropTypes} from 'react';
import {
  View,
  Text,
  Image,
  TouchableHighlight,
  ScrollView,
  Dimensions
} from 'react-native';
import {
  Container,
  Content,
  Footer,
  Button,
  Icon,
  Grid,
  Col
} from 'native-base';
import {View as AnimatableView} from 'react-native-animatable';
import Triangle from 'react-native-triangle';
import Swiper from 'react-native-swiper';
import Loader from '../../../components/Loader';
import {array_chunk} from '../../../helpers/funcs';
import {getAbsoluteUrl} from '../../../helpers/fetch';
import {PORTRAIT} from '../../../redux/reducers/orientation';
import TemplateGenerator from './TemplateGenerator';
import styles from './DashboardItemsViewStyles';

class DashboardItemsView extends Component {
  constructor() {
    super();

    this.state = {
      loaded: false,
      width: 0,
      contentIndex: 0,
      buttonsIndex: 0
    };

    this.contentScrollViews = {};
    this.loadingTimer = 0;

    this._onMomentumContentScrollEnd = this._onMomentumContentScrollEnd.bind(this);
    this._onMomentumButtonsScrollEnd = this._onMomentumButtonsScrollEnd.bind(this);
    this.getButtonsGroupLength = this.getButtonsGroupLength.bind(this);
    this.moveToSlide = this.moveToSlide.bind(this);
    this.goBack = this.goBack.bind(this);
    this.goTo = this.goTo.bind(this);
  }

  static navigationOptions = {
    title: ({state}) => state.params.title || 'Dashboard',
    header: ({state}, defaultHeader) => ({
      ...defaultHeader,
      right: typeof state.params.goToEditScreen === 'function' ? (
          <Button
            onPress={() => state.params.goToEditScreen()}
            transparent
          >
            <Icon name='add'/>
          </Button>
        ) : null
    })
  };

  componentWillMount() {
    const {navigation, dashboard} = this.props;

    const dashboardButtonsGroupLength = this.getButtonsGroupLength();
    const width = Dimensions.get('window').width;
    const contentIndex = this.props.navigation.state.params.contentIndex || 0;
    const buttonsIndex = Math.floor(contentIndex / dashboardButtonsGroupLength);

    navigation.setParams({
      title: dashboard[contentIndex].fullName,
      goToEditScreen: () => {
        this.goTo(dashboard[this.state.contentIndex].path, 'edit');
      }
    });

    this.setState({
      width,
      contentIndex,
      buttonsIndex
    });
  }

  componentDidMount() {
    this.loadingTimer = setTimeout(() => {
      this.setState({
        loaded: true
      });
    });
  }

  componentWillReceiveProps(newProps) {
    const {orientation} = this.props;
    const {contentIndex} = this.state;
    const newOrientation = newProps.orientation;

    if (newOrientation !== orientation) {
      this.setState({
        width: Dimensions.get('window').width
      });

      setTimeout(() => {
        this._onMomentumContentScrollEnd(contentIndex, true);
      });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.loadingTimer);
    this.loadingTimer = 0;
  }

  getButtonsGroupLength() {
    const {orientation} = this.props;

    return orientation === PORTRAIT ? 4 : 8;
  }

  _onMomentumContentScrollEnd(newIndex, withoutAnimation) {
    const {swiperButtons} = this.refs;
    const {navigation, dashboard} = this.props;
    const {buttonsIndex} = this.state;
    const dashboardButtonsGroupLength = this.getButtonsGroupLength();

    const nextButtonsGroupIndex = Math.floor(newIndex / dashboardButtonsGroupLength);

    if (buttonsIndex !== nextButtonsGroupIndex) {
      swiperButtons.scrollBy(nextButtonsGroupIndex - buttonsIndex, !withoutAnimation);
    }

    navigation.setParams({
      title: dashboard[newIndex].fullName
    });

    this.setState({
      contentIndex: newIndex,
      buttonsIndex: nextButtonsGroupIndex
    });
  }

  _onMomentumButtonsScrollEnd(newIndex) {
    this.setState({
      buttonsIndex: newIndex
    });
  }

  moveToSlide(newIndex) {
    const {swiperContent} = this.refs;
    const {contentIndex} = this.state;
    const offset = newIndex - contentIndex;

    if (!offset) {
      return false;
    }

    swiperContent.scrollBy(offset, true);

    this.setState({
      contentIndex: newIndex
    });
  }

  goBack() {
    const {navigation} = this.props;

    navigation.goBack();
  }

  goTo(path, type = 'list') {
    const {navigation} = this.props;

    navigation.navigate(type === 'list' ? 'List' : 'Edit', {
      currentPath: path
    });
  }

  render() {
    const {dashboard} = this.props;
    const {loaded, contentIndex, buttonsIndex, width} = this.state;

    const dashboardButtonsGroupLength = this.getButtonsGroupLength();
    const dashboardButtons = array_chunk(dashboard.map((item, index) => ({
      index: index,
      fullName: item.fullName,
      shortName: item.shortName || null,
      color: item.color,
      icon: item.icon
    })), dashboardButtonsGroupLength);
    const isBottomsArrowShowed = Math.floor(contentIndex / dashboardButtonsGroupLength) === buttonsIndex;

    if (!loaded) {
      return (
        <View style={{backgroundColor: '#fff', flex: 1}}>
          <Loader
            isShowed={true}
          />
        </View>
      );
    }

    return (
      <AnimatableView
        animation='fadeIn'
        duration={500}
        style={styles.container}
      >
        <Container>
          <Content
            scrollEnabled={false}
            contentContainerStyle={styles.content}
          >
            <Swiper
              ref='swiperContent'
              index={contentIndex}
              loop={false}
              showsButtons={false}
              showsPagination={false}
              width={width}
              containerStyle={styles.swiperContainerStyle}
              pageStyle={styles.swiperSlideStyle}
              pageStyleLoading={styles.swiperLoadingSlideStyle}
              onMomentumScrollEnd={(e, state) => this._onMomentumContentScrollEnd(state.index)}
            >
              {
                dashboard.map((item, key) => (
                  <View
                    key={key}
                    style={styles.tileContainer}
                  >
                    <View
                      style={[styles.tileContent, {borderColor: item.color}]}
                    >
                      <ScrollView
                        ref={(ref) => {this.contentScrollViews[item.id] = ref;}}
                        onContentSizeChange={() => this.contentScrollViews[item.id].scrollTo({y: 0, animated: false})}
                        style={styles.tileScrollView}
                      >
                        <TemplateGenerator
                          item={item}
                          template={item.template}
                          data={item.data}
                        />
                      </ScrollView>
                      <TouchableHighlight
                        style={[styles.tileFooter, {backgroundColor: item.color}]}
                        onPress={() => this.goTo(item.path, 'list')}
                      >
                        <Text
                          style={styles.tileFooterBtn}
                        >
                          VIEW ALL
                        </Text>
                      </TouchableHighlight>
                    </View>
                    {
                      isBottomsArrowShowed ?
                        <View
                          style={[styles.tileArrow, {
                            width: width / dashboardButtonsGroupLength,
                            left: (width / dashboardButtonsGroupLength) * (key % dashboardButtonsGroupLength)
                          }]}
                        >
                          <Triangle
                            width={15}
                            height={15}
                            color={item.color}
                            direction='down'
                          />
                        </View>
                        : null
                    }
                  </View>
                ))
              }
            </Swiper>
          </Content>
          <Footer
            style={{
              ...styles.footer,
              height:
              (width - styles.swiperBottomContainerStyle.paddingLeft - styles.swiperBottomContainerStyle.paddingRight)
              / dashboardButtonsGroupLength
            }}
          >
            <Swiper
              ref='swiperButtons'
              index={buttonsIndex}
              loop={false}
              showsButtons={true}
              showsPagination={false}
              width={(width - styles.swiperBottomContainerStyle.paddingLeft - styles.swiperBottomContainerStyle.paddingRight)}
              containerStyle={[styles.swiperContainerStyle, styles.swiperBottomContainerStyle]}
              pageStyle={styles.swiperSlideStyle}
              pageStyleLoading={styles.swiperLoadingSlideStyle}
              buttonWrapperStyle={[styles.swiperButtonWrapperStyle, {width: width}]}
              prevButton={<Triangle width={13} height={15} color='#BBBBBB' direction='left' style={styles.swiperButtonLeft}/>}
              nextButton={<Triangle width={13} height={15} color='#BBBBBB' direction='right' style={styles.swiperButtonRight}/>}
              onMomentumScrollEnd={(e, state) => this._onMomentumButtonsScrollEnd(state.index)}
            >
              {
                dashboardButtons.map((dashboardButtonsGroup, key) => (
                  <Grid
                    key={key}
                    style={styles.bottomButtonGrid}
                  >
                    {
                      dashboardButtonsGroup.map((dashboardButtonsItem, key) => (
                        <Col
                          key={key}
                          style={[styles.bottomButtonColumn, {backgroundColor: dashboardButtonsItem.color}]}
                        >
                          <TouchableHighlight
                            style={styles.bottomButtonLink}
                            onPress={() => this.moveToSlide(dashboardButtonsItem.index)}
                          >
                            <View
                              style={styles.bottomButtonView}
                            >
                              <View
                                style={styles.bottomButtonIconContainer}
                              >
                                <Image
                                  style={styles.bottomButtonIcon}
                                  source={{uri: getAbsoluteUrl(dashboardButtonsItem.icon)}}
                                  resizeMode='contain'
                                />
                              </View>
                              <Text
                                style={styles.bottomButtonTitle}
                              >
                                {(dashboardButtonsItem.shortName || dashboardButtonsItem.fullName).toUpperCase()}
                              </Text>
                            </View>
                          </TouchableHighlight>
                        </Col>
                      ))
                    }
                  </Grid>
                ))
              }
            </Swiper>
          </Footer>
        </Container>
      </AnimatableView>
    );
  }
}

DashboardItemsView.propTypes = {
  orientation: PropTypes.string.isRequired,
  dashboard: PropTypes.array.isRequired
};

export default DashboardItemsView;
