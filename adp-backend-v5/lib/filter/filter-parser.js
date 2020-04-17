const _ = require('lodash');
const RJSON = require('relaxed-json');
const { ValidationError } = require('../errors');

module.exports = (appLib) => {
  const m = {};

  function getFilterForField(fieldPath, operation, value, scheme, wholeFilter) {
    const schemePath = getSchemePathByFieldPath(fieldPath);
    const filterName = getFieldFilter(scheme, schemePath);
    if (!filterName) {
      throw new ValidationError(`Unable to find filter for field by path '${fieldPath}'.`);
    }

    const context = {
      appLib,
      row: wholeFilter,
      modelSchema: scheme,
      data: {
        fieldPath,
        operation,
        value,
      },
      action: 'view',
      path: schemePath,
    };

    return getFilterFromMetaschema(filterName, context);

    function getFieldFilter(_scheme, _schemePath) {
      if (_schemePath === 'fields._id') {
        return 'objectId';
      }
      return _.get(_scheme, `${_schemePath}.filter`);
    }

    /**
     * Get full path in app scheme including '.fields.'
     * @param _fieldPath - does not include '.fields.' in path
     * @returns {string}
     */
    function getSchemePathByFieldPath(_fieldPath) {
      const parts = _fieldPath.split('.');
      const _schemePath = ['fields'];
      _.each(parts, (part) => {
        const isArrIndexPart = /^\d+$/.test(part);
        if (!isArrIndexPart) {
          _schemePath.push(part);
          _schemePath.push('fields');
        }
      });
      // pop last 'fields' elem
      _schemePath.pop();

      return _schemePath.join('.');
    }
  }

  function getFilterFromMetaschema(metaschemaFilterName, context) {
    const filterSpec = appLib.appModel.metaschema.filters[metaschemaFilterName];
    const { type, value } = _.get(filterSpec, 'where', {});

    if (type === 'function') {
      const filterName = value;
      const filterFunction = appLib.appModelHelpers.FiltersWhere[filterName];
      return filterFunction.call(context);
    }

    if (type === 'code') {
      const functionCode = value;
      const { args, values } = appLib.butil.getDefaultArgsAndValuesForInlineCode();
      return new Function(args, functionCode).apply(context, values);
    }

    if (type === 'reference') {
      const referencedFilterName = value;
      return getFilterFromMetaschema(referencedFilterName, context);
    }
  }

  const customUnaryOperations = {
    undefined(fieldPath) {
      return { [fieldPath]: null };
    },
    notUndefined(fieldPath) {
      return { [fieldPath]: { $ne: null } };
    },
  };

  /**
   * Devexterme filter expression parser.
   * Expression types^
   * 0. Truth check:
   *  - 'fieldPath' => { fieldPath: { $eq: true } }
   *  - ['fieldPath'] => { fieldPath: { $eq: true } }
   * 1. Unary:
   * - logical NOT ['!', _expression_] => { $nor: [_expression_] }
   * - custom unary operations defined in customUnaryOperations
   *
   * 2. Binary
   * - Expression with length of three:
   *  [leftOperand, operator, rightOperand]
   *
   * leftOperand {String} - fieldPath or other nested expression
   * rightOperand {any} - comparision value or other nested expression
   *
   * operators:
   *  - 'and' | 'or' - logical operators
   *  - type operators defined model/helpers/filters.
   *  For example default operators for String are '=', '<>'(not equal), '>', '>=', '<', '<=', 'contains', 'notcontains', 'startswith', 'endswith'
   *  Default operators might be redefined.
   *
   * - Expression with length of three+
   * It assumed that that this is a chain of "or" or "and" -
   *  either one or the other, no combinations
   *  [nestedExpression, operator, nestedExpression, operator, ...rest]
   *  In this case operators are 'or', 'and'.
   *
   * @param expr {String|Array} - current filter expression (it changes while going deeper)
   * @param scheme - scheme for which expression is specified
   * @param wholeExpression - entire filter expression
   * @return {Object} - mongo query
   */
  m.parse = function parse(expr, scheme, wholeExpression = expr) {
    if (!scheme) {
      throw new ValidationError('Parameter scheme must be specified.');
    }

    let expression;
    try {
      // string expr as array
      expression = RJSON.parse(expr);
    } catch (e) {
      // simple string or Array type
      expression = expr;
    }
    if (_.isEmpty(expression)) {
      return {};
    }

    if (_.isString(expression)) {
      return getFilterForField(expression, '=', true, scheme);
    }

    if (!_.isArray(expression)) {
      throw new ValidationError('Unexpected expression type. Expresion types expected: String, Array.');
    }

    const isNestedExpression = expression.length === 1 && expression[0].length;
    if (isNestedExpression) {
      return parse(expression[0], scheme, wholeExpression);
    }

    const isUnaryOperator = expression.length === 2;
    if (isUnaryOperator) {
      if (expression[0] === '!') {
        const nor = parse(expression[1], scheme, wholeExpression);
        return nor ? { $nor: [nor] } : null;
      }

      const fieldPath = expression[0];
      const operationName = expression[1];
      const unaryOperation = customUnaryOperations[operationName];
      if (unaryOperation) {
        return unaryOperation(fieldPath);
      }

      // Extend the array size to three to handle "unary" operations specific for fieldPath type.
      // For example ['string', 'empty'] to ['string', 'empty', undefined] since value does not matter.
      expression.push(undefined);
    }

    if (expression.length % 2 !== 1) {
      throw new ValidationError(`Elements with odd size>3 are invalid: '${expr}'`);
    }

    // odd number of expressions - must be single connecting operator
    const operator = expression[1];
    const isLogicalOperator = ['and', 'or'].includes(operator);

    if (isLogicalOperator) {
      const hasAnotherOperator = expression.find((el, i) => i % 2 === 1 && el.toLowerCase() !== operator);

      if (hasAnotherOperator) {
        throw new ValidationError(
          `For expressions with 5+ size there must be only one connecting operator 'and' or 'or'.`
        );
      }

      const result = {};

      result[`$${operator}`] = expression
        .filter((el, i) => i % 2 === 0)
        .map((el) => parse(el, scheme))
        .map((cond) => cond);

      return result;
    }

    if (expression.length === 3) {
      const fieldName = expression[0];
      const value = expression[2];

      return getFilterForField(fieldName, operator, value, scheme, wholeExpression);
    }

    throw new ValidationError(`Incorrect expression ${expression}`);
  };

  return m;
};
