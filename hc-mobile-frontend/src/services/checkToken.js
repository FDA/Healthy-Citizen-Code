import apiAuth from '../api/auth';

export const checkToken = token => (
  new Promise((resolve, reject) => {
    apiAuth.checkToken(token)
      .then(response => resolve())
      .catch(error => reject(error.message));
  })
);
