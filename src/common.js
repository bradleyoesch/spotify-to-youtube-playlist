// basic utility functions

const Regex = {
  FEAT: /(\(ft)|(\(feat)|(\(featuring)/gi,
  PARENTHESIS_GROUP: /\s*(\(|\[|\{)[^)]*(\)|\]|\})\s*/gi,
  SPECIAL_CHARS: /[^a-z\s\d\,\.\!\?\#\$\&\*\'\"\(\)\[\]]/gi,
  NON_WORD_OR_WHITESPACE: /[^\w\s]/gi,
  MULT_WHITESPACE: /\s+/gi,
}

function normalizeFeaturing(str) {
  return str.replace(Regex.FEAT, '(ft');
}

function replaceAllInParenthesisOrBrackets(str, replace = '') {
  return str.replace(Regex.PARENTHESIS_GROUP, replace);
}

function replaceSpecificSpecialChars(str, replace = '') {
  return str.replace(Regex.SPECIAL_CHARS, replace);
}

function replaceSpecialChars(str, replace = '') {
  return str.replace(Regex.NON_WORD_OR_WHITESPACE, replace);
}

function replaceDuplicateWhitespace(str, replace = '') {
  return str.replace(Regex.MULT_WHITESPACE, replace);
}

function normalizeTrackTitle(str) {
  return [str]
    .map((str) => str.trim().toLowerCase())
    .map((str) => {
      const dashIdx = str.indexOf(' -');
      return (dashIdx !== -1) ? str.substring(0, dashIdx) : str;
    })
    // idk if I want to normalize or remove, so made both
    .map((str) => normalizeFeaturing(str))
    .map((str) => replaceAllInParenthesisOrBrackets(str))
    // TODO: do opposite and strip whitespace, then you have all the characters that would be removed
    .map((str) => replaceSpecificSpecialChars(str))
    .map((str) => replaceDuplicateWhitespace(str, ' '))
    [0];
}

function normalize(str) {
  return [str]
    .map((str) => str.trim().toLowerCase())
    .map((str) => replaceSpecificSpecialChars(str))
    .map((str) => replaceDuplicateWhitespace(str, ' '))
    [0];
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
  normalizeTrackTitle,
  normalize,
  replaceSpecialChars,
  includesIgnoreCase,
  equalsIgnoreCase,
  appendParamsToURL
};
