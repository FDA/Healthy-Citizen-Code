import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Button
} from 'react-native';
import {
  Container,
  Content
} from 'native-base';
import {HeaderBackButton} from 'react-navigation';
import TCombForm from 'tcomb-form-native';
import Loader from '../../../../components/Loader';
import styles from './FormScreenViewStyles';
import _ from 'lodash';

const Form = TCombForm.form.Form;

class FormScreenView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: false
    };
    this.isFirstGroupsLoad = true;

    this.rerenderFormKey = Math.random();
    this.goBack = this.goBack.bind(this);
    this.toggleGroup = this.toggleGroup.bind(this);
  }

  static navigationOptions = ({navigation, screenProps, navigationOptions}) => ({
    title: screenProps.title,
    headerLeft: <HeaderBackButton onPress={() => navigation.state.params.goBack()}/>,
    headerRight: <Button title='Save' onPress={() => screenProps.save()}/>
  });

  getGroupChildren(formOptions, groupId) {
    const groupItemKeys = [];
    let groupStart = false;
    for (let field in formOptions.fields) {
      if (field === groupId) {
        groupStart = true;
      } else if (groupStart && formOptions.fields[field].type !== 'Group' && formOptions.fields[field].visible !== false) {
        groupItemKeys.push(field);
      } else if (groupStart && formOptions.fields[field].type === 'Group') {
        break;
      }
    }
    return groupItemKeys;
  }

  componentWillReceiveProps(nextProps) {
    // if (!this.isFirstGroupsLoad) {
    //   return;
    // }
    // this.rerenderFormKey = Math.random();

    const toggleGroup = this.toggleGroup;
    const nextFormOptions = nextProps.screenProps.formOptions;
    if (nextFormOptions !== this.props.screenProps.formOptions) {
      let groupOrderNumber = 0;
      _.forEach(nextFormOptions.fields, (group, groupId) => {
        if (group.type === 'Group') {
          group.toggleGroup = toggleGroup;

          groupOrderNumber++;
          const isFirstGroup = groupOrderNumber === 1;
          const groupItemsIds = this.getGroupChildren(nextFormOptions, groupId);
          group.children = groupItemsIds;
          _.forEach(groupItemsIds, itemId => {
            const groupItem = nextFormOptions.fields[itemId];
            // exclude 'created', 'generatorBatchNumber' and other not valuable fields
            if (groupItem && groupItem.visible !== false) {
              groupItem.hidden = !isFirstGroup;
              // to change styles for item in the group
              groupItem.isInGroup = true;
            }
          });
          nextFormOptions.fields[groupId].isOpened = isFirstGroup;
        }
      });
      this.isFirstGroupsLoad = false;
    }
  }

  toggleGroup(groupId) {
    const newStateIsOpened = !this.props.screenProps.formOptions.fields[groupId].isOpened;
    const formOptions = this.props.screenProps.formOptions;
    const groupItemsIds = formOptions.fields[groupId].children;
    formOptions.fields[groupId].isOpened = newStateIsOpened;
    _.forEach(groupItemsIds, itemId => {
      // toggle only existing fields
      const fieldOptions = formOptions.fields[itemId];
      if (fieldOptions && fieldOptions.visible !== false) {
        fieldOptions.hidden = !newStateIsOpened;
      }
    });
    this.rerenderFormKey = Math.random();
    this.setState({[groupId]: newStateIsOpened}, () => {
      this.revalidateGroupFields(groupId);
    });
  }


  revalidateGroupFields(groupId) {
    const form = this.form;
    const formOptions = this.props.screenProps.formOptions;
    const isGroupOpened = formOptions.fields[groupId].isOpened;
    if (!isGroupOpened) {
      return;
    }
    const groupItemsIds = formOptions.fields[groupId].children;
    _.forEach(groupItemsIds, itemId => {
      const fieldOptions = formOptions.fields[itemId];
      if (fieldOptions && fieldOptions.visible !== false) {
        const formField = form.getComponent(itemId);
        if (formField.props.value !== null) {
          formField.validate();
        }
      }
    });
  }

  componentDidMount() {
    const {navigation, screenProps: {title, save}} = this.props;

    this.setState({
      loaded: true
    });

    navigation.setParams({
      title,
      save,
      goBack: this.goBack
    });
  }

  goBack() {
    const {screenProps: {parentNavigation}} = this.props;

    parentNavigation.goBack();
  }

  render() {
    const {loaded} = this.state;
    const {isSaving, updateFormRef, formTypes, formOptions, formValues, onChangeValues, backgroundImage} = this.props.screenProps;

    if (!loaded) {
      return null;
    }
    return (
      <Container>
        <View style={{flex: 1}}>
          {backgroundImage}
          <Content
            contentContainerStyle={styles.content}
            scrollEnabled={false}
            keyboardShouldPersistTaps='always'
          >
            <ScrollView keyboardShouldPersistTaps='always'>
              <View
                style={styles.formContainer}
              >
                <Form
                  key={this.rerenderFormKey}
                  type={formTypes}
                  value={formValues}
                  options={formOptions}
                  ref={form => {
                    this.form = form;
                    updateFormRef(form)
                  }}
                  onChange={(values, path) => onChangeValues(values, path)}
                />
              </View>
            </ScrollView>
            <Loader
              isShowed={isSaving || !loaded}
            />
          </Content>
        </View>
      </Container>
    );
  }
}

FormScreenView.propTypes = {
  navigation: PropTypes.object.isRequired,
  screenProps: PropTypes.object.isRequired
};

export default FormScreenView;
