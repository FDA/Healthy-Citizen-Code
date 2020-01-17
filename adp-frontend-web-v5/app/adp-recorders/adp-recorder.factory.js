;(function () {
  angular
    .module('app.adpRecorders')
    .factory('AdpRecorderFactory', AdpRecorderFactory);

  function AdpRecorderFactory(AdpNotificationService, $log) {
    return {
      mix: mix
    };

    function mix($scope, $element, type) {
      $scope.readyToSave = false;
      $scope.type = type;

      var VIEWPORT_STRATEGIES = {
        'audio': createAudioNode,
        'video': createMovieNode,
        'image': createImageNode,
      };

      function createMovieNode() {
        return createVideoNode( 'adp-video-recorder' );
      }

      function createImageNode() {
        return createVideoNode( 'adp-photo-recorder' );
      }

      function createAudioNode() {
        var node = new Audio();
        node.id = 'player_' + $scope.$id;
        node.className = 'video-js vjs-default-skin';

        return node;
      }

      function createVideoNode( className ) {
        var node = document.createElement('video');
        node.id = 'player_' + $scope.$id;
        node.className = 'video-js vjs-default-skin ' + className;

        return node;
      }

      $scope.init = function (defaults) {
        if (!$scope.DEFAULTS) {
          $scope.DEFAULTS = defaults;
        }

        $scope.setup();

        $scope.viewportNode = VIEWPORT_STRATEGIES[$scope.type]();
        $element[0]
          .querySelector('.adp-recorder-viewport')
          .appendChild($scope.viewportNode);

        $scope.player = videojs($scope.viewportNode.id, $scope.options);
        $scope.bindEvents();
      };

      $scope.setup = function () {
        $scope.options = _.merge($scope.DEFAULTS, $scope.options);
      };

      $scope.reInit = function () {
        destroyPlayer($scope);
        $scope.init();
      };

      $scope.bindEvents = function () {
        $scope.player.on('finishRecord', finishRecordHandler.bind(this, $scope));
        $scope.player.on('deviceError', deviceErrorHandler.bind(this, $scope));
        registerDestroyPlayerHandler($scope);
      };

      function finishRecordHandler($scope) {
        $scope.resultFile = $scope.player.recordedData;
        $scope.$digest();
      }

      function deviceErrorHandler($scope) {
        if ($scope.player.deviceErrorCode.message === 'DevicesNotFoundError') {
          AdpNotificationService.notifyError('Recording device is busy by another application or browser tab.');
        }

        $log.debug('Device error:', $scope.player.deviceErrorCode);
      }

      function registerDestroyPlayerHandler($scope) {
        // WORKAROUND: register $destroy listener only once
        var fnName = 'bound ' + destroyPlayer.name;
        var listenerRegistered = _.findIndex($scope.$$listeners['$destroy'], function (fn) {
          return fn.name === fnName;
        });

        if (listenerRegistered < 0) {
          $scope.$$listeners['$destroy'].push(destroyPlayer.bind(this, $scope));
        }
      }

      var DESTROY_ENGINE_STRATEGIES = {
        'lamejs': function (engine, type) {
          closeAduioContext(engine, type);

          engine.engine.terminate();
          $log.debug('Worker terminated for ', type)
        },
        'recorder.js': function (engine, type) {
          closeAduioContext(engine, type);

          engine.engine.worker.terminate();
          $log.debug('Worker terminated for ', type)
        }
      };

      function destroyPlayer($scope) {
        var engine = $scope.player.record().engine;
        var engineType = getEngine($scope.player);

        if (engine && DESTROY_ENGINE_STRATEGIES[engineType]) {
          DESTROY_ENGINE_STRATEGIES[engineType](engine, engineType);
        }

        $scope.player.record().stopDevice();
        $scope.player.dispose();
        delete $scope.player;
        angular.element($scope.viewportNode).remove();
      }

      function getEngine(player) {
        return player.record().audioEngine;
      }

      function closeAduioContext(engine, engineType) {
        if (engine.audioContext.state == 'running') {
          engine.audioContext
            .close()
            .then(function () {
              $log.debug('Audio context closed for ', engineType)
            });
        }
      }
    }
  }
})();
