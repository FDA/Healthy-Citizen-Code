import React, {Component, PropTypes} from 'react';
import {
  Keyboard
} from 'react-native';
import {
  Toast
} from 'native-base';
import {StackNavigator} from 'react-navigation';
import { NavigationActions } from 'react-navigation';
import TCombForm from 'tcomb-form-native';
import FormScreen from './FormScreen';
import {LookupView, LookupFactory} from './LookupField';
import {MultiSelectView, MultiSelectFactory} from './MultiSelectField';
import {DoublePickerFactory} from './DoublePickerField';
import {generateDateString} from '../../../helpers/date';
import {getInterfaceByPath} from '../../../helpers/parsers';
import labelRenderer from '../../../helpers/labelRenderers';
import FieldTemplates from './FieldTemplates';
import formStylesheet from './FormScreen/FormStylesheets';

const {DatePicker} = TCombForm.form;

const Navigation = StackNavigator({
  Form: {
    screen: FormScreen
  },
  Lookup: {
    screen: LookupView
  },
  MultiSelect: {
    screen: MultiSelectView
  }
}, {
  headerMode: 'screen',
  initialRouteName: 'Form',
  navigationOptions: {
    cardStack: {
      gesturesEnabled: false
    }
  }
});

class EditView extends Component {
  constructor() {
    super();

    this.state = {
      formTypes: {},
      formOptions: {},
      formValues: {}
    };

    this._form = null;

    this.onChangeValue = this.onChangeValue.bind(this);
    this.onChangeValues = this.onChangeValues.bind(this);
    this.openLookupView = this.openLookupView.bind(this);
    this.openMultiSelectView = this.openMultiSelectView.bind(this);
    this.add = this.add.bind(this);
    this.save = this.save.bind(this);
    this.submit = this.submit.bind(this);
    this._updateFormRef = this._updateFormRef.bind(this);
    this.getFormTypeByFieldSchema = this.getFormTypeByFieldSchema.bind(this);
    this.generateField = this.generateField.bind(this);
    this.generateFieldsData = this.generateFieldsData.bind(this);
    this.generateParentFieldsByPath = this.generateParentFieldsByPath.bind(this);
  }

  static navigationOptions = {
    header: {
      visible: false
    }
  };

  componentDidMount() {
    const {interfaces, navigation} = this.props;
    const {childNavigation: {_navigation}} = this.refs;
    const {currentPath} = navigation.state.params;
    const currentInterface = getInterfaceByPath(interfaces, currentPath);

    const {formTypes, formOptions, formValues} = this.generateFieldsData();

    this.setState({
      formTypes,
      formOptions,
      formValues
    });

    _navigation.setParams({
      title: currentInterface.name,
      save: () => this.submit()
    });
  }

  componentWillReceiveProps(newProps) {
    const {isSaved} = this.props;

    if (!isSaved && newProps.isSaved) {
      const {formTypes, formOptions, formValues} = this.generateFieldsData(newProps.data);

      this.setState({
        formTypes,
        formOptions,
        formValues
      });
    }
  }

  checkParentCreateField(fieldId, fieldValue) {
    return (
      fieldId.charAt(0) === '/' &&
      fieldValue === '@create_new'
    );
  }

  checkParentCreate(formValues) {
    for (let fieldId in formValues) {
      if (
        formValues.hasOwnProperty(fieldId) &&
        this.checkParentCreateField(fieldId, formValues[fieldId])
      ) {
        return fieldId;
      }
    }

    return null;
  }

  onChangeValue(fieldId, fieldValue) {
    const {formValues} = this.state;

    if (this.checkParentCreateField(fieldId, fieldValue)) {
      navigation.navigate('Edit', {
        currentPath: fieldId
      });
    } else {
      this.setState({
        formValues: {
          ...formValues,
          [fieldId]: fieldValue
        }
      });
    }
  }

  onChangeValues(formValues) {
    const {navigation} = this.props;
    const parentFieldId = this.checkParentCreate(formValues);

    if (parentFieldId) {
      navigation.navigate('Edit', {
        currentPath: parentFieldId
      });
    } else {
      this.setState({
        formValues
      });
    }
  }

  openLookupView(fieldId, value, lookupId) {
    const {childNavigation: {_navigation}} = this.refs;

    _navigation.navigate('Lookup', {
      lookupId: lookupId,
      fieldId: fieldId,
      value: value,
      onChangeValue: this.onChangeValue
    });
  }

  openMultiSelectView(fieldName, fieldId, value, enums) {
    const {childNavigation: {_navigation}} = this.refs;

    _navigation.navigate('MultiSelect', {
      fieldName: fieldName,
      fieldId: fieldId,
      value: value,
      enums: enums,
      onChangeValue: this.onChangeValue
    });
  }

