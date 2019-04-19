// basic utility functions, some stolen from lodash

// stolen from lodash
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

// stolen from lodash
function chunk(array, size) {
  var length = array == null ? 0 : array.length;
  if (!length || size < 1) {
    return [];
  }
  var index = 0,
      resIndex = 0,
      result = Array(Math.ceil(length / size));

  while (index < length) {
    result[resIndex++] = baseSlice(array, index, (index += size));
  }
  return result;
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
  chunk,
  includesIgnoreCase,
  equalsIgnoreCase,
  appendParamsToURL
};
