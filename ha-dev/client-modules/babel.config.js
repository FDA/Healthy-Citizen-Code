const presets = [
  [
    '@babel/env',
    {
      useBuiltIns: 'entry',
      modules: false,
    },
  ],
];

const plugins = [
  '@babel/plugin-transform-runtime',
  '@babel/plugin-proposal-class-properties'
];

module.exports = { presets, plugins };