  getFullPathToAddRecord(values) {
    const {currentPath} = this.props.navigation.state.params;

    const currentPathArray = currentPath.split('/').slice(1);
    const parentPaths = [];
    let fullPath = '';

    currentPathArray.forEach((path, index) => {
      parentPaths.push(path);

      const currentParentPath = `/${parentPaths.join('/')}`;

      fullPath += `/${path}`;

      if (index < currentPathArray.length - 1) {
        fullPath += `/${values[currentParentPath]}`;
      }
    });

    return fullPath;
  }

  getSendingValueByType(type, values, fieldId, resultValues) {
    const value = values[fieldId];

    if (typeof value === 'undefined' || value === null) {
      return null;
    }

    switch (type) {
      case 'Lookup':
        resultValues[`${fieldId}_label`] = value.label;

        return value.id;
      default:
        return value;
    }
  }

  generateSendingData(currentSchema, values) {
    let resultValues = {};

    for (let i = 0; i < currentSchema.order.length; i++) {
      const fieldId = currentSchema.order[i];
      const fieldSchema = currentSchema.fields[fieldId];

      let value = null;

      if (fieldSchema.type === 'Object') {
        let subValues = {};

        for (let subFieldId in fieldSchema.fields) {
          if (fieldSchema.fields.hasOwnProperty(subFieldId)) {
            const subFieldSchema = fieldSchema.fields[subFieldId];
            const subValue = this.getSendingValueByType(subFieldSchema.type, values, `${fieldId}/${subFieldId}`, resultValues);

            if (subValue !== null) {
              subValues[subFieldId] = subValue;
            }
          }
        }

        if (Object.keys(subValues).length) {
          value = subValues;
        }
      } else {
        value = this.getSendingValueByType(fieldSchema.type, values, fieldId, resultValues);
      }

      if (value === null) {
        continue;
      }

      resultValues[fieldId] = value;
    }

    return resultValues;
  }

  getFormTypeByFieldSchema(schema) {
    switch (schema.type) {
      case 'Enum':
        return TCombForm.enums(schema.enums);
      case 'Date':
        return TCombForm.String;
      case 'Number':
        return TCombForm.Number;
      case 'Lookup':
        return TCombForm.struct({
          id: TCombForm.String,
          label: TCombForm.String
        });
      case 'Height':
        return TCombForm.list(TCombForm.Number);
      case 'MultiSelect':
        return TCombForm.list(TCombForm.String);
      case 'Boolean':
        return TCombForm.Boolean;
      default:
        return TCombForm.String;
    }
  }

  getFieldTemplateByType(type) {
    const {textbox, datepicker, select, checkbox} = FieldTemplates;

    switch (type) {
      case 'Enum':
        return select;
      case 'Date':
        return datepicker;
      case 'String':
      case 'Number':
        return textbox;
      case 'Boolean':
        return checkbox;
      default:
        return null;
    }
  }

  getOptionsByFieldType(options, type) {
    switch (type) {
      case 'password':
        options.secureTextEntry = true;

        break;
      case 'email':
        options.keyboardType = 'email-address';

        break;
      default:
        break;
    }
  }

