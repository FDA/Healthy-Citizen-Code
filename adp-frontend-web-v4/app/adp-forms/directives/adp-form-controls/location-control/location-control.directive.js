(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('locationControl', locationControl);

  function locationControl(
    AdpGeoLocationService,
    NgMap,
    $q
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/location-control/location-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        var mapDefaults = {
          center: [37.753344,-122.409668],
          zoom: 16,
          markerPosition: [37.753344,-122.409668]
        };

        var fieldParamsDefaults = {
          autodetect: true,
          showMap: true,
          showLocate: true,
          showAddress: true
        };

        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || [];
        scope.labelName = scope.field.keyName + '_label';
        scope.adpFormData[scope.labelName] = scope.adpFormData[scope.labelName] || '';

        scope.form = formCtrl;

        scope.detecting = false;
        scope.isReady = false;

        scope.fieldParams = _.extend(fieldParamsDefaults, scope.field.parameters);
        scope.map = {};

        function init() {
          var setupMapPromise = scope.fieldParams.showMap ? setupMap : $q.when;

          AdpGeoLocationService.isReady()
            .then(function() {
              scope.isReady = true;
            })
            .then(setupMapPromise)
            .then(setInitialValuePromise);
        }
        init();

        function setInitialValuePromise() {
          if (!_.isEmpty(scope.adpFormData[scope.field.keyName])) {
            return coordsToAddress(scope.adpFormData[scope.field.keyName]);
          }

          if (scope.fieldParams.autodetect) {
            return detect();
          }

          return $q.when();
        }

        function setupMap() {
          scope.map = _.clone(mapDefaults);

          return NgMap.getMap()
            .then(function(map) {
              scope.mapInstance = map;
              scope.marker = map.markers[0];
              return;
            });
        }

        function detect() {
          onDetectStart();

          return AdpGeoLocationService.getLocation()
            .then(coordsToAddress)
            .then(setFormValidity.bind(this, true));
        }

        function onDetectStart() {
          scope.detecting = true;
          setAddress('');
        }

        function coordsToAddress(coords) {
          onDetectStart();

          scope.map.center = coords;
          scope.map.markerPosition = _.clone(scope.map.center);

          if (scope.mapInstance) {
            setCenter();
          }

          return AdpGeoLocationService.reverseGeocode(scope.map.center)
            .then(setData);
        }

        function setData(address) {
          scope.adpFormData[scope.field.keyName] = scope.map.center;
          setAddress(address);
          scope.detecting = false;
          return;
        }

        function setAddress(address) {
          scope.adpFormData[scope.labelName] = address;
        }

        function setCenter() {
          var latLng = new google.maps.LatLng(scope.map.center[0], scope.map.center[1]);
          scope.marker.setPosition(latLng);
          scope.mapInstance.setCenter(latLng);
        }

        function setFormValidity(status) {
          scope.form[scope.field.keyName].$setValidity('location', status);
          scope.form[scope.field.keyName].$setDirty();
        }

        // events
        scope.detect = detect;

        scope.onClick = function(e) {
          scope.map.center = [e.latLng.lat(), e.latLng.lng()];
          scope.map.markerPosition = _.clone(scope.map.center);

          coordsToAddress(scope.map.center);
        };

        scope.placeChanged = function() {
          var place = this.getPlace();
          var promise = !!place.geometry ? $q.when(place) : AdpGeoLocationService.geocode(place.name);

          promise
            .then(function(place) {
              if (place.geometry) {
                scope.map.center = [place.geometry.location.lat(), place.geometry.location.lng()];
                scope.map.markerPosition = _.clone(scope.map.center);

                setData(place.name);
                setCenter();
              }

              setFormValidity(!!place.geometry);
            });
        };

        scope.preventSubmitOnEnter = function(e) {
          if (e.keyCode === 13) {
            e.preventDefault();
          }
        }
      }
    }
  }
})();
