const rp = require('request-promise');
const __ = require('./lodashes');
const Secrets = require('./secrets');
const { Youtube } = Secrets;

const RESULT_LIMIT = 3;
const Urls = {
  BASE_SEARCH: 'https://www.googleapis.com/youtube/v3/search?part=snippet'
};
const BASE_OPTIONS = {
  method: 'GET',
  url: Urls.BASE_SEARCH,
  headers: { 'Accept': 'application/json' },
  json: true
};

function _getOptions(params) {
  const opts = Object.assign({}, BASE_OPTIONS);
  opts.url = `${opts.url}${params}&key=${Youtube.API_KEY}`;
  return opts;
}

function _searchVideos(query) {
  const params = `&maxResults=${RESULT_LIMIT}&q=${query}`;
  const videoSearchOpts = _getOptions(params);
  return rp(videoSearchOpts)
    .catch((e) => {
      console.log('_searchVideos() error\n', e)
    });
}

/* consider match if:
 * - title contains artist, title and "music video"
 * - if over 100,000 views, probably the right one
 * - if vevo or other official music video channel, probably right onw
 * - seems to be a flag on yt for "artist official channel" that's another good check
 */
// TODO: try this
// function _toBestVideo(obj) {
//   return (acc, curr, idx, arr) => {
//     ...
//   }
// }
const _toBestVideo = (obj) => (acc, curr, idx, arr) => {
  try {
    // favor the order of items
    var score = idx * -1 + arr.length;
    var id = curr.id.videoId;
    var title = curr.snippet.title;
    if (curr.id.kind !== 'youtube#video') {
      return acc;
    }
    var channel = curr.snippet.channelTitle;
    // TODO: better method, probably something with an object?
    const scoreMult = Math.floor(arr.length / 2);
    score += __.includesIgnoreCase(title, obj.title) ? scoreMult : 0;
    score += __.includesIgnoreCase(title, obj.artists[0]) ? scoreMult : 0;
    score += __.includesIgnoreCase(channel, obj.artists[0]) ? scoreMult : 0;
    score *= __.includesIgnoreCase(title, 'lyrics') ? 0 : 1;
    score *= __.includesIgnoreCase(title, 'high quality') ? 0 : 1;
    score *= __.includesIgnoreCase(title, 'album version') ? 0 : 1;
  } catch (err) {
    console.error('Error while calculating score for item: ' + JSON.stringify(curr), err);
    return acc;
  }
  return (score > acc.score) ? { id, title, score } : acc;
}

async function _doChunkedSearchVideos(chunk) {
  const chunkedSearches = chunk.map((queryObj, idx) => {
    const query = queryObj.query;

    return _searchVideos(query)
      .then((response) => {
        const best = response.items.reduce(_toBestVideo(queryObj), { score: 0 });
        return best.score > 0 ? best : null;
      })
      .catch((e) => {
        console.log('_doChunkedSearchVideos() error\n', e)
      });
  });
  return Promise.all(chunkedSearches);
}

function toQueryObject(track) {
  return {
    title: track.title,
    artists: track.artists.slice(),
    query: `${track.artists.join(' ')} - ${track.title} official music video`
  };
}

// TODO: could maybe use then returns with ids to possibly return it through just the thens, no separate array
function getBestIdsFromQueryChunks(queryChunks) {
  const ids = [];

  const reducedSearches = queryChunks.reduce(async (previousSearch, nextChunk) => {
    await previousSearch;
    return _doChunkedSearchVideos(nextChunk)
      .then((allResponses) => {
        const responseIds = allResponses.filter(Boolean).map((response) => response.id)
        ids.push.apply(ids, responseIds);
      });
  }, Promise.resolve());

  return reducedSearches
    .then((unused) => {
      return ids;
    })
    .catch((e) => {
      console.log('getBestIdsFromQueryChunks() error\n', e)
    });
}

module.exports = {
  toQueryObject,
  getBestIdsFromQueryChunks
};