  generateField(fieldId, currentFieldSchema, value, typeData, optionsData, valueData, orderArray) {
    let currentFieldType = this.getFormTypeByFieldSchema(currentFieldSchema);
    if (!currentFieldSchema.required) {
      currentFieldType = TCombForm.maybe(currentFieldType)
    }
    if (currentFieldSchema.validate) {
      currentFieldType = TCombForm.refinement(currentFieldType, currentFieldSchema.validate);
    }

    typeData[fieldId] = currentFieldType;

    valueData[fieldId] = value;

    optionsData.fields[fieldId] = {
      label: currentFieldSchema.name + (currentFieldSchema.required ? ' *' : ''),
      help: currentFieldSchema.description || null,
      hidden: !!currentFieldSchema.hidden
    };
    if (typeof currentFieldSchema.fieldType === 'string') {
      this.getOptionsByFieldType(optionsData.fields[fieldId], currentFieldSchema.fieldType);
    }
    if (currentFieldSchema.type === 'Date') {
      optionsData.fields[fieldId].mode = 'date';
      optionsData.fields[fieldId].factory = DatePicker;
      optionsData.fields[fieldId].config = {
        format: date => generateDateString(date)
      };
      optionsData.fields[fieldId].transformer = {
        format: value => TCombForm.Nil.is(value) ? null : new Date(value),
        parse: value => value ? `${value.getMonth() + 1}/${value.getDate()}/${value.getFullYear()}` : null
      };
    }
    if (currentFieldSchema.type === 'Lookup') {
      valueData[fieldId] = value ? {
        id: value.id,
        label: value.label
      } : null;
      optionsData.fields[fieldId].factory = LookupFactory;
      optionsData.fields[fieldId].fieldId = fieldId;
      optionsData.fields[fieldId].lookupId = currentFieldSchema.lookupId;
      optionsData.fields[fieldId].openLookupView = this.openLookupView;
    }
    if (currentFieldSchema.type === 'MultiSelect') {
      optionsData.fields[fieldId].factory = MultiSelectFactory;
      optionsData.fields[fieldId].fieldId = fieldId;
      optionsData.fields[fieldId].enums = currentFieldSchema.enums;
      optionsData.fields[fieldId].openMultiSelectView = this.openMultiSelectView;
    }
    if (currentFieldSchema.type === 'Height') {
      const nullInchesOption = {
        value: 0
      };

      optionsData.fields[fieldId].factory = DoublePickerFactory;
      optionsData.fields[fieldId].transformer = {
        format: values => (!values || values.length !== 2 ? [nullInchesOption.value, nullInchesOption.value] : [
          TCombForm.Nil.is(values[0]) && nullInchesOption ? nullInchesOption.value : values[0],
          TCombForm.Nil.is(values[1]) && nullInchesOption ? nullInchesOption.value : values[1]
        ]),
        parse: values => values
      };

      const feet = [];
      const inches = [];
      for (let i = 0; i < 9; i++) {
        feet.push({
          value: i,
          text: i + '\''
        });
      }
      for (let i = 0; i < 12; i++) {
        inches.push({
          value: i,
          text: i + '"'
        });
      }
      optionsData.fields[fieldId].options = [feet, inches];
    }
    optionsData.fields[fieldId].template = this.getFieldTemplateByType(currentFieldSchema.type);

    orderArray.push(fieldId);
  }

  generateParentFieldsByPath(typeData, optionsData, valueData, orderArray) {
    const {navigation, interfaces, fields, data} = this.props;
    const {currentPath} = navigation.state.params;

    const currentPathArray = currentPath.split('/').slice(1, -1);
    let parentPaths = [];

    currentPathArray.forEach(path => {
      parentPaths.push(path);
      const currentParentPath = `/${parentPaths.join('/')}`;
      const parentInterface = getInterfaceByPath(interfaces, currentParentPath);
      const parentSchema = fields[currentParentPath];
      const parentData = data[currentParentPath];

      let parentValues = {};
      let currentValue = null;

      if (parentData) {
        for (let parentKey in parentData.items) {
          if (parentData.items.hasOwnProperty(parentKey)) {
            parentValues[parentKey] = parentSchema.labelRenderer
              ? labelRenderer[parentSchema.labelRenderer](parentData.items[parentKey])
              : parentKey;
            currentValue = parentKey;
          }
        }
      }

      parentValues['@create_new'] = 'Create new';

      const parentSchemaFields = {
        name: parentInterface ? parentInterface.name : 'Parent',
        type: 'Enum',
        enums: parentValues,
        required: true
      };

      if (
        parentSchema.singleRecord &&
        parentData &&
        typeof parentData.items === 'object' &&
        Object.keys(parentData.items).length === 1
      ) {
        parentSchemaFields.hidden = true;
      }

      this.generateField(
        currentParentPath,
        parentSchemaFields,
        (parentSchema.singleRecord || !parentInterface) ? currentValue : null,
        typeData,
        optionsData,
        valueData,
        orderArray
      );
    });
  }

  generateFieldsData(updatedData) {
    const {navigation, fields, data} = this.props;
    const {currentPath, currentItemId} = navigation.state.params;

    const dataObject = updatedData || data;
    const currentSchema = fields[currentPath];
    const currentFields = currentSchema.fields;
    const currentData = currentItemId ? dataObject[currentPath] : null;
    const currentFieldsData = currentData ? currentData.items[currentItemId] : null;

    const typeData = {};
    const valueData = {};
    const optionsData = {
      auto: 'placeholders',
      fields: {},
      stylesheet: formStylesheet
    };
    const orderArray = [];

    if (!currentItemId) {
      this.generateParentFieldsByPath(
        typeData,
        optionsData,
        valueData,
        orderArray
      );
    }

    currentSchema.order.forEach((fieldId) => {
      const currentFieldSchema = currentFields[fieldId];

      if (currentFieldSchema.type === 'Object') {
        for (let subFieldId in currentFieldSchema.fields) {
          if (currentFieldSchema.fields.hasOwnProperty(subFieldId)) {
            const subFieldSchema = currentFieldSchema.fields[subFieldId];

            this.generateField(
              `${fieldId}/${subFieldId}`,
              subFieldSchema,
              currentItemId && currentFieldsData[fieldId] ? currentFieldsData[fieldId][subFieldId] : null,
              typeData,
              optionsData,
              valueData,
              orderArray
            );
          }
        }
      } else {
        this.generateField(
          fieldId,
          currentFieldSchema,
          currentItemId ? currentFieldsData[fieldId] : null,
          typeData,
          optionsData,
          valueData,
          orderArray
        );
      }
    });

    optionsData.order = orderArray;

    return {
      formTypes: TCombForm.struct(typeData),
      formValues: valueData,
      formOptions: optionsData
    };
  }

