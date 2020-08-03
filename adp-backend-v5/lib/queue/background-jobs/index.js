module.exports = {
  jobs: {
    aiml: require('./aiml'),
    bpmn: require('./bpmn'),
    dmn: require('./dmn'),
    scg: require('./scg'),
    externalCommands: require('./external-commands'),
  },
  util: require('./util'),
  processorContext: require('./processor-context'),
};
