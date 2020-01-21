const nodePath = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const readline = require('readline');
const fs = require('fs-extra');
const realAddressGenerator = require('real-address-generator');

const defaultCoordinatesFileName = 'location-coordinates.json';
const defaultAddressesFileName = 'addresses.json';

/**
 * @param filePath
 * @param cityCoordsFile
 * @param googleApiKey
 * @param numberPerLocation - numberPerLocation of generated addresses for each location
 * @param forceNewGeneration - if true generates new addresses file which overrides old one if it exists
 * @returns {Promise<any>}
 */
async function generateAddressesIfNotExists({
  filePath,
  cityCoordsFile,
  googleApiKey,
  numberPerLocation = 10,
  forceNewGeneration,
} = {}) {
  if (!filePath) {
    filePath = nodePath.resolve(__dirname, defaultAddressesFileName);
  }

  const isExist = await fs.exists(filePath);
  if (isExist && !forceNewGeneration) {
    return require(filePath);
  }

  if (!googleApiKey) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(`Unable to get 'googleApiKey' to generate addresses.`);
    }
    googleApiKey = process.env.GOOGLE_API_KEY;
  }

  const geocoderOptions = {
    provider: 'google',
    apiKey: googleApiKey,
    language: 'en',
  };

  const coordinatesFilePath = nodePath.resolve(cityCoordsFile || `${__dirname}/${defaultCoordinatesFileName}`);
  if (!(await fs.exists(coordinatesFilePath))) {
    throw new Error(`Invalid coordinates file path: ${coordinatesFilePath}`);
  }
  const coordinates = require(coordinatesFilePath);

  console.log(
    `Location file: ${coordinatesFilePath}.` +
      `\nLocations number: ${coordinates.length}` +
      `\nAddresses per location: ${numberPerLocation}` +
      `\n\nGenerating addresses...`
  );
  const addresses = [];
  await Promise.map(
    coordinates,
    async locationCoordinates => {
      const generatedAddresses = await realAddressGenerator({
        number: numberPerLocation,
        centerPoints: [locationCoordinates],
        geocoderOptions,
        radius: 2000,
        isAddressValid,
        concurrency: 3,
      });
      logGeneratedAddresses();
      addresses.push(...generatedAddresses);
    },
    { concurrency: 3 }
  );

  logGeneratedAddresses();
  console.log(`\nFinished generating addresses\n`);
  await fs.writeFile(filePath, JSON.stringify(addresses, null, 2));
  return require(filePath);

  function logGeneratedAddresses() {
    readline.clearLine(process.stdout, 0); // move cursor to beginning of line
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Addresses generated: ${addresses.length}`);
  }
}

function isAddressValid(address) {
  const requiredFields = ['country', 'formattedAddress', 'latitude', 'longitude'];
  return _.isPlainObject(address) && requiredFields.every(f => _.get(address, f));
}

async function addressPregenerator({ pregeneratorParams, paramsForGeneratorFiles }) {
  paramsForGeneratorFiles.addresses = await generateAddressesIfNotExists(pregeneratorParams);
}

module.exports = {
  addressPregenerator,
};
