// eslint-disable-next-line max-classes-per-file
const pty = require('node-pty');
const _ = require('lodash');

const subscriptionType = 'webTerminal';

const defaultPresetName = 'bash';
const defaultPreset = {
  shell: 'bash',
  args: [],
  params: {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env,
  },
};

const presets = {
  bash: {
    shell: 'bash',
    args: [],
    params: {
    }
  },
  trino: {
    shell: 'trino',
    args: appLib => ([
      '--server', appLib.config.TRINO_URI,
      '--catalog', appLib.config.TRINO_CATALOG,
      '--schema', appLib.config.TRINO_SCHEMA,
    ]),
  }
}

function getPtyParamsPreset(appLib, presetName) {
  const preset = presets[presetName] || presets[defaultPresetName] || {};

  _.each(['shell', 'args', 'params'], key => {
    let value = preset[key] || defaultPreset[key];

    if (_.isFunction(value)) {
      preset[key] = value(appLib)
    } else if (_.isObject(value) && _.isObject(defaultPreset[key])) {
      preset[key] = _.defaults(value, defaultPreset[key]);
    } else {
      preset[key] = value;
    }
  })

  return preset;
}

function getSocketMessage(cmd, data) {
  const payload = {type: subscriptionType, data: {cmd}};

  if (data) {
    payload.data.data = data;
  }

  return payload;
}

class WebTerminal {
  constructor(appLib, uid, socket, presetName) {
    this.setSocket(socket);
    this._spawnTerminal(appLib, presetName);
  }

  _spawnTerminal(appLib, presetName) {
    const preset = getPtyParamsPreset(appLib, presetName);

    this.pty = pty.spawn(preset.shell, preset.args, preset.params);

    this.pty.onData((data) => this.emit('data', data));
    this.pty.onExit((codes) => this.emit('exit', codes));
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setData(data) {
    data && this.pty.write(data);
  }

  resize(resize) {
    resize && this.pty.resize(resize.cols, resize.rows);
  }

  destroy() {
    this.pty.kill();
  }

  emit(cmd, data) {
    this.socket.emit('message', getSocketMessage(cmd, data));
  }
}

class WebTerminalManager {
  constructor(appLib) {
    this.storage = {};
    this.appLib = appLib;
  }

  _getTerminal(uid) {
    return this.storage[uid];
  }

  _setTerminal(uid, terminal) {
    this.storage[uid] = terminal;
  }

  _removeTerminal(uid) {
    delete this.storage[uid];
  }

  init({uid, socket, data}) {

    let terminal = this._getTerminal(uid);
    if (!terminal) {
      const presetName = _.get(data, 'presetName');

      terminal = new WebTerminal(this.appLib, uid, socket, presetName);
      this._setTerminal(uid, terminal);
    }

    terminal.emit('init');
  }

  destroy({uid}) {
    const terminal = this._getTerminal(uid);
    if (terminal) {
      terminal.destroy();
      this._removeTerminal(uid);
    }
  }

  reconnect({uid, socket}) {
    const terminal = this._getTerminal(uid);
    terminal && terminal.setSocket(socket);
  }

  resize({uid, data}) {
    const terminal = this._getTerminal(uid);
    terminal && terminal.resize(data);
  }

  data({uid, data}) {
    const terminal = this._getTerminal(uid);
    terminal && terminal.setData(data);
  }
}

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;
    m.terminalManager = new WebTerminalManager(appLib);
    m.processMessage = ({socket, data}) => {
      const payloadData = data.data;
      const {uid, cmd, data: commandData} = payloadData;

      if (m.terminalManager[cmd]) {
        try {
          m.terminalManager[cmd]({uid, data: commandData, socket});
        } catch (e) {
          const payload = getSocketMessage('error', {error: e.message || e});

          socket.emit('message', payload);
        }
      }
    };

    appLib.ws.addSubscription(subscriptionType, m.processMessage);
  };

  return m;
};
