import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  Keyboard
} from 'react-native';
import {
  Toast
} from 'native-base';
import {StackNavigator} from 'react-navigation';
import TCombForm from 'tcomb-form-native';
import FormScreen from './FormScreen';
import {LookupView, LookupFactory} from './LookupField';
import {MultiSelectView, MultiSelectFactory} from './MultiSelectField';
import {DoublePickerFactory} from './DoublePickerField';
import {SinglePickerFactory} from './SinglePickerField';
import {GroupFactory} from './GroupField';
import {LocationFactory} from './LocationField';
import {UploadFactory} from './UploadField';
import {BarcodeFactory} from './BarcodeField';

import {getDateGeneratorByDateSubtype, formatTimeStringToISOString} from '../../../helpers/date';
import {getInterfaceByPath, getInterfaceByPathWithoutParams, parseDataFields} from '../../../helpers/parsers';
import labelRenderer from '../../../helpers/labelRenderers';
import FieldTemplates from './FieldTemplates';
import formStylesheet from './FormScreen/FormStylesheets';
import _ from 'lodash';
import adpRenderLib from '../renderLib'; // its used in generated code via 'new Function', so do not delete
import {getFormData, sendDataWithProgress} from '../../../components/FileChooser/uploadHelper';
import {getOption} from '../../../services/localStorage';
import Config from '../../../config';
import getBackgroundImage from '../../../themes/adp/components/BackgroundImage';

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
    gesturesEnabled: false
  }
});

