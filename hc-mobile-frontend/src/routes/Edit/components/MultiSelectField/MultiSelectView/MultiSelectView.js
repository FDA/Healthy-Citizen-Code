import React, {Component, PropTypes} from 'react';
import {
  Button
} from 'react-native';
import {
  Container,
  Content,
  Body,
  ListItem,
  Text,
  CheckBox
} from 'native-base';
import {CardStack} from 'react-navigation';

const {BackButton} = CardStack.Header;

class MultiSelectView extends Component {
  constructor(props) {
    super(props);

    const {enums, value} = props.navigation.state.params;
    const map = {};
    const list = [];
    if (enums) {
      for (let id in enums) {
        if (enums.hasOwnProperty(id)) {
          map[id] = list.push({
              id: id,
              label: enums[id],
              checked: value && value.indexOf(id) > -1
            }) - 1;
        }
      }
    }

    this.state = {
      loaded: false,
      map,
      list
    };

    this.selectItem = this.selectItem.bind(this);
    this.goBack = this.goBack.bind(this);
    this.saveChanges = this.saveChanges.bind(this);
  }

  static navigationOptions = {
    title: ({state}) => 'Select' + state.params && state.params.title ? ' ' + state.params.title : '',
    header: ({state}) => ({
      left: <BackButton onPress={() => state.params.goBack()}/>,
      right: (
        <Button
          title='Done'
          onPress={() => state.params.save()}
        />
      )
    })
  };

  componentDidMount() {
    const {navigation} = this.props;
    const {fieldName} = navigation.state.params;

    navigation.setParams({
      title: fieldName,
      save: this.saveChanges,
      goBack: this.goBack
    });

    this.setState({
      loaded: true
    });
  }

  selectItem(data) {
    const {map, list} = this.state;
    const updatedList = list.slice(0);
    const currentItem = updatedList[map[data.id]];
    currentItem.checked = !currentItem.checked;

    this.setState({
      list: updatedList
    });
  }

  goBack() {
    const {navigation} = this.props;

    navigation.goBack();
  }

  saveChanges() {
    const {list} = this.state;
    const {navigation} = this.props;
    const {fieldId, onChangeValue} = navigation.state.params;
    const value = list.filter(item => item.checked).map(item => item.id);

    onChangeValue(fieldId, value);

    this.goBack();
  }

  render() {
    const {loaded, list} = this.state;

    return (
      <Container>
        <Content>
          {
            loaded ?
              list.map((item, key) => (
                <ListItem
                  key={key}
                  onPress={() => this.selectItem(item)}
                >
                  <CheckBox
                    checked={item.checked}
                    onPress={() => this.selectItem(item)}
                  />
                  <Body>
                  <Text>
                    {item.label}
                  </Text>
                  </Body>
                </ListItem>
              )) :
              null
          }
        </Content>
      </Container>
    );
  }
}

MultiSelectView.propTypes = {
  navigation: PropTypes.object.isRequired
};

export default MultiSelectView;