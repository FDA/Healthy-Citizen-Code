/**
 * FormRenderers are used to render data in forms only and only used on the frontend, so avoid using ES6 here
 *
 * Each renderer receives this fixed set of parameters:
 * data - data item for current model field
 * row - all data item for current model
 * modelSchema - model specification
 */

module.exports = function () {
  var m = {
    questionaire: function (data, row, modelSchema) {
      if (_.isEmpty(data)) {
        return '-';
      }

      var stripHtml = function (string) {
        return string.replace(/<(?:.|\n)*?>/gm, '');
      };

      var getQuestionText = function (question) {
        if (_.isArray(question)) {
          return question.join('');
        }

        if (_.isObject(question)) {
          return JSON.stringify(question);
        }

        return question;
      };

      var objName = _.keys(data)[0];
      var obj = data[objName];
      var html = '';
      var cnt = 0;

      if (_.isString(obj)) {
        return obj;
      }

      _.each(obj, function (v) {
        var row = [],
          question = getQuestionText(v.question);

        cnt++;

        row.push('<b>Question #' + cnt + ':</b> ' + v.fullName);
        row.push('<b>Question text:</b> ' + stripHtml(question));
        row.push('<b>Type:</b> ' + v.type);

        if (v['fhir']) {
          row.push('<b>FHIR:</b> ' + v['fhir']);
        }

        if (v['options']) {
          row.push('<b>Options:</b><br>' + v.options.join('<br>'));
        }

        html += row.join('<br>') + '<br><br>';
      });

      return ['<div class="cell-questionaire">', html, '</div>'].join('');
    },
  };

  return m;
};
