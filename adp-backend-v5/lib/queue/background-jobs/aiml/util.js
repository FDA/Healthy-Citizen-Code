const axios = require('axios');

function handleAxiosError({ error, url }) {
  let message;
  if (error.response) {
    const { status, data, headers } = error.response;
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    message =
      `Unable to get response from '${url}'. ` +
      `Status=${status}, data=${JSON.stringify(data)}, headers=${JSON.stringify(headers)}`;
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of http.ClientRequest
    message = `Unable to get response from '${url}'`;
  } else {
    // Something happened in setting up the request that triggered an Error
    message = error.message;
  }
  return message;
}

async function getAimlResult(url, variables) {
  return axios
    .post(url, variables)
    .then((response) => ({ response }))
    .catch((error) => {
      const errorMessage = handleAxiosError({ error, url });
      throw new Error(errorMessage);
    });
}

module.exports = {
  getAimlResult,
};
