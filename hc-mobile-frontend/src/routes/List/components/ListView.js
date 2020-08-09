import React, {Component, PropTypes} from 'react';
import {
  View,
  Text as ReactText,
  TouchableHighlight,
  Alert,
  Dimensions,
  ListView
} from 'react-native';
import {
  Container,
  Content,
  Header,
  Item,
  Text,
  Button,
  Icon,
  Toast,
  ListItem,
  Grid,
  Col,
  Input
} from 'native-base';
import SGListView from 'react-native-sglistview'; // Using ListView for now. SGListView has issues: HC-752
import {View as AnimatableView} from 'react-native-animatable';
import Modal from 'react-native-simple-modal';
import Menu, {MenuContext, MenuOptions, MenuOption, MenuTrigger} from 'react-native-menu';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Loader from '../../../components/Loader';
import ListItemView from './ListItem';
import RecordView from './RecordView';
import {getInterfaceByPath} from '../../../helpers/parsers';
import styles from './ListViewStyles';

class ListScreenView extends Component {
  constructor() {
    super();

    this.state = {
      loaded: false,
      modalItemId: null,
      columnsInItemHeader: 1,
      sort: null,
      searchQuery: ''
    };

    this.ds = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2
    });
    this.loadingTimer = 0;

    this._updateScreen = this._updateScreen.bind(this);
    this.setSearchQuery = this.setSearchQuery.bind(this);
    this.updateCountColumnsInItemHeader = this.updateCountColumnsInItemHeader.bind(this);
    this.getFieldValueByFieldData = this.getFieldValueByFieldData.bind(this);
    this.generateData = this.generateData.bind(this);
    this.changeSort = this.changeSort.bind(this);
    this.addRow = this.addRow.bind(this);
    this.editRow = this.editRow.bind(this);
    this.delete = this.delete.bind(this);
    this.deleteRow = this.deleteRow.bind(this);
    this._renderGridHeader = this._renderGridHeader.bind(this);
    this._openMenuItemModal = this._openMenuItemModal.bind(this);
    this._closeMenuItemModal = this._closeMenuItemModal.bind(this);
  }

  static navigationOptions = {
    title: ({state}) => state.params.title,
    header: ({state}, defaultHeader) => ({
      ...defaultHeader,
      right: typeof state.params.addRow === 'function' ?
        (
          <Button
            onPress={() => state.params.addRow()}
            transparent
          >
            <Icon
              name='add'
            />
          </Button>
        ) : null
    })
  };

  componentDidMount() {
    this._updateScreen();
    this.updateCountColumnsInItemHeader();
  }

  componentWillUnmount() {
    clearTimeout(this.loadingTimer);
    this.loadingTimer = 0;
  }

  componentWillReceiveProps(newProps) {
    const currentPath = this.props.navigation.state.params.currentPath;
    const nextPath = newProps.navigation.state.params.currentPath;

    if (currentPath !== nextPath) {
      this._updateScreen(newProps);
    }
  }

  _updateScreen(newProps = null) {
    const {loaded} = this.state;
    const {navigation, interfaces, fields, data} = newProps || this.props;
    const {currentPath} = navigation.state.params;

    const currentInterface = getInterfaceByPath(interfaces, currentPath);
    const currentFieldsSchema = fields[currentPath] || {};
    const currentData = data[currentPath] || {};

    navigation.setParams({
      title: currentInterface ? currentInterface.name : 'Interface not found',
      addRow: !currentFieldsSchema.singleRecord &&
      (!currentData ||
        !currentData.items ||
        !currentData.items.length)
        ? () => this.addRow()
        : null
    });

    // Trigger this automatically! Or Add big button on the page to add data
    //if(!currentData.items || !currentData.items.length) {
    //    this.addRow();
    //}


    this.setState({
      sort: currentFieldsSchema.sort,
      searchQuery: ''
    });

    if (loaded) {
      this.setState({
        loaded: false
      });
    }

    this.loadingTimer = setTimeout(() => {
      this.setState({
        loaded: true
      });
    });
  }

  setSearchQuery(value) {
    this.setState({
      searchQuery: value
    });
  }

  updateCountColumnsInItemHeader() {
    const {navigation, fields} = this.props;
    const {currentPath} = navigation.state.params;

    const currentFieldsSchema = fields[currentPath] || {};

    let columnsInItemHeader = 0;
    let remainingWidth = Dimensions.get('window').width - 40;

    for (let i = 0; i < currentFieldsSchema.order.length; i++) {
      let fieldId = currentFieldsSchema.order[i];
      let currentField = currentFieldsSchema.fields[fieldId];

      if (remainingWidth - currentField.width < 0) {
        break;
      }

      columnsInItemHeader++;

      remainingWidth -= currentField.width;
    }

    this.setState({
      columnsInItemHeader: columnsInItemHeader || 1
    });
  }

  getFieldValueByFieldData(fieldData, value) {
    switch (fieldData.type) {
      case 'Enum':
        return fieldData.enums[value];
      case 'Boolean':
        return value ? 'Yes' : 'No';
      case 'Lookup':
        return value.label;
      case 'Height':
        return value ? `${value[0]}' ${value[1]}"` : null;
      case 'MultiSelect':
        return value && Array.isArray(value) ? value.map(item => fieldData.enums[item]).join(', ') : '';
      default:
        return value;
    }
  }

  generateData(currentFieldsSchema, currentData) {
    const {sort, searchQuery} = this.state;

    let recordList = [];

    for (let recordId in currentData) {
      if (currentData.hasOwnProperty(recordId)) {
        const record = currentData[recordId];
        const fields = {};

        for (let i = 0; i < currentFieldsSchema.order.length; i++) {
          const fieldId = currentFieldsSchema.order[i];
          const fieldSchema = currentFieldsSchema.fields[fieldId];
          const fieldValue = record[fieldId];

          if (fieldSchema.type === 'Object') {
            for (let subFieldId in fieldSchema.fields) {
              if (fieldSchema.fields.hasOwnProperty(subFieldId)) {
                const subFieldSchema = fieldSchema.fields[subFieldId];

                fields[subFieldId] = {
                  name: subFieldSchema.name,
                  type: subFieldSchema.type,
                  value: this.getFieldValueByFieldData(
                    subFieldSchema,
                    fieldValue
                      ? fieldValue[subFieldId]
                      : null
                  ) || '-',
                  width: subFieldSchema.width,
                  searchable: fieldSchema.searchable
                };
              }
            }
          } else {
            fields[fieldId] = {
              name: fieldSchema.name,
              type: fieldSchema.type,
              value: this.getFieldValueByFieldData(fieldSchema, fieldValue) || '-',
              width: fieldSchema.width,
              searchable: fieldSchema.searchable
            };
          }
        }

        recordList.push({
          id: recordId,
          fields: fields
        });
      }
    }

    if (searchQuery.length) {
      const searchQueryLower = searchQuery.toLowerCase();

      recordList = recordList.filter(record => (
        Object.keys(record.fields).some(fieldId => {
          const currentField = record.fields[fieldId];

          return currentField.searchable && currentField.value.toLowerCase().indexOf(searchQueryLower) > -1;
        })
      ));
    }

    if (sort) {
      recordList = recordList.sort((itemA, itemB) => {
        const sortFieldItemA = itemA.fields[sort.fieldId];
        const sortFieldItemB = itemB.fields[sort.fieldId];
        let sortFieldValueItemA = sortFieldItemA.value;
        let sortFieldValueItemB = sortFieldItemB.value;

        if (sortFieldItemA.type === 'Date') {
          sortFieldValueItemA = new Date(sortFieldValueItemA);
          sortFieldValueItemB = new Date(sortFieldValueItemB);
        }
        if (sortFieldItemA.type === 'MultiSelect') {
          sortFieldValueItemA = sortFieldValueItemA ? sortFieldValueItemA.join(', ') : null;
          sortFieldValueItemB = sortFieldValueItemB ? sortFieldValueItemB.join(', ') : null;
        }

        if (!sort.direction) {
          if (sortFieldValueItemA > sortFieldValueItemB) {
            return 1;
          } else if (sortFieldValueItemA < sortFieldValueItemB) {
            return -1;
          } else {
            return 0;
          }
        } else {
          if (sortFieldValueItemA < sortFieldValueItemB) {
            return 1;
          } else if (sortFieldValueItemA > sortFieldValueItemB) {
            return -1;
          } else {
            return 0;
          }
        }
      });
    }

    const resultRecords = [];

    recordList.forEach(record => {
      const resultFields = [];

      currentFieldsSchema.order.forEach(fieldId => {
        resultFields.push({
          id: fieldId,
          ...record.fields[fieldId]
        });
      });

      resultRecords.push({
        id: record.id,
        fields: resultFields
      });
    });

    return resultRecords;
  }

  changeSort(fieldId, direction = 0) {
    const {sort} = this.state;
    const currentSort = sort ? sort.fieldId : null;
    const finalDirection = !!(currentSort === fieldId ? !sort.direction : direction);

    this.setState({
      sort: {
        fieldId,
        direction: finalDirection
      }
    });
  }

  addRow() {
    const {navigation} = this.props;
    const {currentPath} = navigation.state.params;

    navigation.navigate('Edit', {
      currentPath: currentPath
    });
  }

  editRow(itemId) {
    const {navigation} = this.props;
    const {currentPath} = navigation.state.params;

    this._closeMenuItemModal();

    navigation.navigate('Edit', {
      currentPath: currentPath,
      currentItemId: itemId
    });
  }

  delete(itemId) {
    const {deleteData, getDashboard, data, navigation} = this.props;
    const {currentPath} = navigation.state.params;

    const currentData = data[currentPath];

    deleteData(currentData.fullPath, currentPath, itemId)
      .then(() => {
        getDashboard();
        Toast.show({
          type: 'success',
          text: 'Item has been successfully removed',
          position: 'bottom',
          buttonText: 'Okay'
        });
      })
      .catch(({message}) => {
        /*  the error is already displayed in a standart alert dialog
         Toast.show({
         type: 'danger',
         text: `Error: ${message}`,
         position: 'bottom',
         buttonText: 'Close'
         });
         */
      });
  }

  deleteRow(itemId) {
    this._closeMenuItemModal();

    Alert.alert(
      'Deleting item',
      'Are you sure?',
      [
        {
          text: 'Cancel'
        },
        {
          text: 'OK',
          onPress: () => {
            this.delete(itemId);
          }
        }
      ],
      {
        cancelable: false
      }
    );
  }

  _renderGridHeader(currentFieldsSchema) {
    const {columnsInItemHeader, sort} = this.state;

    return (
      <ListItem
        style={styles.gridHeader}
      >
        <Grid>
          {
            currentFieldsSchema.order.slice(0, columnsInItemHeader).map((currentFieldId, key) => {
              const currentField = currentFieldsSchema.fields[currentFieldId];

              return (
                <Col
                  key={key}
                  style={[styles.column, styles.columnHeader, key + 1 >= columnsInItemHeader ? styles.columnLast : {
                    flex: 0,
                    width: currentField.width
                  }]}
                >
                  <TouchableHighlight
                    underlayColor='#eee'
                    onPress={() => this.changeSort(currentFieldId)}
                  >
                    <View
                      style={[styles.columnContent, styles.columnContentWithArrow]}
                    >
                      <ReactText
                        style={styles.columnName}
                      >
                        {currentField.name}
                      </ReactText>
                      {
                        sort && sort.fieldId === currentFieldId ?
                          <Icon
                            style={styles.arrowIcon}
                            name={sort.direction ? 'ios-arrow-up' : 'ios-arrow-down'}
                          />
                          : null
                      }
                    </View>
                  </TouchableHighlight>
                </Col>
              )
            })
          }
        </Grid>
      </ListItem>
    );
  }

  _openMenuItemModal(section) {
    const {navigation, fields} = this.props;
    const {currentPath} = navigation.state.params;

    const currentFieldsSchema = fields[currentPath] || {};

    if (currentFieldsSchema.singleRecord) {
      this.editRow(section.id);

      return false;
    }

    this.setState({
      modalItemId: section.id
    });
  }

  _closeMenuItemModal() {
    this.setState({
      modalItemId: null
    });
  }

  render() {
    const {navigation, isDeleting, fields, data, interfaces} = this.props;
    const {loaded, modalItemId, columnsInItemHeader, sort, searchQuery} = this.state;
    const {currentPath, selectedItemId} = navigation.state.params;

    const currentInterface = getInterfaceByPath(interfaces, currentPath);
    const currentFieldsSchema = fields[currentPath] || {};
    const currentData = data[currentPath] || {};
    const recordsLength = Object.keys(currentData);

    if (!currentInterface) {
      return (
        <Container>
          <Content>
            <Text
              style={{textAlign: 'center', margin: 30}}
            >
              Interface not found
            </Text>
          </Content>
        </Container>
      );
    }

    if (!loaded) {
      return (
        <Container>
          <Content
            contentContainerStyle={styles.content}
          >
            <Loader
              isShowed={true}
            />
          </Content>
        </Container>
      );
    }

    if (!recordsLength.length) {
      return (
        <Container>
          <Content
            contentContainerStyle={styles.content}
          >
            {
              !currentFieldsSchema.singleRecord ?
                <View
                  style={styles.emptyContainer}
                >
                  <ReactText
                    style={styles.emptyText}
                  >
                    No Records
                  </ReactText>
                </View>
                :
                <View
                  style={styles.emptyContainer}
                >
                  <Button
                    style={{alignSelf: 'center'}}
                    onPress={() => this.addRow()}
                  >
                    <Text>Provide Information</Text>
                  </Button>
                </View>
            }
          </Content>
        </Container>
      );
    }

    const items = this.generateData(currentFieldsSchema, currentData.items);
    const dataSource = this.ds.cloneWithRows(items);

    return (
      <MenuContext style={styles.menuContext}>
        <Container>
          {
            !currentFieldsSchema.singleRecord ?
              <Header
                searchBar
                rounded
                secondHeader
              >
                <Item>
                  <Icon
                    name='search'
                  />
                  <Input
                    placeholder='Search'
                    value={searchQuery}
                    onChangeText={value => this.setSearchQuery(value)}
                  />
                  {
                    searchQuery && searchQuery.length ?
                      <Button
                        onPress={() => this.setSearchQuery('')}
                        transparent
                        style={styles.searchCloseBtn}
                      >
                        <Icon
                          name='close-circle'
                          active
                          style={styles.searchCloseIcon}
                        />
                      </Button>
                      : null
                  }
                </Item>
                <Menu onSelect={value => this.changeSort(value)}>
                  <MenuTrigger
                    style={styles.menuTrigger}
                  >
                    <MaterialCommunityIcon
                      name='sort'
                      style={styles.sortIcon}
                    />
                  </MenuTrigger>
                  <MenuOptions
                    optionsContainerStyle={styles.menuOptions}
                  >
                    {
                      currentFieldsSchema.order.map((currentFieldId, key) => {
                        const currentField = currentFieldsSchema.fields[currentFieldId];

                        return (
                          <MenuOption
                            key={key}
                            value={currentFieldId}
                          >
                            <ReactText
                              style={styles.menuOptionText}
                            >
                              {currentField.name}
                            </ReactText>
                            {
                              sort && sort.fieldId === currentFieldId ?
                                <Icon
                                  style={styles.menuOptionArrowIcon}
                                  name={sort.direction ? 'ios-arrow-up' : 'ios-arrow-down'}
                                />
                                : null
                            }
                          </MenuOption>
                        );
                      })
                    }
                  </MenuOptions>
                </Menu>
              </Header>
              : null
          }
          <AnimatableView
            animation='fadeIn'
            duration={500}
            style={styles.container}
          >
            {
              !currentFieldsSchema.singleRecord ?
                this._renderGridHeader(currentFieldsSchema)
                : null
            }
            <Content
              onLayout={() => this.updateCountColumnsInItemHeader()}
            >
              {
                currentFieldsSchema.singleRecord ?
                  <RecordView
                    openMenuCurrentItemModal={() => this._openMenuItemModal(items[0])}
                    section={items[0]}
                  /> :
                  <ListView
                    dataSource={dataSource}
                    renderRow={section =>
                      <ListItemView
                        section={section}
                        selectedItemId={selectedItemId}
                        columnsInItemHeader={columnsInItemHeader}
                        openMenuCurrentItemModal={() => this._openMenuItemModal(section)}
                      />
                    }
                    initialListSize={20}
                    pageSize={10}
                    scrollRenderAheadDistance={50}
                    stickyHeaderIndices={[]}
                    onEndReachedThreshold={1}
                    removeClippedSubviews={true}
                  />
              }
            </Content>
            <Loader
              isShowed={isDeleting}
            />
          </AnimatableView>
          <Modal
            ref='itemMenuModal'
            open={!!modalItemId}
            modalDidClose={() => this._closeMenuItemModal()}
            modalStyle={styles.modal}
            overlayBackground='rgba(0, 0, 0, 0.4)'
          >
            <View>
              <Button
                block
                info
                onPress={() => this.editRow(modalItemId)}
              >
                <Text>Edit</Text>
              </Button>
              <Button
                block
                danger
                style={{marginTop: 5}}
                onPress={() => this.deleteRow(modalItemId)}
              >
                <Text>Delete</Text>
              </Button>
            </View>
          </Modal>
        </Container>
      </MenuContext>
    );
  }
}

ListScreenView.propTypes = {
  deleteData: PropTypes.func.isRequired,
  fields: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired,
  interfaces: PropTypes.array.isRequired,
  isDeleting: PropTypes.bool.isRequired,
  isDeleted: PropTypes.bool.isRequired
};

export default ListScreenView;
