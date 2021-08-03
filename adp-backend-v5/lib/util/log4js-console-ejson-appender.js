const _ = require('lodash');
const { EJSON } = require('bson');

// This is modified version of default 'console' appender.
module.exports = (options = {}) => {
  const { space } = options;
  const consoleLog = console.log.bind(console);

  return {
    configure(config, layouts) {
      let layout = layouts.colouredLayout;
      if (config.layout) {
        layout = layouts.layout(config.layout.type, config.layout);
      }

      return (loggingEvent) => {
        loggingEvent.data = loggingEvent.data.map((data) => {
          if (!_.isPlainObject(data)) {
            return data;
          }
          try {
            return EJSON.stringify(data, null, space);
          } catch (e) {
            // If data has circular dependencies or other issues then log it with default console.log
            return data;
          }
        });
        consoleLog(layout(loggingEvent, config.timezoneOffset));
      };
    },
  };
};
