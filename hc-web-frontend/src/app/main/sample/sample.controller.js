(function ()
{
    'use strict';

    angular
        .module('app.sample')
        .controller('SampleController', SampleController);

    /** @ngInject */
    function SampleController(SampleData)
    {
        var vm = this;

        // Data
        vm.helloText = SampleData.data.helloText;
        vm.userSchema = {
            "firstName": {
                "type": "String",
                "trim": true,
                "default": ""
            },
            lastName: {
                type: "String",
                trim: true,
                default: ''
            },
            displayName: {
                type: "String",
                trim: true
            },
            email: {
                type: "String",
                trim: true,
                default: '',
                match: [/.+\@.+\..+/, 'Please enter a valid email address']
            },
            username: {
                type: "String",
                unique: 'testing error message',
                required: 'Please fill in a username',
                trim: true
            },
            password: {
                type: "String",
                default: ''
            },
            salt: {
                type: "String"
            },
            provider: {
                type: "String",
                required: 'Provider is required'
            },
            providerData: {},
            additionalProvidersData: {},
            updated: {
                type: "Date"
            },
            created: {
                type: "Date",
                default: Date.now
            },
            /* For reset password */
            resetPasswordToken: {
                type: "String"
            },
            resetPasswordExpires: {
                type: "Date"
            }
        };



        // Methods

        //////////
    }
})();
