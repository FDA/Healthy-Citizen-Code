;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('MediaTypesCellRenderer', MediaTypesCellRenderer);

  /** @ngInject */
  function MediaTypesCellRenderer(
    AdpFilePathService,
    FormattersHelper,
    GRID_FORMAT
  ) {
    function fileList(args) {
      var files = args.data;
      if (_.isEmpty(files)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var interpolationRegex = /\${([^\}]+)}/g;

      if (FormattersHelper.asText(args)) {
        return files.map(function(file) {
          return file.name
        }).join(', ');
      }

      var listItemTpl = [
        '<li>',
        '<a class="datatable-thumb-url" href="${downloadUrl}" target="_blank">',
        '<img src=${thumbUrl} class="img-responsive"> ${name}',
        '</a>',
        '</li>',
      ].join('');

      var replaceCb = function(fileItem, _placeholder, placeholderName) {
        var fnName;
        if (placeholderName === 'downloadUrl') {
          return AdpFilePathService.download(fileItem);
        }

        if (placeholderName === 'thumbUrl') {
          fnName = fileItem.cropped ? 'cropped' : 'thumb';
          return AdpFilePathService[fnName](fileItem) + '?v=' + new Date().valueOf();
        }

        return fileItem[placeholderName];
      };

      var fileListTpl = files.map(function(file) {
        return listItemTpl.replace(interpolationRegex, replaceCb.bind(this, file));
      }).join('');

      return ['<ul class="datatable-thumb-list">', fileListTpl, '</ul>'].join('');
    }

    return {
      fileList: fileList,
    }
  }
})();
