(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('locationControl', locationControl);

  function locationControl(
    AdpValidationUtils,
    AdpGeoLocationService,
    NgMap,
    $q,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/location-control/location-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;
        scope.getterSetterForLabel = function (value) {
          var currentValue = getterSetterFn();
          if (arguments.length) {
            currentValue.label = value;
            return getterSetterFn(currentValue);
          }

          return currentValue.label;
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);

        var mapDefaults = {
          center: [37.753344,-122.409668],
          zoom: 16,
          markerPosition: [37.753344,-122.409668]
        };

        var fieldDataDefaults = {
          coordinates: [],
          label: '',
        };

        if (_.isEmpty(getData())) {
          getterSetterFn(fieldDataDefaults);
        }

        var fieldParamsDefaults = {
          autodetect: true,
          showMap: true,
          showLocate: true,
          showAddress: true
        };

        scope.form = formCtrl;

        scope.detecting = false;
        scope.isReady = false;

        scope.fieldParams = _.extend(fieldParamsDefaults, _.get(scope, 'args.fieldSchema.parameters'));
        scope.map = {};

        (function init() {
          var setupMapPromise = scope.fieldParams.showMap ? setupMap : $q.when;

          AdpGeoLocationService.isReady()
            .then(function() {
              scope.isReady = true;
            })
            .then(setupMapPromise)
            .then(setInitialValuePromise);
        })();

        function getData() {
          return getterSetterFn();
        }

        function setInitialValuePromise() {
          var coordinates = getData().coordinates;
          var isEmpty = _.compact(coordinates).length === 0;

          if (!isEmpty) {
            return coordsToAddress(coordinates);
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
          var coordinates = getData().coordinates;
          coordinates[0] = scope.map.center[0];
          coordinates[1] = scope.map.center[1];

          setAddress(address);
          scope.detecting = false;

          return;
        }

        function setAddress(address) {
          var location = getData();
          location.label = address;
        }

        function setCenter() {
          var latLng = new google.maps.LatLng(scope.map.center[0], scope.map.center[1]);
          scope.marker.setPosition(latLng);
          scope.mapInstance.setCenter(latLng);
        }

        function setFormValidity(status) {
          var fieldName = scope.args.fieldSchema.fieldName;
          scope.form[fieldName].$setValidity('location', status);
          scope.form[fieldName].$setDirty();
        }

        // events
        scope.detect = detect;

        scope.onClick = function(e) {
          scope.map.center = [e.latLng.lat(), e.latLng.lng()];
          scope.map.markerPosition = _.clone(scope.map.center);

          coordsToAddress(scope.map.center);
        };

        // sync input with map
        scope.placeChanged = function() {
          var place = this.getPlace();
          var promise = !!place.geometry ? $q.when(place) : AdpGeoLocationService.geocode(place);

          promise
            .then(function(place) {
              if (place.geometry) {
                scope.map.center = [place.geometry.location.lat(), place.geometry.location.lng()];
                scope.map.markerPosition = _.clone(scope.map.center);

                setData(place.formatted_address);
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
