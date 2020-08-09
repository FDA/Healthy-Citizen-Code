(function ()
{
    'use strict';

    angular
        .module('app.core')
        .factory('hcFlashService', hcFlashService);

    /** @ngInject */
    function hcFlashService($rootScope)
    {
        var message = {};
        var service = {
            message: message,
            emit: emit,
            setMessage: setMessage,
            getMessage: getMessage,
            success: success,
            warning: warning,
            error: error,
            info: info,
            errorParse: errorParse
        };

        return service;


        // Methods

    		function emit () {
    			  $rootScope.$emit("event:flashMessage");
    		};

    		function setMessage (message, type) {
      			var item, i;

      			if (typeof message === 'object') {
        				for (item in message) {
          					if (message.hasOwnProperty(item)) {
      						    this.message = {
              							message: message[item],
              							type: type
            						};

            						this.emit();
          					}
        				}
      			} else if (_.isArray(message)) {
        				for (i = 0; i < message.length; i += 1) {
          					this.message = {
            						message: message[i],
            						type: type
          					};

          					this.emit();
        				}
      			} else {
        				this.message = {
          					message: message,
          					type: type
        				};

        				this.emit();
      			}
    		};

    		function getMessage () {
    			  return this.message;
    		};

    		function success (message) {
    			  this.setMessage(message, 'success');
    		};

    		function warning (message) {
    			  this.setMessage(message, 'warning');
    		};

    		function error (message) {
    			  this.setMessage(message, 'error');
    		};

    		function info (message) {
    			  this.setMessage(message, 'info');
    		};

    		function errorParse (error) {
      			if (error.payload) {
        				error.payload.forEach(function (e) {
        					  this.setMessage(e, 'error');
        				});
      			} else {
      				  this.setMessage(error.message, 'error');
      			}

    		};

    };
})();
