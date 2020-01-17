const getFormData = (files) => {
  const data = new FormData();
  files.forEach(file => {
    const part = {
      uri: file.path,
      type: file.type,
      name: file.name
    };
    data.append(file.name, part);
  });
  return data;
};

const sendDataWithProgress = (url, opts = {}, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(opts.method || 'get', url);
    for (const headerName in opts.headers || {}) {
      xhr.setRequestHeader(headerName, opts.headers[headerName]);
    }
    xhr.onload = e => resolve(e.target);
    xhr.onerror = reject;
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = onProgress; // event.loaded / event.total * 100 ; //event.lengthComputable
    }
    xhr.send(opts.body);
  });
};

module.exports = {
  getFormData,
  sendDataWithProgress
};