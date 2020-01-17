const shell = require('shelljs');
const rp = require('request-promise');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
const envFile = process.argv[2];
if (!envFile) {
  console.log('Specify env file path as argument.')
}

const envPath = path.resolve(rootDir, envFile);
const {parsed: env} = require('dotenv').load({path: envPath});

let apiUrl = env.API_URL;
if (apiUrl && apiUrl.endsWith('/')) {
  apiUrl = apiUrl.substr(0, apiUrl.length - 1);
}

// const renameAppWithPackages = (appName) => {
//   if (!shell.which('react-native-rename')) {
//     shell.echo(`Sorry, this script requires 'react-native-rename'. Execute 'npm i' to install dependencies.`);
//     return Promise.resolve(false);
//   }
//
//   shell.cd(rootDir);
//   return new Promise((resolve, reject) => {
//     shell.exec(`react-native-rename "${appName}"`, (code, stdout, stderr) => {
//       const isSuccessful = code === 0 && stderr === '' && !stdout.startsWith(`Please try a different name.`);
//       if(isSuccessful) {
//         resolve(isSuccessful);
//       } else {
//         reject(`Error on stage 'renameApp' with name '${appName}': ${stdout}`);
//       }
//     });
//   })
// };

const renameApp = (appName) => {
  const androidStringsFile = path.resolve(rootDir, 'android/app/src/main/res/values/strings.xml');
  const data = fs.readFileSync(androidStringsFile, 'utf-8');
  const newData = data.replace(/<string name="app_name">.+?<\/string>/, `<string name="app_name">${appName}</string>`);
  fs.writeFileSync(androidStringsFile, newData);
  console.log(`App name changed to '${appName}'`);
  return Promise.resolve();
};

const updateLogos = (logoPath) => {
  const reactNativeIconPath = path.resolve(rootDir, './node_modules/.bin/app-icon');
  if (!fs.existsSync(reactNativeIconPath)) {
    return Promise.reject(`Sorry, this script requires './node_modules/.bin/app-icon'. Execute 'npm i' to install dependencies.`);
  }

  if (!fs.existsSync(logoPath)) {
    return Promise.reject(`Invalid logoPath (${logoPath}) is specified. Please fix it.`);
  }

  shell.cd(rootDir);
  return new Promise((resolve, reject) => {
    shell.exec(`./node_modules/.bin/app-icon generate -i ${logoPath}`, (code, stdout, stderr) => {
      const isSuccessful = code === 0;
      if(isSuccessful) {
        resolve(isSuccessful);
      } else {
        reject(`Error on stage 'updateLogos': code=${code}, out='${stdout}', err='${stderr}'`);
      }
    });
  })
};

const getLogo = (json) => {
  const logoPath = 'interface.app.logo';
  const logoObj = _.get(json, logoPath, {});
  const logoUrlPart = logoObj.large || logoObj.small || logoObj.tiny;
  if (!logoPath) {
    throw `There is no logo in /app-model json specified by path ${logoPath}`;
  }
  const logoUrl = `${apiUrl}${logoUrlPart}`;

  return rp({url: logoUrl, encoding: null})
    .then((res) => {
      const buffer = Buffer.from(res, 'utf8');
      const logoFile = path.resolve(__dirname, 'resources', 'logo.png');
      fs.writeFileSync(logoFile, buffer);
      return logoFile;
    });
};

const getTitle = (json) => {
  const titlePath = 'interface.app.title';
  const title = _.get(json, titlePath);
  if (!title) {
    throw `There is no title in /app-model json specified by path ${titlePath}`
  }
  return title;
};

const getSettings = () => {
  const appModelUrl = `${apiUrl}/build-app-model`;
  return rp({
    uri: appModelUrl,
    json: true
  })
    .then(json => {
      const data = json.data;
      return Promise.all([getLogo(data), getTitle(data)]);
    })
};

getSettings()
  .then(([logoFile, title]) => {
    return Promise.all([
      updateLogos(logoFile),
      renameApp(title),
    ]);
  })
  .then(results => {
    process.exit(0);
  })
  .catch(err => {
    console.log(err.stack);
    process.exit(1);
  });

