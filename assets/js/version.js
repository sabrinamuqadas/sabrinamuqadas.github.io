/**
 * Single cache-busting version for CSS, JS, JSON, fonts, icons and the service worker.
 * Bump this value when shipping asset changes, then mirror it in HTML/CSS `?v=` query
 * strings and in ES module import URLs (search the repo for the previous version).
 */
var SM_ASSET_VERSION = '1.0.19';

(function (root) {
  if (!root) return;
  root.SM_ASSET_VERSION = SM_ASSET_VERSION;
  root.smAssetUrl = function smAssetUrl(url) {
    if (!url || !SM_ASSET_VERSION) return url;
    var hash = '';
    var hashAt = url.indexOf('#');
    if (hashAt >= 0) {
      hash = url.slice(hashAt);
      url = url.slice(0, hashAt);
    }
    var join = url.indexOf('?') >= 0 ? '&' : '?';
    return url + join + 'v=' + SM_ASSET_VERSION + hash;
  };
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : null);
