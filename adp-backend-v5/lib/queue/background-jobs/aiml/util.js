const axios = require('axios');

function handleAxiosError({ error, log, url }) {
  if (error.response) {
    const { status, data, headers } = error.response;
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    log.error(
      `Unable to get response from '${url}'. ` +
        `Status=${status}, data=${JSON.stringify(data)}, headers=${JSON.stringify(headers)}`
    );
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of http.ClientRequest
    log.error(`Unable to get response from '${url}'`);
  } else {
    // Something happened in setting up the request that triggered an Error
    log.error(error.stack);
  }
}

async function getAimlResult(url, variables, log) {
  return axios
    .post(url, variables)
    .then((response) => ({ response }))
    .catch((error) => {
      handleAxiosError({ error, log, url });
      return { error };
    });
}

module.exports = {
  getAimlResult,
};
