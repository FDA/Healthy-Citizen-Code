;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .constant('CKEDITOR_TOOLBAR', [
      { name: 'previewGroup', items: ['Preview', 'PasteFromWord'] },
      { name: 'historyGroup', items: ['Undo', 'Redo'] },
      { name: 'textGroup', items: ['Bold', 'Italic', 'Underline'] },
      { name: 'listGroup', items: ['NumberedList', 'BulletedList'] },
      { name: 'linkGroup', items: ['Link', 'Unlink', 'Table', 'Image',  'Outdent', 'Indent', 'Collapse'] },
      '/',
      { name: 'document', items: [ 'Sourcedialog', 'Save', 'NewPage', 'Print', 'Templates' ] },
      { name: 'clipboard', items: [ 'Cut', 'Copy', 'Paste', 'PasteText' ] },
      { name: 'editing', items: [ 'Find', 'Replace', 'SelectAll', 'Scayt' ] },
      { name: 'forms', items: [ 'Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton',] },
      '/',
      { name: 'basicstyles', items: [ 'Strike', 'Subscript', 'Superscript', 'CopyFormatting', 'RemoveFormat' ] },
      { name: 'paragraph', items: ['Blockquote', 'CreateDiv', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', 'BidiLtr', 'BidiRtl', 'Language' ] },
      { name: 'links', items: [ 'Anchor' ] },
      { name: 'insert', items: [ 'Flash', 'HorizontalRule', 'Smiley', 'SpecialChar', 'PageBreak', 'Iframe' ] },
      '/',
      { name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
      { name: 'colors', items: [ 'TextColor', 'BGColor' ] },
      { name: 'tools', items: [ 'Maximize', 'ShowBlocks' ] },
    ]);
})();
