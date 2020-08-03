(function () {
  'use strict'

  var WorkerClient = ace.require('ace/worker/worker_client').WorkerClient;
  var Json5de = ace.require('ace/mode/python').Mode;

  function Json5deWithWorker() {
    Json5de.apply(this, arguments);
  }

  Json5deWithWorker.prototype = Object.create(Json5de.prototype);

  Json5deWithWorker.prototype.createWorker = function (session) {
    var worker = new WorkerClient(['ace'], 'ace/mode/json5_worker', 'WorkerModule')
    worker.attachToDocument(session.getDocument())

    worker.on('annotate', function (results) {
      session.setAnnotations(results.data);
    });

    worker.on('terminate', function () {
      session.clearAnnotations();
    });

    return worker;
  };

  angular
    .module('app.adpForms')
    .factory('Json5onEditorMode', function () {
      return Json5deWithWorker;
    });
})();
