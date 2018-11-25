/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.6.3/workbox-sw.js");

workbox.skipWaiting();
workbox.clientsClaim();

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */

workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute([], {
    "ignoreUrlParametersMatching": [/./]
});

const mathcRoute = (url, routeName) => {
  var regex = new RegExp(`/${routeName}/`);
  return url.origin === '<!-- apiUrl -->' && regex.test(url.pathname);
};

// readonly data
workbox.routing.registerRoute(
  ({url}) => {
    return mathcRoute(url, 'app-model');
  },
  workbox.strategies.networkFirst(),
  'GET'
);

workbox.routing.registerRoute(
  ({url}) => {
    return mathcRoute(url, 'lookups');
  },
  workbox.strategies.networkFirst({
    matchOptions: {
      ignoreSearch: false
    }
  }),
  'GET'
);

workbox.routing.registerRoute(
  ({url}) => {
    return mathcRoute(url, 'dashboards');
  },
  workbox.strategies.networkFirst(),
  'GET'
);

// PUT and DELETE
// workbox.routing.registerRoute(
//   ({url}) => {
//     return mathcRoute(url, 'jobs');
//   },
//   workbox.strategies.networkFirst(),
//   'PUT'
// );