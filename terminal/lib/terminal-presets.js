const defaultPresetName = "bash";
const defaultPreset     = {
    shell  : "bash",
    args   : [],
    params : {
        name : "xterm-color",
        cols : 80,
        rows : 30,
        cwd  : process.env.HOME,
        env  : process.env,
    },
    fullName    : "",  // Label for menu item
    link        : "",  // page path
    permissions : "",  // permission name which controls 'view' action, if required.
};

const presets = {
    bash  : {
        shell       : "bash",
        args        : [],
        params      : {},
        fullName    : "Web Terminal",
        link        : "/web-terminal",
        permissions : "accessWebTerminal",
    },
    trino : {
        shell       : "trino",
        args        : appLib => ([
            "--server", appLib.config.TRINO_URI,
            "--catalog", appLib.config.TRINO_CATALOG,
            "--schema", appLib.config.TRINO_SCHEMA,
        ]),
        fullName    : "Trino Terminal",
        link        : "/trino-terminal",
        permissions : "accessTrinoTerminal",
    }
}

module.exports = {
    defaultPresetName,
    defaultPreset,
    presets
}