class EditView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      formTypes: {},
      formOptions: {},
      formValues: {},
      hasMediaFields: false, // stores '[mediaField]: true/false' info to handle submit form
      isFormSentForSave: false,
      formRenderFields: [],
      synthesizeFields: [],
      isRenderFieldsInitialized: false
    };

    this.uploadUrl = Config.api.host + '/upload';
    this.backgroundImage = getBackgroundImage(Config.api.host + this.props.layout.background);
    this._form = null;
    this.fileTypes = [
      'File', 'Image', 'Video', 'Audio',
      'File[]', 'Image[]', 'Video[]', 'Audio[]'
    ];

    this.onChangeValue = this.onChangeValue.bind(this);
    this.onChangeValues = this.onChangeValues.bind(this);
    this.openLookupView = this.openLookupView.bind(this);
    this.openMultiSelectView = this.openMultiSelectView.bind(this);
    this.add = this.add.bind(this);
    this.save = this.save.bind(this);
    this.submit = this.submit.bind(this);
    this.prepareSubmit = this.prepareSubmit.bind(this);
    this._updateFormRef = this._updateFormRef.bind(this);
    this.getFormTypeByFieldSchema = this.getFormTypeByFieldSchema.bind(this);
    this.generateField = this.generateField.bind(this);
    this.generateFieldsData = this.generateFieldsData.bind(this);
    this.generateParentFieldsByPath = this.generateParentFieldsByPath.bind(this);
    this.initFormRenderers = this.initFormRenderers.bind(this);
    this.handleFormRenderers = this.handleFormRenderers.bind(this);
  }

  static navigationOptions = {
    header: null
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

    // _navigation.setParams({
    //   title: _.get(currentInterface, 'name', ''),
    //   save: () => this.prepareSubmit()
    // });
  }

  componentWillUnmount() {
    this.props.clearState();
  }

  componentWillReceiveProps(newProps) {
    // handle isSaved
    // const {isSaved} = this.props;
    if (newProps.data !== this.props.data) {
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
    const {navigation} = this.props;
    const {formValues} = this.state;

    if (this.checkParentCreateField(fieldId, fieldValue)) {
      navigation.navigate('Edit', {
        currentPath: fieldId,
        onChangeValue: this.onChangeValue,
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

  isFieldChanged(fieldName, newValues) {
    const oldValue = this.state.formValues[fieldName];
    const newValue = newValues[fieldName];
    return oldValue === newValue;
  }

  initFormRenderers(formValues) {
    const form = this._form;
    const {formRenderFields} = this.state;
    const {modelHelpers} = this.props.data;
    const renderedFormValues = {...formValues};

    _.forEach(formRenderFields, formRenderField => {
      const formSchema = form.props.options.fields;
      const fieldSchema = formSchema[formRenderField];
      const formRenderer = fieldSchema.formRender.formRenderer;
      if (_.isEmpty(formRenderer)) {
        return;
      }

      const watchFields = fieldSchema.formRender.watch || [];
      const firstWatchField = watchFields[0];
      const data = formValues[firstWatchField];
      const row = {};
      _.forEach(formValues, (value, key) => {
        row[key] = value === null ? '' : value;
      });
      const modelSchema = formSchema;
      // using global.adpRenderLib
      // TODO: make form renderers work with async functions
      const result = modelHelpers.FormRenderers[formRenderer].call(null, data, row, modelSchema);
      // currently result is html template, need to define other cases
      // const tagValue = (result.match(/>(.+)<\//) || [])[1] || result;
      const tagStart = result.indexOf('>');
      const tagEnd = result.lastIndexOf('</');
      let tagValue;
      if (tagStart !== -1 && tagEnd !== -1) {
        tagValue = result.substring(tagStart + 1, tagEnd);
      } else {
        tagValue = result;
      }
      renderedFormValues[formRenderField] = tagValue;
    });
    return renderedFormValues;
  }

  handleFormRenderers(formValues) {
    const {formRenderFields} = this.state;
    const {modelHelpers} = this.props.data;
    const form = this._form;
    const that = this;
    const renderedFormValues = {...formValues};

    _.forEach(formRenderFields, formRenderField => {
      const formSchema = form.props.options.fields;
      const fieldSchema = formSchema[formRenderField];
      const formRenderer = fieldSchema.formRender.formRenderer;
      if (_.isEmpty(formRenderer)) {
        return;
      }

      const watchFields = fieldSchema.formRender.watch;
      if (!_.isEmpty(watchFields)) {
        // no need to call func for every changed field, so call it only once
        const isAnyFieldChanged = _.some(watchFields, watchField => that.isFieldChanged(watchField, formValues));
        if (isAnyFieldChanged) {
          // pass first field of watchFields as data, its used as argument just to keep datatables contract
          const firstWatchField = watchFields[0];
          // keep datatables contract
          const data = formValues[firstWatchField];
          const row = {};
          _.forEach(formValues, (value, key) => {
            row[key] = value === null ? '' : value;
          });
          const modelSchema = formSchema;
          // using global.adpRenderLib
          const result = modelHelpers.FormRenderers[formRenderer].call(null, data, row, modelSchema);
          // currently result is html template, need to define other cases
          const tagValue = (result.match(/>(.+)<\//) || [])[1] || result;
          renderedFormValues[formRenderField] = tagValue;
          return;
        }
      }
    });
    return renderedFormValues;
  }

  onChangeValues(formValues, path) {
    const renderedFormValues = this.handleFormRenderers(formValues);
    const parentFieldId = this.checkParentCreate(renderedFormValues);

    if (parentFieldId) {
      const {navigation} = this.props;
      const {showToast} = navigation.state.params;

      navigation.navigate('Edit', {
        currentPath: parentFieldId,
        showToast,
        onChangeValue: this.onChangeValue,
      });
    } else {
      // validate a field on every change
      this._form.getComponent(path).validate();
      this.setState({
        formValues: renderedFormValues
      });
    }
  }

  openLookupView(fieldId, value, lookupId, isMultiple) {
    const {childNavigation: {_navigation}} = this.refs;

    _navigation.navigate('Lookup', {
      lookupId,
      fieldId,
      value,
      isMultiple,
      placeholder: `Choose ${_.startCase(_.camelCase(fieldId))}`,
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

    const currentPathArray = currentPath.split('/').slice(1).filter(p => !p.startsWith(':'));
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

  getSendingValueByType(fieldSchema, values, fieldId, resultValues) {
    const value = values[fieldId];
    const type = fieldSchema.type;

    if (typeof value === 'undefined' || value === null || !_.isEmpty(fieldSchema.synthesize)) {
      return null;
    }

    switch (type) {
      case 'Lookup':
        if (Array.isArray(value)) {
          resultValues[`${fieldId}_label`] = value.map(v => v.label);
          return value.map(v => v.id);
        }
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
            const subValue = this.getSendingValueByType(subFieldSchema, values, `${fieldId}/${subFieldId}`, resultValues);

            if (subValue !== null) {
              subValues[subFieldId] = subValue;
            }
          }
        }

        if (Object.keys(subValues).length) {
          value = subValues;
        }
      } else {
        value = this.getSendingValueByType(fieldSchema, values, fieldId, resultValues);
      }

      if (value === null) {
        continue;
      }

      resultValues[fieldId] = value;
    }

    return resultValues;
  }

  getFormTypeByFieldSchema(schema, fieldId) {
    if (schema.formRender || schema.synthesize) {
      return TCombForm.Any;
    }
    switch (schema.type) {
      case 'Enum':
        return TCombForm.enums(schema.enums);
      case 'Date':
        return TCombForm.String;
      case 'Number':
        return TCombForm.Number;
      case 'LocationCoordinates':
        return TCombForm.Any;
      // case 'Number[]':
      //   return TCombForm.list(TCombForm.Number);
      case 'Lookup':
        return TCombForm.irreducible(
          'LookupType',
          val => {
            if (_.isArray(val)) {
              const isEveryElemValid = val.every(elem => {
                return !!elem.id && elem.label;
              });
              return val.length > 0 && isEveryElemValid;
            }
            if (_.isObject(val)) {
              return !!val.id && !!val.label;
            }
            return false;
          }
        );
      case 'Height':
        return TCombForm.list(TCombForm.Number);
      case 'Weight':
      case 'WeightWithOz':
        return TCombForm.list(TCombForm.Number);
      case 'MultiSelect':
        return TCombForm.list(TCombForm.String);
      case 'Boolean':
        return TCombForm.Boolean;
      case 'Group':
        return TCombForm.Any;
      case 'File':
      case 'Image':
      case 'Video':
      case 'Audio':
      case 'File[]':
      case 'Image[]':
      case 'Video[]':
      case 'Audio[]':
        return TCombForm.list(TCombForm.struct({
          id: TCombForm.String,
          type: TCombForm.String,
          name: TCombForm.String,
          size: TCombForm.Number
        }));
      case 'LocationLabel':
        return TCombForm.String;
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

  addOptionsBySchema(options, schema) {
    const fieldType = schema.fieldType;
    switch (fieldType) {
      case 'password':
        options.secureTextEntry = true;
        break;
      case 'email':
        options.keyboardType = 'email-address';
        break;
    }

    const type = schema.type;
    switch (type) {
      case 'Number':
        options.keyboardType = 'numeric';
        break;
      case 'String':
        options.keyboardType = 'default'; // aka string
        break;
    }
  }

  generateField(fieldId, currentFieldSchema, value, typeData, optionsData, valueData, orderArray) {
    let currentFieldType = this.getFormTypeByFieldSchema(currentFieldSchema, fieldId);
    if (!currentFieldSchema.required) {
      currentFieldType = TCombForm.maybe(currentFieldType)
    }
    if (_.isArray(currentFieldSchema.validations)) {
      currentFieldType = TCombForm.refinement(currentFieldType, value => {
        return currentFieldSchema.validations.every(validation => validation(value));
      });
      currentFieldType.getValidationErrorMessage = (value, path, context) => {
        for (let index in currentFieldSchema.validations) {
          const validation = currentFieldSchema.validations[index];
          if (!validation(value)) {
            return currentFieldSchema.errorMessages[index];
          }
        }
      };
    }

    typeData[fieldId] = currentFieldType;

    valueData[fieldId] = value;

    let isHidden;
    if (currentFieldSchema.visible === false) {
      isHidden = true;
    } else {
      isHidden = !!currentFieldSchema.hidden;

      if (currentFieldSchema.synthesize) {
        isHidden = true;
      }
      if (currentFieldSchema.formRender) {
        isHidden = false;
      }
    }

    // not needed to rerender
    if (currentFieldSchema.formRender && !this.state.formRenderFields.includes(fieldId)) {
      this.state.formRenderFields = this.state.formRenderFields.concat([fieldId]);
    }
    if (currentFieldSchema.synthesize && !this.state.synthesizeFields.includes(fieldId)) {
      this.state.synthesizeFields = this.state.synthesizeFields.concat([fieldId]);
    }
    optionsData.fields[fieldId] = {
      label: currentFieldSchema.name + (currentFieldSchema.required ? ' *' : ''),
      help: currentFieldSchema.description || null,
      hidden: isHidden,
      visible: currentFieldSchema.visible,
      required: currentFieldSchema.required,
      formRender: currentFieldSchema.formRender,
      synthesize: currentFieldSchema.synthesize,
      editable: !currentFieldSchema.formRender,
      error: currentFieldSchema.errorMessages
    };
    const curOptions = optionsData.fields[fieldId];
    this.addOptionsBySchema(curOptions, currentFieldSchema);
    if (currentFieldSchema.type === 'Date') {
      const subtype = currentFieldSchema.subtype;
      const mode = subtype ? subtype.toLowerCase() : 'date';
      curOptions.mode = mode;
      curOptions.factory = DatePicker;
      curOptions.config = {
        format: getDateGeneratorByDateSubtype(subtype)
      };

      curOptions.transformer = {
        format: value => {
          return formatTimeStringToISOString(value);
        },
        parse: isoString => isoString
      };
    }
    if (currentFieldSchema.type === 'Lookup') {
      valueData[fieldId] = value ? {
        id: value.id,
        label: value.label
      } : null;
      curOptions.factory = LookupFactory;
      curOptions.fieldId = fieldId;
      curOptions.isMultiple = currentFieldSchema.isMultiple;
      curOptions.lookupId = currentFieldSchema.lookupId;
      curOptions.openLookupView = this.openLookupView;
    }
    if (currentFieldSchema.type === 'MultiSelect') {
      curOptions.factory = MultiSelectFactory;
      curOptions.fieldId = fieldId;
      curOptions.enums = currentFieldSchema.enums;
      curOptions.openMultiSelectView = this.openMultiSelectView;
    }
    if (currentFieldSchema.type === 'Height') {
      const nullInchesOption = {
        value: 0
      };

      curOptions.factory = DoublePickerFactory;
      curOptions.transformer = {
        format: values => (!values || values.length !== 2 ? null : [
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
      curOptions.options = [feet, inches];
    }
    if (currentFieldSchema.type === 'Weight') {
      const nullPoundsOption = {
        value: 0
      };

      curOptions.factory = SinglePickerFactory;
      curOptions.transformer = {
        format: values => (!values || values.length !== 1 ? null :
            [TCombForm.Nil.is(values[0]) && nullPoundsOption ? nullPoundsOption.value : values[0]]
        ),
        parse: values => values
      };

      const pounds = [];
      for (let i = 0; i < 11; i++) {
        pounds.push({
          value: i,
          text: i + 'lb'
        });
      }
      curOptions.options = [pounds];
    }
    if (currentFieldSchema.type === 'WeightWithOz') {
      const nullOuncesOption = {
        value: 0
      };

      curOptions.factory = DoublePickerFactory;
      curOptions.transformer = {
        format: values => (!values || values.length !== 2 ? null : [
          TCombForm.Nil.is(values[0]) && nullOuncesOption ? nullOuncesOption.value : values[0],
          TCombForm.Nil.is(values[1]) && nullOuncesOption ? nullOuncesOption.value : values[1]
        ]),
        parse: values => values
      };

      const pounds = [];
      const ounces = [];
      for (let i = 0; i < 11; i++) {
        pounds.push({
          value: i,
          text: i + 'lb'
        });
      }
      for (let i = 0; i < 16; i++) {
        ounces.push({
          value: i,
          text: i + 'oz'
        });
      }
      curOptions.options = [pounds, ounces];
    }
    if (currentFieldSchema.type === 'Group') {
      curOptions.factory = GroupFactory;
      curOptions.fieldId = fieldId;
      curOptions.isOpened = false;
      curOptions.type = currentFieldSchema.type;
      curOptions.list = currentFieldSchema.list;
      curOptions.children = currentFieldSchema.children;
    }
    if (this.fileTypes.includes(currentFieldSchema.type)) {
      curOptions.factory = UploadFactory;
      const {currentPath} = this.props.navigation.state.params;
      curOptions.formUrl = currentPath.replace(/:.+?\//, '');
      curOptions.navigation = this.props.navigation;
      curOptions.fieldId = fieldId;
      curOptions.type = currentFieldSchema.type;
      curOptions.filetype = curOptions.type.toLowerCase();
      if (this.state.hasMediaFields !== true) {
        this.setState({hasMediaFields: true});
      }
      if (currentFieldSchema.type.endsWith('[]')) {
        curOptions.isSingleUpload = false;
      } else {
        curOptions.isSingleUpload = true;
      }
    }
    if (currentFieldSchema.type === 'LocationLabel') {
      curOptions.factory = LocationFactory;
      curOptions.fieldId = fieldId;
      curOptions.navigation = this.props.navigation;
      curOptions.onChangeValue = this.onChangeValue;
      curOptions.type = currentFieldSchema.type;
    }
    if (currentFieldSchema.type === 'Barcode') {
      curOptions.factory = BarcodeFactory;
      curOptions.fieldId = fieldId;
      curOptions.navigation = this.props.navigation;
      curOptions.onChangeValue = this.onChangeValue;
      curOptions.type = currentFieldSchema.type;
    }
    curOptions.template = this.getFieldTemplateByType(currentFieldSchema.type);

    orderArray.push(fieldId);
  }

  generateParentFieldsByPath(typeData, optionsData, valueData, orderArray) {
    const {navigation, interfaces, fields, data} = this.props;
    const {currentPath} = navigation.state.params;

    const currentPathArray = currentPath.split('/').slice(1, -1);
    let parentPaths = [];

    currentPathArray.forEach(path => {
      parentPaths.push(path);
      const currentParentPath = `/${parentPaths.filter(p => !p.startsWith(':')).join('/')}`;
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

      const singleRecord = _.get(parentSchema, 'singleRecord');
      if (
        singleRecord &&
        parentData &&
        typeof parentData.items === 'object' &&
        Object.keys(parentData.items).length === 1
      ) {
        parentSchemaFields.hidden = true;
      }

      this.generateField(
        currentParentPath,
        parentSchemaFields,
        (singleRecord || !parentInterface) ? currentValue : null,
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
    const replacedPath = currentPath ? currentPath.replace(/:.+?\//, '') : '';
    const currentSchema = fields[replacedPath];
    const currentFields = _.get(currentSchema, 'fields');
    const currentData = currentItemId ? dataObject[replacedPath] : null;
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

    if (_.get(currentSchema, 'order')) {
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
    }


    optionsData.order = orderArray;

    return {
      formTypes: TCombForm.struct(typeData),
      formValues: valueData,
      formOptions: optionsData
    };
  }

  add(values) {
    const that = this;
    const {navigation, addData, fields} = this.props;
    const {currentPath} = navigation.state.params;

    const replacedPath = currentPath ? currentPath.replace(/:.+?\//, '') : '';
    const currentSchema = fields[replacedPath];
    const currentFieldsSchema = currentSchema.fields;
    const currentFullPath = this.getFullPathToAddRecord(values);
    const sendingData = this.generateSendingData(currentSchema, values);

    return addData(
      currentFullPath,
      replacedPath,
      currentFieldsSchema,
      sendingData
    )
      .then(response => {
        // if previous screen is EditView so current EditView should update form field with new added id
        if (navigation.state.params.onChangeValue) {
          navigation.state.params.onChangeValue(replacedPath, response.id);
        }
        navigation.state.params.showToast({
          type: 'success',
          duration: 5000,
          text: 'New record was successfully added',
          position: 'bottom',
          buttonText: 'Close'
        });
        navigation.goBack();
        /*
        navigation.navigate('List', {
          currentPath: currentPath,
          selectedItemId: response ? response.id : null
        });
        */
      })
      .catch(({message}) => {
        that.setState({isFormSentForSave: false});
        // the error is already displayed in a standart alert dialog
        // Toast.show({
        //   type: 'danger',
        //   text: `Error: ${message}`,
        //   position: 'bottom',
        //   buttonText: 'Close'
        // });
      });
  }

  save(values) {
    const that = this;
    const {saveData, fields, data, navigation} = this.props;
    const {currentPath, currentItemId} = navigation.state.params;

    const replacedPath = currentPath ? currentPath.replace(/:.+?\//, '') : '';
    const currentSchema = fields[replacedPath];
    const currentFieldsSchema = currentSchema.fields;
    const currentData = data[replacedPath];

    const sendingData = this.generateSendingData(currentSchema, values);

    return saveData(
      currentData.fullPath,
      replacedPath,
      currentItemId,
      currentFieldsSchema,
      sendingData
    )
      .then(() => {
        navigation.goBack();
        navigation.state.params.showToast({
          type: 'success',
          duration: 5000,
          text: 'Record was successfully saved',
          position: 'bottom',
          buttonText: 'Okay'
        });
        return true;
        /*
        navigation.navigate('List', {
            currentPath: currentPath,
            selectedItemId: currentItemId
        });
        */
      })
      .catch(({message}) => {
        that.setState({isFormSentForSave: false});
        // the error is already displayed in a standart alert dialog
        // Toast.show({
        //   type: 'danger',
        //   text: `Error: ${message}`,
        //   position: 'bottom',
        //   buttonText: 'Close'
        // });
      });
  }

  prepareSubmit() {
    const that = this;
    const submit = this.submit;
    if (this.state.isFormSentForSave) {
      return;
    }

    const {navigation, updateFileProgress, setUploadedFiles} = this.props;
    const {currentPath} = navigation.state.params;
    const replacedPath = currentPath ? currentPath.replace(/:.+?\//, '') : '';

    const {upload} = this.props;
    const fieldsWithFiles = _.get(upload, ['files', replacedPath], []);

    if (!this.state.hasMediaFields || _.isEmpty(fieldsWithFiles)) {
      submit();
      return;
    }

    const formFields = this._form.refs.input.refs;
    const uploadFilesPromises = [];
    _.forEach(fieldsWithFiles, (filesByKeys, fieldName) => {
      const files = _.values(filesByKeys);
      let filesToUpload = files
        .filter(file => !file.id) // upload only new files
        .map((file, index) => ({
          name: file.name,
          path: file.uri,
          type: file.type
        }));

      if (_.isEmpty(filesToUpload)) {
        return;
      }

      updateFileProgress(replacedPath, fieldName, {
        uploading: true,
        showUploadModal: true,
        uploadProgress: 0,
        uploadTotal: 0,
        uploadWritten: 0
      });
      const data = getFormData(filesToUpload);

      const uploadPromise = sendDataWithProgress(this.uploadUrl, {
        headers: {'Authorization': `JWT ${getOption('token')}`},
        method: 'post',
        body: data
      }, (progressEvent) => {
        const progress = Math.ceil(progressEvent.loaded / progressEvent.total * 100);
        updateFileProgress(replacedPath, fieldName, {
          uploadProgress: progress,
          uploadTotal: progressEvent.total,
          uploadWritten: progressEvent.loaded
        });
      })
        .then((res) => {
          if (res.status === 200) {
            updateFileProgress(replacedPath, fieldName, {uploading: false, uploadStatus: res.status});

            const response = JSON.parse(res.responseText);
            const alreadyUploadedFiles = filesToUpload.filter(file => file.id);
            const newUploadedFiles = response.data;
            const fieldValues = alreadyUploadedFiles.concat(newUploadedFiles);
            formFields[fieldName].onChange(fieldValues);

            const values = that.getFileTree(fieldValues);
            setUploadedFiles(replacedPath, fieldName, values);
          } else {
            updateFileProgress(replacedPath, fieldName, {uploading: false, uploadStatus: res.status});
          }
          return res.status;
        })
        .catch(err => console.error(err));

      uploadFilesPromises.push(uploadPromise);
    });

    return Promise.all(uploadFilesPromises)
      .then((responses) => {
        const isAnyFails = responses.some(responseStatus => responseStatus !== 200);
        if (!isAnyFails) {
          submit();
          return true
        }
        return false;
      });
  }

  getFileTree(files) {
    const result = {};
    _.forEach(files, file => {
      // id is unique key for uploaded files
      // if file is not uploaded it should have uri
      const key = file.id || file.uri;
      result[key] = file;
    });
    return result;
  }

  submit() {
    const {isSaving, navigation, getDashboard} = this.props;
    const {currentPath, currentItemId} = navigation.state.params;

    Keyboard.dismiss();

    if (isSaving || this.state.isFormSentForSave) {
      return false;
    }

    const validationResult = this._form.validate();
    // const formValue = this._form.getValue();

    if (validationResult.errors.length) {
      return false;
    }

    this.setState({isFormSentForSave: true});

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
    if (this._form && !this.state.isRenderFieldsInitialized) {
      const renderedFormValues = this.initFormRenderers(this.state.formValues);
      this.setState({formValues: renderedFormValues, isRenderFieldsInitialized: true});
    }
  }

  render() {
    const {isSaving, interfaces, navigation} = this.props;
    const {currentPath} = navigation.state.params;
    const {formTypes, formOptions, formValues} = this.state;
    const currentInterface = getInterfaceByPath(interfaces, currentPath) || getInterfaceByPathWithoutParams(interfaces, currentPath);

    return (
      <Navigation
        ref='childNavigation'
        screenProps={{
          isSaving,
          onChangeValue: this.onChangeValue,
          onChangeValues: this.onChangeValues,
          parentNavigation: navigation,
          updateFormRef: this._updateFormRef,
          title: _.get(currentInterface, 'name', ''),
          save: this.prepareSubmit,
          backgroundImage: this.backgroundImage,
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
  getDashboard: PropTypes.func.isRequired,
  isSaving: PropTypes.bool.isRequired,
  isSaved: PropTypes.bool.isRequired,
  interfaces: PropTypes.array.isRequired,
  fields: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired
};

export default EditView;
