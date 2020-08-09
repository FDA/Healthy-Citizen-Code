import React, {Component, PropTypes} from 'react';
import {
  Container,
  Content,
  Header,
  Left,
  Body,
  Right,
  Item,
  Icon,
  Button,
  Input,
  List,
  ListItem,
  Text,
  Spinner
} from 'native-base';
import InfiniteScrollView from 'react-native-infinite-scroll-view';
import Loader from '../../../../../components/Loader';
import lookupAPI from '../../../../../api/lookup';
import styles from './LookupViewStyles';

class LookupView extends Component {
  constructor() {
    super();

    this.state = {
      lastQuery: '',
      query: '',
      list: [],
      firstLoading: false,
      subLoading: false,
      currentPage: 0,
      loadMore: true
    };

    this.timer = 0;
    this.timeoutBeforeSearch = 1500;

    this.updateValue = this.updateValue.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.findLookup = this.findLookup.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this._renderListRow = this._renderListRow.bind(this);
  }

  static navigationOptions = {
    header: {
      visible: false
    }
  };

  componentDidMount() {
    const {navigation} = this.props;
    const {value} = navigation.state.params;

    if (
      value &&
      typeof value.label === 'string' &&
      value.label.length
    ) {
      this.setState({
        query: value.label
      });

      setTimeout(() => this.findLookup());
    }
  }

  componentWillUnmount() {
    this.startTimer(true);
  }

  updateValue(text) {
    this.setState({
      query: text
    });

    this.startTimer();
  }

  startTimer(stop = false) {
    clearTimeout(this.timer);
    this.timer = 0;

    if (!stop) {
      this.timer = setTimeout(() => this.findLookup(), this.timeoutBeforeSearch);
    }
  }

  findLookup(newSearch = true) {
    this.startTimer(true);

    const {navigation} = this.props;
    const {lookupId} = navigation.state.params;
    const {lastQuery, query, firstLoading, subLoading} = this.state;
    let {currentPage, list} = this.state;

    if (firstLoading || subLoading || (newSearch && lastQuery === query)) {
      return false;
    }

    if (!query.length) {
      this.setState({
        list: []
      });

      return false;
    }

    if (newSearch) {
      currentPage = 0;
    }

    this.setState({
      firstLoading: newSearch,
      subLoading: !newSearch,
      lastQuery: query,
      currentPage: currentPage
    });

    lookupAPI.findQuery(lookupId, query, currentPage + 1)
      .then((response) => {
        const results = response.data.filter((item) => (
          item.label && item.label.trim().length
        ));

        this.setState({
          firstLoading: false,
          subLoading: false,
          list: list.concat(results),
          currentPage: currentPage + 1,
          loadMore: !!response.more
        });
      });
  }

  selectItem(data) {
    const {navigation} = this.props;
    const {fieldId, onChangeValue} = navigation.state.params;

    onChangeValue(fieldId, data);

    navigation.goBack();
  }

  _renderListRow(data) {
    return (
      <ListItem
        onPress={() => this.selectItem(data)}
      >
        <Body>
        <Text>
          {data.label}
        </Text>
        </Body>
        <Right>
          <Icon name='arrow-forward'/>
        </Right>
      </ListItem>
    );
  }

  render() {
    const {navigation} = this.props;
    const {list, firstLoading, subLoading, loadMore} = this.state;
    const {value} = navigation.state.params;

    return (
      <Container>
        <Header searchBar rounded>
          <Left icon>
            <Button
              onPress={() => navigation.goBack()}
              transparent
            >
              <Icon name='arrow-back'/>
            </Button>
          </Left>
          <Item>
            <Icon name='search'/>
            <Input
              ref='searchInput'
              autoCapitalize='none'
              autoCorrect={false}
              autoFocus={true}
              blurOnSubmit={true}
              placeholder='Search'
              onChangeText={(text) => this.updateValue(text)}
              defaultValue={value ? value.label : null}
              onSubmitEditing={() => this.findLookup()}
              returnKeyType='search'
              editable={!firstLoading || !subLoading}
            />
          </Item>
        </Header>
        <Content
          contentContainerStyle={{flex: 1}}
        >
          <List
            dataArray={list}
            renderRow={(data) => this._renderListRow(data)}
            renderScrollComponent={props => <InfiniteScrollView {...props} />}
            canLoadMore={loadMore}
            onLoadMoreAsync={() => this.findLookup(false)}
          />
          {
            subLoading ?
              <Spinner
                color='blue'
                style={styles.subLoader}
              />
              : null
          }
          <Loader
            isShowed={firstLoading}
          />
        </Content>
      </Container>
    );
  }
}

LookupView.propTypes = {
  navigation: PropTypes.object.isRequired
};

export default LookupView;