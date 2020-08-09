class Logger {
  constructor(options) {
    const defaultOptions = {
      level: 'log',
      logger: console,
      isDebug: __DEV__,
      timestamp: false,
      colors: {
        log: 'inherit',
        debug: '#03A9F4',
        warn: '#4CAF50',
        error: '#F20404'
      }
    };

    this.levels = ['log', 'debug', 'warn', 'error'];
    this.options = Object.assign({}, defaultOptions, options);
    this.send = this.send.bind(this);
  }

  send(currentLevel = 'log', args) {
    const {level, logger, isDebug, timestamp, colors} = this.options;

    if (isDebug && this.levels.indexOf(level) <= this.levels.indexOf(currentLevel)) {
      const attributes = ['%c', `color: ${colors[currentLevel]}`];

      if (timestamp) {
        attributes.push(new Date().toString());
      }

      logger.log.apply(logger, attributes.concat(args));
    }
  }

  log(...args) {
    this.send('log', args);
  }

  info(...args) {
    this.send('log', args);
  }

  debug(...args) {
    this.send('debug', args);
  }

  warn(...args) {
    this.send('warn', args);
  }

  error(...args) {
    this.send('error', args);
  }
}

const logger = new Logger();

export default logger;
