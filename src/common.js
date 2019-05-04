// basic utility functions

function stripSpecialChars(str) {
  return str.replace(/[^\w\s]/gi, '');
}

function includesIgnoreCase(str, needle) {
  return str.toLowerCase().trim().indexOf(needle.toLowerCase().trim()) !== -1;
}

function equalsIgnoreCase(str, needle) {
  return str.toLowerCase().trim() === needle.toLowerCase().trim();
}

function appendParamsToURL(url, params){
  const paramKeys = Object.keys(params);
  if (!paramKeys.length) {
    return url;
  }
  const firstParam = (url.split('?')[1]) ? '&' : '?';
  const joinedParams = paramKeys.map((key) => `${key}=${params[key]}`).join('&');
  return `${url}${firstParam}${joinedParams}`;
}

module.exports = {
  stripSpecialChars,
  includesIgnoreCase,
  equalsIgnoreCase,
  appendParamsToURL
};
