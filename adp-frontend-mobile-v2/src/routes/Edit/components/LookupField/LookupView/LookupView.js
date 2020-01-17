import React, {Component} from 'react';
import PropTypes from 'prop-types';
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
  View,
  CheckBox,
  Text,
  Spinner
} from 'native-base';
import InfiniteScrollView from 'react-native-infinite-scroll-view';
import Loader from '../../../../../components/Loader';
import lookupAPI from '../../../../../api/lookup';
import _ from 'lodash';
import styles from './LookupViewStyles';

class LookupView extends Component {
  constructor() {
    super();

    this.state = {
      lastQuery: null,
      query: '',
      list: [],
      firstLoading: false,
      subLoading: false,
      currentPage: 0,
      loadMore: true,
      selectedItems: {}
    };

    this.timer = 0;
    this.timeoutBeforeSearch = 500;

    this.updateValue = this.updateValue.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.findLookup = this.findLookup.bind(this);
    this.selectSingleItem = this.selectSingleItem.bind(this);
    this.submitMultipleItems = this.submitMultipleItems.bind(this);
    this.toggleOneOfMultipleItems = this.toggleOneOfMultipleItems.bind(this);
    this._renderListRow = this._renderListRow.bind(this);
    this._renderSelectedItem = this._renderSelectedItem.bind(this);
  }

  static navigationOptions = {
    header: null
  };

  componentDidMount() {
    const {navigation} = this.props;
    const {value} = navigation.state.params;

    if (value && typeof value.label === 'string') {
      this.setState({query: value.label});
    } else {
      this.setState({query: ''});
    }
    setTimeout(() => this.findLookup());
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

    // if (!query.length) {
    //   this.setState({
    //     list: []
    //   });
    //
    //   return false;
    // }

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
          list: newSearch ? results : list.concat(results),
          currentPage: currentPage + 1,
          loadMore: !!response.more
        });
      });
  }

  submitMultipleItems() {
    const {navigation} = this.props;
    const {fieldId, onChangeValue} = navigation.state.params;

    onChangeValue(fieldId, _.values(this.state.selectedItems));

    navigation.goBack();
  }

  toggleOneOfMultipleItems(rowData, rowId) {
    this.setState(prevState => {
      const isSelected = !!prevState.selectedItems[rowData.id];
      const newList = _.cloneDeep(prevState.list);
      rowId = rowId ? rowId : newList.findIndex(r => r.id === rowData.id);
      const newSelectedItems = _.cloneDeep(prevState.selectedItems);

      // invert isSelected
      if (rowId !== -1) {
        newList[rowId].isSelected = !newList[rowId].isSelected;
      }
      if (isSelected) {
        delete newSelectedItems[rowData.id];
      } else {
        newSelectedItems[rowData.id] = rowData
      }
      return {list: newList, selectedItems: newSelectedItems};
    });
  }

  selectSingleItem(rowData) {
    const {navigation} = this.props;
    const {fieldId, onChangeValue} = navigation.state.params;

    onChangeValue(fieldId, rowData);

    navigation.goBack();
  }

  _renderSelectedItem(selectedItem) {
    return (
      <ListItem
        onPress={() => this.toggleOneOfMultipleItems(selectedItem)}
      >
        <Button
          onPress={() => this.toggleOneOfMultipleItems(selectedItem)}
          iconRight
          light
        >
          <Text>{selectedItem.label}</Text>
          <Icon name='close-circle'/>
        </Button>
      </ListItem>
    );
  }

  _renderListRow(rowData, sectionId, rowId) {
    const {isMultiple} = this.props.navigation.state.params;
    const {list, selectedItems} = this.state;
    const isSelected = !!selectedItems[rowData.id];

    if (isMultiple) {
      return (
        <ListItem
          onPress={() => this.toggleOneOfMultipleItems(rowData, rowId)}
        >
          <Body>
          <Text>
            {rowData.label}
          </Text>
          </Body>
          <Right>
            <CheckBox
              onPress={() => this.toggleOneOfMultipleItems(rowData, rowId)}
              checked={isSelected}
            />
          </Right>
        </ListItem>
      );
    }
    return (
      <ListItem
        onPress={() => this.selectSingleItem(rowData)}
      >
        <Body>
        <Text>
          {rowData.label}
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
    const {list, firstLoading, subLoading, loadMore, selectedItems} = this.state;
    const {value, isMultiple, placeholder} = navigation.state.params;

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
              placeholder={placeholder || 'Search'}
              onChangeText={(text) => this.updateValue(text)}
              defaultValue={value ? value.label : null}
              onSubmitEditing={() => this.findLookup()}
              returnKeyType='search'
              editable={!firstLoading || !subLoading}
            />
          </Item>
        </Header>
        <Content
          contentContainerStyle={{flex: 1}} keyboardShouldPersistTaps='always'
        >
          <View
            keyboardShouldPersistTaps='always'
            style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start'}}
          >
            {
              _.values(selectedItems).map((selectedItem) => (
                <View key={selectedItem.id}>
                  <Button
                    onPress={() => this.toggleOneOfMultipleItems(selectedItem)}
                    iconRight
                    // light
                    bordered
                  >
                    <Text>{selectedItem.label}</Text>
                    <Icon name='close-circle'/>
                  </Button>
                </View>
              ))
            }
          </View>
          {
            isMultiple && _.values(selectedItems).length > 0 ?
              <View
                style={{flexDirection: 'row', justifyContent: 'center'}}
              >
                <Button
                  style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}
                  onPress={() => this.submitMultipleItems()}
                >
                  <Text>Submit</Text>
                </Button>
              </View> :
              null
          }
          {/*<List*/}
          {/*style={{flexDirection: 'row'}}*/}
          {/*horizontal={true}*/}
          {/*dataArray={_.values(selectedItems)}*/}
          {/*renderRow={(data) => this._renderSelectedItem(data)}*/}
          {/*/>*/}

          <View
            style={{borderWidth: 1}}
          >
            <List
              keyboardShouldPersistTaps='always'
              dataArray={list}
              renderRow={this._renderListRow}
              renderScrollComponent={props => <InfiniteScrollView {...props} />}
              canLoadMore={loadMore}
              onLoadMoreAsync={() => this.findLookup(false)}
            />
          </View>
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