  add(values) {
    const {navigation, addData, fields} = this.props;
    const {currentPath} = navigation.state.params;

    const currentSchema = fields[currentPath];
    const currentFieldsSchema = currentSchema.fields;
    const currentFullPath = this.getFullPathToAddRecord(values);

    return addData(
      currentFullPath,
      currentPath,
      currentFieldsSchema,
      this.generateSendingData(currentSchema, values)
    )
      .then(response => {
        // TODO: here and in update - make the toast stay until Okey is pressed
        navigation.dispatch(NavigationActions.back());
        Toast.show({
          type: 'success',
          text: 'New record was successfully added!',
          position: 'bottom',
          buttonText: 'Close'
        });
        /*
        navigation.navigate('List', {
          currentPath: currentPath,
          selectedItemId: response ? response.id : null
        });
        */
      })
      .catch(({message}) => {
        /* the error is already displayed in a standart alert dialog
        Toast.show({
          type: 'danger',
          text: `Error: ${message}`,
          position: 'bottom',
          buttonText: 'Close'
        });
        */
      });
  }

  save(values) {
    const {saveData, fields, data, navigation} = this.props;
    const {currentPath, currentItemId} = navigation.state.params;

    const currentSchema = fields[currentPath];
    const currentFieldsSchema = currentSchema.fields;
    const currentData = data[currentPath];

    return saveData(
      currentData.fullPath,
      currentPath,
      currentItemId,
      currentFieldsSchema,
      this.generateSendingData(currentSchema, values)
    )
      .then(() => {
        navigation.dispatch(NavigationActions.back());
        Toast.show({
          type: 'success',
          text: 'Saved successfully!',
          position: 'bottom',
          buttonText: 'Okay'
        });
        /*
        navigation.navigate('List', {
            currentPath: currentPath,
            selectedItemId: currentItemId
        });
        */
      })
      .catch(({message}) => {
        /* the error is already displayed in a standart alert dialog
        Toast.show({
          type: 'danger',
          text: `Error: ${message}`,
          position: 'bottom',
          buttonText: 'Close'
        });
        */
      });
  }

  submit() {
    const {isSaving, navigation, getDashboard} = this.props;
    const {currentPath, currentItemId} = navigation.state.params;

    Keyboard.dismiss();

    if (isSaving) {
      return false;
    }

    const validationResult = this._form.validate();

    if (validationResult.errors.length) {
      return false;
    }

    let submitPromise;
    if (currentItemId) {
      submitPromise = this.save(validationResult.value);
    } else {
      submitPromise = this.add(validationResult.value);
    }
    // update dashboard after data change
    // TODO: Optimize the code. If item is not a part of any dashboard this action is redundant
    submitPromise.then(() => {
      getDashboard();
    });
  }

  _updateFormRef(form) {
    this._form = form;
  }

  render() {
    const {isSaving, interfaces, navigation} = this.props;
    const {currentPath} = navigation.state.params;
    const {formTypes, formOptions, formValues} = this.state;
    const currentInterface = getInterfaceByPath(interfaces, currentPath);

    return (
      <Navigation
        ref='childNavigation'
        screenProps={{
          isSaving,
          onChangeValue: this.onChangeValue,
          onChangeValues: this.onChangeValues,
          parentNavigation: navigation,
          updateFormRef: this._updateFormRef,
          title: currentInterface.name,
          save: this.submit,
          formTypes,
          formOptions,
          formValues
        }}
      />
    );
  }
}

EditView.propTypes = {
  addData: PropTypes.func.isRequired,
  saveData: PropTypes.func.isRequired,
  isSaving: PropTypes.bool.isRequired,
  isSaved: PropTypes.bool.isRequired,
  interfaces: PropTypes.array.isRequired,
  fields: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired
};

export default EditView;
