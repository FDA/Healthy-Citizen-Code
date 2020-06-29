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
let prevServiceSelected = '';
const SERVICE_TASK = 'serviceTask';
const propTypesConfig = {
  'String': {
    control: 'textField'
  },
  'Number[]': {
    control: 'textField',
    validate: val => !val || val.match(/^[\d,\s]+$/) ? '' : 'Comma-separated numbers is required'
  },
  'AssociativeArray': {
    control: 'textBox', //overided by template
    validate: val => {
      try {
        JSON.parse(relaxedJson.transform(val));
        return '';
      } catch (e) {
        return 'Valid JSON is required';
      }
    },
    template: function (propName, name, opt, params) {
      const id = 'adp-' + propName;

      return `<div class="bpp-row">
        <label for="${id}" >${params.label}</label>
        <div class="bpp-field-wrapper" >
        <textarea id="${id}" type="text" name="${propName}"></textarea>
        </div></div>`;
    }
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
    const serviceTask = serviceTaskFromPropVal(bo.get('serviceTask'));
    const controls = [];
    const options = _.map(config.additionalData.serviceTaskSchemas, (val, name) => ({
      value: serviceTaskToPropVal(name),
      name: name + '()'
    }))

    options.unshift({value:'', name:'-- not defined --'});

    controls.push(
      entryFactory.selectBox({
        id: boType + 'Node',
        label: 'Service',
        modelProperty: SERVICE_TASK,
        selectOptions: options,
        get: element => {
          prevServiceSelected = bo.get(SERVICE_TASK);
          return {[SERVICE_TASK]: prevServiceSelected};
        },
        set: (element, values) => {
          const props = {};
          const prev = serviceTaskFromPropVal(prevServiceSelected);

          props[SERVICE_TASK] = values[SERVICE_TASK];

          if (prev) {
            _.each(getServiceTaskFields(prev),
              (opt, name) => props[getAdpProp(name)] = undefined)
          }

          return cmdHelper.updateProperties(element, props);
        }
      }))

    _.each(getServiceTaskFields(serviceTask),
      (opt, name) => {
        const propName = getAdpProp(name);
        const propConfig = propTypesConfig[opt.type];
        const params = {
          id: boType + '_prop_' + name,
          label: opt.description,
          modelProperty: propName,
          get: element => {
            let val = bo.get(propName);
            if (!val) {
              val = servicePropsCache[propName];
              bo.set(propName, val);
            }
            servicePropsCache[propName] = val;
            return {[propName]: servicePropsCache[propName]}
          },
          set: (elem, val) => {
            servicePropsCache[propName] = val[propName];
            return cmdHelper.updateProperties(elem, val)
          },
          validate: (element, values) => {
            var validationResult = {};
            var res = propConfig.validate ? propConfig.validate(values[propName]) : null;

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

  function serviceTaskToPropVal(name) {
    return '\\${environment.services.' + name + '}';
  }

  function serviceTaskFromPropVal(val) {
    const match = val && val.match(/^\\\${environment\.services\.(\w+)}$/);

    return match ? match[1] : '';
  }

  function getAdpProp(name) {
    return 'adp_' + name;
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

      get: function (element, propertyName) {
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
