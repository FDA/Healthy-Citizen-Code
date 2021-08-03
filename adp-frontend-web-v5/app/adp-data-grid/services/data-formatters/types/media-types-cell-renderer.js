;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('MediaTypesCellRenderer', MediaTypesCellRenderer);

  /** @ngInject */
  function MediaTypesCellRenderer(
    FormattersHelper,
    GRID_FORMAT,
    AdpMediaTypeHelper
  ) {
    function fileList(args) {
      var files = args.data;
      if (_.isEmpty(files)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      if (FormattersHelper.asText(args)) {
        return files.map(function(file) {
          return file.name;
        }).join(', ');
      }

      var listItemTpl = function (fileItem, src) {
        return [
          '<li>',
            '<a class="datatable-thumb-url" href data-file-id="' + fileItem.id + '">',
              '<img src="' + src + '" class="img-responsive"> ' + fileItem.name,
            '</a>',
          '</li>',
        ].join('');
      }

      var ul = $('<ul class="datatable-thumb-list"></ul>');
      ul.on('click', function (e) {
        if (e.target.classList.contains('datatable-thumb-url')) {
          e.preventDefault();

          var fileId = e.target.getAttribute('data-file-id');
          var file = _.find(files, ['id', fileId]);

          AdpMediaTypeHelper.downloadWithSaveDialog(file);
        }
      });

      Promise.all(files.map(function (fileItem) {
        var fnName = fileItem.cropped ? 'getCroppedImgLink' : 'getThumbImgLink';

        return AdpMediaTypeHelper[fnName](fileItem)
          .then(function (src) {
              return { src: src, fileItem: fileItem };
          });
      }))
        .then(function (fileItems) {
          var listItems = fileItems.map(function (file) {
            return $(listItemTpl(file.fileItem, file.src));
          });

          ul.append(listItems);
        });

      return ul;
    }

    return { fileList: fileList };
  }
})();
