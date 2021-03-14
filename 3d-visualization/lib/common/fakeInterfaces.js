const fakeHttp = {
  get: () => console.error('HTTP GET Not implemented'),
  post: () => console.error('HTTP POST Not implemented')
};

const fakeSce = {trustAsHtml: html => html};

const fakeToastr = {
  error: msg => alert(`Error: ${msg}`),
  success: msg => alert(msg),
}

const notificationService = {
  notifyError: msg => alert(`Error: ${msg}`),
  notifySuccess: msg => alert(msg),
}

const interval = function (a, b) {
  window.setInterval(a, b);
};
interval.cancel = function (a) {
  window.clearInterval(a)
};

const timeout = window.setTimeout;

export {
  fakeToastr as toastr,
  notificationService,
  interval,
  timeout,
  fakeHttp as http,
  fakeSce as sce
}
