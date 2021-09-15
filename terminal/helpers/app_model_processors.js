const _ = require( "lodash" );
const { presets: terminalPresets } = require( "../lib/terminal-presets" );

/**
 * Entire module will be passed to ejs as data to process app model schemes
 * @returns {{}}
 */
module.exports = (appLib) => {
    const m = {};
    const disabledPresets = appLib.config.TERMINAL_DISABLE_PRESETS.split(',') || [];
    const enabledPresets = _.pickBy( terminalPresets, ( v, name ) => _.indexOf( disabledPresets, name ) < 0 );

    m.terminalMenuFields = function() {
        const schema = {};

        _.each( enabledPresets, ( p, presetName ) => {
            const fullName = p.fullName || `${ presetName } Terminal`;
            const link =  `/${ presetName }-terminal`;
            const fieldSchema = {
                type     : "MenuItem",
                fullName, link
            }

            if( p.permissions ) {
                fieldSchema.scopes = {
                    view : {
                        permissions : p.permissions
                    }
                }
            }

            const fieldKey = `${ presetName }Terminal`;
            schema[ fieldKey ] = fieldSchema;
        } );

        return JSON.stringify(schema);
    };

    m.terminalPages = function() {
        const schema = {};

        _.each( enabledPresets, ( p, presetName ) => {
            const fullName = p.fullName || `${ presetName } Terminal`;
            const link =  p.link || `/${ presetName }-terminal`;
            const pageSchema = {
                link, fullName,
                cssClass:  'stick-to-screen',
                template   : { type : "file", link : "page_web_terminal.template.ejs" },
                controller : "AdpWebTerminal",
                parameters : { presetName },
            }

            if( p.permissions ) {
                pageSchema.scopes = {
                    view : {
                        permissions : { view : p.permissions }
                    }
                }
            }

            const pageKey = `${ presetName }Terminal`;
            schema[ pageKey ] = pageSchema;
        } );

        return JSON.stringify(schema);
    };

    return m;
};
