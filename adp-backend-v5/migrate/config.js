const nodePath = require('path');

function getMigrateConfig(mongoDbUri) {
  const slashIndex = mongoDbUri.lastIndexOf('/');
  return {
    mongodb: {
      url: mongoDbUri.slice(0, slashIndex),

      databaseName: mongoDbUri.slice(slashIndex + 1),

      options: {
        // several deprecations in the MongoDB Node.js driver
        // https://mongoosejs.com/docs/deprecations.html
        useNewUrlParser: true,
        useUnifiedTopology: true,
        //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
        //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
      },
    },

    // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
    migrationsDir: nodePath.resolve(__dirname, './migrations'),

    // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
    changelogCollectionName: 'mongoMigrateChangeLog',
  };
}

module.exports = { getMigrateConfig };
