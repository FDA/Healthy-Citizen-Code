(function ()
{
    'use strict';

    /**
     * Main module of the Fuse
     */
    angular
        .module('fuse', [

            // Core
            'app.core',

            // Navigation
            'app.navigation',

            // Toolbar
            'app.toolbar',

            // User
            // 'app.user',

            // Settings
            // 'app.settings',

            // Pages Generator
            'app.generator',

            // Config
            'app.config',

            // Login
            'app.auth',

            'app.homePage'
        ]);
})();
