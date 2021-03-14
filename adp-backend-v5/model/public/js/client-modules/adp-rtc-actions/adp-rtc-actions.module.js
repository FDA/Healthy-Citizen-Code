(function () {
  'use strict';

  angular.module('app.adpRtcActions', [])
    .factory('AdpRtcActions', AdpRtcActions);

  /** @ngInject */
  function AdpRtcActions(
    AdpClientCommonHelper,
    AdpModalService,
    $interval
  ) {
    var gridChangeNotificationShownFlag = false;
    var collectionChangeNames = {
      // This data has changed. Do you want to _reload this view_?
      recorddeleted:  'Record on this page is removed by another user',
      recordupdated:  'Record on this page is updated by another user',
      recordcreated:  'New record has been added to this collection by another user',
      // collectionCreated: "Collection created",   //Yet not useful - only collection-related events are processed
      // collectionDeleted: "Collection removed",
    }

    function doRegisterGridDbChangeNotification() {
      var minPause = _.get(this, 'fieldSchema.action.params.minTimeBetweenReloads', 1000);
      var getGridComponent = _.bind(function () { return _.get(this, 'customGridOptions.gridComponent') }, this);

      this.notificationFn = _.debounce(gridChangeNotification, minPause);

      return getReloadNotificationProcessor(this.notificationFn, getGridComponent, this.modelSchema, this.fieldSchema);
    }

    function doRegisterGridDbChangeAutoreload() {
      var minPause = _.get(this, 'fieldSchema.action.params.minTimeBetweenReloads', 1000);
      var maxPause = _.get(this, 'fieldSchema.action.params.maxTimeBetweenReloads', -1);
      var bindedReloader = _.bind(function () {
        var gridComponent = _.get(this, 'customGridOptions.gridComponent');
        gridComponent && gridComponent.refresh();
      }, this);
      var reloaderFn = _.debounce(bindedReloader, minPause);

      if (maxPause > 0) {
        this.autoReloadInterval = $interval(reloaderFn, maxPause);
      }

      return getAutoReloadProcessor(reloaderFn, this.modelSchema, this.fieldSchema);
    }

      doRegisterGridDbChangeNotification.onUnsubscribe =
      // Optional method. To be called at the moment RTC processor is unregistered (normally on dxGrid's dispose).
      // Supported for "rtc" actions only.
      function () {
        this.notificationFn && this.notificationFn.cancel();
      }
      doRegisterGridDbChangeAutoreload.onUnsubscribe =
      // Optional method. To be called at the moment RTC processor is unregistered (normally on dxGrid's dispose).
      // Supported for "rtc" actions only.
      function () {
        this.autoReloadInterval &&  $interval.cancel(this.autoReloadInterval);
      }

    return {
      gridDbChangeNotification: doRegisterGridDbChangeNotification,
      gridDbChangeAutoreload: doRegisterGridDbChangeAutoreload
    }

    function getAutoReloadProcessor(reloaderFn, schema, action) {
      return function (data) {
        if (isMessageAppliable(schema, data, action)) {
          reloaderFn();
        }
        return true;
      }
    }

    function getReloadNotificationProcessor(notificationFn, getGridComponent, schema, action) {
      return function (data) {
        if (!gridChangeNotificationShownFlag && isMessageAppliable(schema, data, action)) {
          const gridComponent = getGridComponent();
          if (isNotificationRequired(data, gridComponent)) {
            notificationFn(data, gridComponent);
          }
        }
        return true;
      }
    }

    function isNotificationRequired(data, gridComponent) {
      if (gridComponent === undefined) {
        return false;
      }

      var changeType = _.get(data, 'data.change');
      if (changeType === 'recordcreated') {
        return true;
      }

      var alteredRecordId = _.get(data, 'data._id');
      if (alteredRecordId === undefined ) {
        return false;
      }
      var visibleRows = gridComponent.getVisibleRows();
      var isAlteredRecordVisible = _.find(visibleRows, function (row) {
        return row.rowType === 'data' && row.data._id === alteredRecordId;
      })
      return isAlteredRecordVisible;
    }

    function gridChangeNotification(data, gridComponent) {
      var changeType = _.get(data, 'data.change');
      var message = collectionChangeNames[changeType] || changeType;

      AdpModalService.confirm({
          message: message,
          backdropClass: 'adp-hide-backdrop',
          windowClass: 'adp-dialog-not-modal',
          okButtonText: 'Reload data',
          timeOut: 0,
          preventDuplicates: true
        })
        .then(function () {
          gridComponent && gridComponent.refresh();
          gridChangeNotificationShownFlag = false;
        })
        .catch(function () {
          gridChangeNotificationShownFlag = false;
        });

      gridChangeNotificationShownFlag = true;
    }

    function isMessageAppliable(schema, data, action)   {
      var type = _.get(data, 'type');
      if (type !== 'database') {
        return false;
      }

      var currentSchemaName = _.get(schema, 'schemaName');
      var messageCollectionName = _.get(data, 'data.collection');
      var isCurrentSchema = messageCollectionName === currentSchemaName;
      if (isCurrentSchema) {
        return true;
      }

      var actionChangeType = _.get(action, 'action.params.changeType');
      if (!_.isUndefined(actionChangeType)) {
        var messageChangeType = _.get(data, 'data.change');
        var isCollectionRelatedChange = messageChangeType.startsWith('collection')

        if (_.isString(actionChangeType)) {
          actionChangeType = [actionChangeType];
        }

        return _.indexOf(actionChangeType, messageChangeType)>=0 && (isCollectionRelatedChange || isCurrentSchema)
      }

      return false;
    }
  }
})();
