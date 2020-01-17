import GlobalConfig from 'react-native-config';

let apiUrl = GlobalConfig.API_URL;
if (apiUrl && apiUrl.endsWith('/')) {
  apiUrl = apiUrl.substr(0, apiUrl.length - 1);
}
const Config = {
  api: {
    host: apiUrl,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
};

export default Config;
