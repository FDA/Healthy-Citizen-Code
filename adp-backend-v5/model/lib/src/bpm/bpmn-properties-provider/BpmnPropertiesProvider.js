'use strict';

var _ = require('lodash');
var is = require('bpmn-js/lib/util/ModelUtil').is;
var inherits = require('inherits');
var PropertiesActivator = require('bpmn-js-properties-panel/lib/PropertiesActivator');
var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;
var cmdHelper = require('bpmn-js-properties-panel/lib/helper/CmdHelper');
var eventDefinitionHelper = require('bpmn-js-properties-panel/lib/helper/EventDefinitionHelper');
var scriptImplementation = require('./parts/implementation/AdpScript');
var entryFactory = require('bpmn-js-properties-panel/lib/factory/EntryFactory');
var isAny = require('bpmn-js/lib/features/modeling/util/ModelingUtil').isAny;
var elementHelper = require('bpmn-js-properties-panel/lib//helper/ElementHelper');
var relaxedJson = require('relaxed-json');

const servicePropsCache = {};
const SERVICE_TASK_PROPERTY = 'implementation';
const numberRegExp = /^-?\d+(.\d+)?$/;
const quotedStringRegExp = /^(["']).*?\1$/;
const arrayValidator = (val, regExp) => !_.compact(_.map(val.split(','), x=>!x.trim().match(regExp))).length;
const singleVariableValidator = val => val.match(/^\$[a-z]\w{0,}(\.[a-z](\w){0,}|\.\d+|\[\s{0,}\d+\s{0,}\]){0,}$/)
const propTypesConfig = {
  'String': {
    control: 'textField',
    validate: val => {
      const isVariableLike = val.match(/^\$[a-z]\w+/);
      return (isVariableLike && singleVariableValidator(val)) || !isVariableLike
        ? '' : 'Seems like incorrect variable is used'
    },
  },
  'Number': {
    control: 'textField',
    validate: val => !val || val.trim().match(numberRegExp) || singleVariableValidator(val)
      ? '' : 'Variable or correct number is expected',
    toJSON: val => parseFloat(val)
  },
  'Number[]': {
    control: 'textField',
    validate: val => !val || arrayValidator (val, numberRegExp)  || singleVariableValidator(val)
      ? '' : 'Variable or comma-separated numbers are expected',
    toJSON: val => _.map(val.split(','), x=>parseFloat(x)),
    fromJSON: val=>val && val.join ? val.join(', ') : val
  },
  'String[]': {
    control: 'textField',
    validate: val => !val || arrayValidator (val, quotedStringRegExp)  || singleVariableValidator(val)
      ? '' : 'Variable or comma-separated quoted strings are expected',
    toJSON: val => singleVariableValidator(val)
      ? val : _.map(val.split(','), x=>x.trim().substring(1, x.trim().length-1)),
    fromJSON: val=>val && val.join ? val.map(x=>`"${x}"`).join(', ') : val
  },
  'AssociativeArray': {
    control: 'textBox', //overrided by template
    validate: val => {
      if (singleVariableValidator(val)) {
        return '';
      }
      try {
        JSON.parse(relaxedJson.transform(val));
        return '';
      } catch (e) {
        return 'Variable or valid JSON is required';
      }
    },
    template: function (propName, name, opt, params) {
      const id = 'adp-' + propName;

      return `<div class="bpp-row">
        <label for="${id}" >${params.label}</label>
        <div class="bpp-field-wrapper" >
        <textarea id="${id}" type="text" name="${propName}"></textarea>
        </div></div>`;
    },
    toJSON: val =>{ try{ return JSON.parse(relaxedJson.transform(val))} catch(e){ return val;}},
    fromJSON: val=>{ try{ return JSON.stringify(val)} catch(e){ return val;}}
  }
}

function createGeneralTabGroups(element, canvas, bpmnFactory, elementRegistry, translate, config) {
  const generatorsByType = {
    Task: taskControls,
    ScriptTask: scriptControls,
    Process: processControls,
    BusinessRuleTask: businessRulesControls,
    ServiceTask: serviceTaskControls,
    SequenceFlow: sequenceFlowControls
  }
  const generalGroup = {
    id: 'general',
    label: ''
  };
  const bo = getBusinessObject(element);

  if (!bo) {
    return;
  }

  const boType = bo.$type.substr(bo.$type.indexOf(':') + 1);
  const controlsGenerator = generatorsByType[boType] || dummy;

  if (_.isFunction(controlsGenerator)) {
    generalGroup.entries = controlsGenerator(element, translate, config);
  }

  if (!generalGroup.entries || !generalGroup.entries.length) {
    return;
  }

  return [
    generalGroup
  ];

  function scriptControls() {
    var script = scriptImplementation('script', false, translate);

    return [{
      id: boType + 'Node',
      label: translate('Script'),
      html: script.template('adp-script-control', 'Expression'),

      get: element => script.get(element, bo),
      set: (element, values) => cmdHelper.updateProperties(element, script.set(element, values)),

      script: script,
      cssClasses: ['bpp-textfield']
    }];
  }

  function processControls() {
    return [
      entryFactory.checkbox({
        id: boType + 'Node',
        label: translate('Is executable'),
        modelProperty: 'isExecutable'
      })
    ];
  }

  function businessRulesControls() {
    return [
      entryFactory.selectBox({
        id: boType + 'Node',
        label: translate('Rule:'),
        modelProperty: 'businessRule',
        selectOptions: config.additionalData.businessRulesOptions
      })
    ];
  }

  function serviceTaskControls() {
    const {taskName:currentServiceTaskName, taskParams:currentServiceTaskParams} =
      serviceTaskFromPropVal(bo.get(SERVICE_TASK_PROPERTY));
    const controls = [];
    const options = _.map(config.additionalData.serviceTaskSchemas, (val, name) => ({
      value: name,
      name: name + '()'
    }))

    options.unshift({value:'', name:'-- not defined --'});

    controls.push(
      entryFactory.selectBox({
        id: boType + 'Node',
        label: 'Service',
        modelProperty: SERVICE_TASK_PROPERTY,
        selectOptions: options,
        get: () => {
          const {taskName} = serviceTaskFromPropVal(bo.get(SERVICE_TASK_PROPERTY));

          return {[SERVICE_TASK_PROPERTY]: taskName};
        },
        set: (element, values) => {
          const props = {};

          props[SERVICE_TASK_PROPERTY] = serviceTaskToPropVal(values[SERVICE_TASK_PROPERTY], {});

          return cmdHelper.updateProperties(element, props);
        }
      })
    );

    _.each(getServiceTaskFields(currentServiceTaskName),
      (opt, name) => {
        const propName = name;
        const propConfig = propTypesConfig[opt.type];
        const params = {
          id: boType + '_prop_' + name,
          label: opt.description,
          modelProperty: propName,
          get: () => {
            let val = currentServiceTaskParams[propName];
            if (!val) {
              val = servicePropsCache[propName];
            }
            servicePropsCache[propName] = val;
            return {[propName]: servicePropsCache[propName]}
          },
          set: (elem, val) => {
            currentServiceTaskParams[propName] = servicePropsCache[propName] = val[propName];

            return cmdHelper.updateProperties(elem, {[SERVICE_TASK_PROPERTY]: serviceTaskToPropVal(currentServiceTaskName, currentServiceTaskParams)})
          },
          validate: (element, values) => {
            const validationResult = {};
            const res = propConfig.validate ? propConfig.validate(values[propName]) : null;

            if (res) {
              validationResult[propName] = res;
            }

            return validationResult;
          }
        };

        let control;

        if (propConfig.template) {
          params.html = propConfig.template(propName, name, opt, params);
          control = params;
        } else {
          control = entryFactory[propConfig.control || 'textField'](params);
        }

        controls.push(control);
      })

    return controls;
  }

  function taskControls() {
    return [
      entryFactory.textBox({
        id: boType + 'Node',
        label: translate('Description:'),
        modelProperty: 'description',
      })
    ];
  }

  function serviceTaskToPropVal(name, params) {
    const taskFields = getServiceTaskFields(name);

    const transformedParams = _.mapValues(params, (value, key)=>{
      if (taskFields[key]) {
        const propConfig = propTypesConfig[taskFields[key].type];

        if (propConfig.toJSON) {
          return propConfig.toJSON(value);
        }
      }
       return value;
    })

    const escape = encodeURIComponent(JSON.stringify(transformedParams));

    return `$\{environment.services.${name}('${escape}')}`;
  }

  function serviceTaskFromPropVal(val) {
    const match = val && val.match(/^\$\{environment\.services\.(\w+)(.*?)}$/);

    if (!match) {
      return {};
    }

    const taskName = match[1];
    let taskParams = {};

    if (match[2]) {
      const escaped = match[2].substr(2, match[2].length-4);

      try {
        taskParams = JSON.parse(decodeURIComponent(escaped));
      } catch(e) {
      }

      const taskFields = getServiceTaskFields(taskName);

      taskParams = _.mapValues(taskParams, (value, key)=>{
        if (taskFields[key]) {
          const propConfig = propTypesConfig[taskFields[key].type];

          if (propConfig.fromJSON) {
            return propConfig.fromJSON(value);
          }
        }
        return value;
      })
    }

    return {taskName, taskParams};
  }

  function getServiceTaskFields(name) {
    return (config.additionalData.serviceTaskSchemas[name] && config.additionalData.serviceTaskSchemas[name].fields) || [];
  }

  function sequenceFlowControls() {
    var conditionalEventDefinition = eventDefinitionHelper.getConditionalEventDefinition(element);

    if (!(is(element, 'bpmn:SequenceFlow') && isConditionalSource(element.source))
      && !conditionalEventDefinition) {
      return;
    }

    var script = scriptImplementation('body', false, translate);

    return [{
      id: 'condition',
      label: translate('Condition'),
      html: script.template('adp-sequence-flow', 'Condition'),

      get: function (element) {
        var conditionalEventDefinition = eventDefinitionHelper.getConditionalEventDefinition(element);

        var conditionExpression = conditionalEventDefinition
          ? conditionalEventDefinition.condition
          : bo.conditionExpression;

        var values = {};

        if (conditionExpression) {
          values = script.get(element, conditionExpression);
        }

        values.conditionType = 'script';

        return values;

      },

      set: function (element, values, containerElement) {
        var commands = [];

        var conditionProps = script.set(element, values, containerElement);
        var conditionOrConditionExpression;

        conditionOrConditionExpression = elementHelper.createElement(
          'bpmn:FormalExpression',
          conditionProps,
          conditionalEventDefinition || bo,
          bpmnFactory
        );

        var source = element.source;

        // if default-flow, remove default-property from source
        if (source && source.businessObject.default === bo) {
          commands.push(cmdHelper.updateProperties(source, {'default': undefined}));
        }

        var update = conditionalEventDefinition
          ? {condition: conditionOrConditionExpression}
          : {conditionExpression: conditionOrConditionExpression};

        commands.push(cmdHelper.updateBusinessObject(element, conditionalEventDefinition || bo, update));

        return commands;
      },

      script: script,

      cssClasses: ['bpp-textfield']
    }
    ];
  }

  function dummy() {
    return [
      // entryFactory.label({
      //   id: boType + 'Node',
      //   labelText: 'Just label for [' + boType + ']'
      // })
    ];
  }
}

function BpmnPropertiesProvider(
  eventBus, canvas, bpmnFactory, elementRegistry, translate, config) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function (element) {
    var generalTab = {
      id: 'general',
      label: 'Conceptant',
      groups: createGeneralTabGroups(
        element, canvas, bpmnFactory, elementRegistry, translate, config)
    };

    return [
      generalTab
    ];
  };
}

BpmnPropertiesProvider.$inject = [
  'eventBus',
  'canvas',
  'bpmnFactory',
  'elementRegistry',
  'translate',
  'config'
];

inherits(BpmnPropertiesProvider, PropertiesActivator);

module.exports = BpmnPropertiesProvider;

// utilities //////////////////////////

var CONDITIONAL_SOURCES = [
  'bpmn:Activity',
  'bpmn:ExclusiveGateway',
  'bpmn:InclusiveGateway',
  'bpmn:ComplexGateway'
];

function isConditionalSource(element) {
  return isAny(element, CONDITIONAL_SOURCES);
}
