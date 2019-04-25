const rp = require('request-promise');
const __ = require('./lodashes');
const Secrets = require('./secrets');
const Score = require('./score');
const Args = require('./args');
const Cache = require('./cache');
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
  const params = `&type=video&maxResults=${RESULT_LIMIT}&q=${query}`;
  const videoSearchOpts = _getOptions(params);
  const hit = Cache.get(['youtube', 'search', 'video', query]);
  if (hit) {
    Args.get().debug && console.log(`Hit on query: ${query}`);
    return Promise.resolve().then(() => hit);
  }
  return rp(videoSearchOpts)
    .then((response) => {
      Cache.set(['youtube', 'search', 'video', query], response);
      return response;
    })
    .catch((e) => {
      console.error('_searchVideos() error\n', e)
    });
}

/*
 * Honestly this is all probably just a waste of time, in what world
 * is <artist> - <song> official music video not gonna return the
 * correct video in the first result?
 */
// TODO: try this
// function _toBestVideo(obj) {
//   return (acc, curr, idx, arr) => {
//     ...
//   }
// }
const _toBestVideo = (queryObj) => (acc, curr, idx, arr) => {
  try {
    const id = curr.id.videoId;
    const title = curr.snippet.title;
    if (curr.id.kind !== 'youtube#video') {
      return acc;
    }
    const channel = curr.snippet.channelTitle;
    const rawScore = Score.calculate({ title, channel }, queryObj);
    if (rawScore < Score.MIN) {
      return acc;
    }
    // favor the order of items
    const idxBoost = idx * -1 + arr.length;
    const score = rawScore * idxBoost;
    return (score > acc.score) ? { id, title, score } : acc;
  } catch (err) {
    console.error('Error while calculating score for item: ' + JSON.stringify(curr), err);
    return acc;
  }
}

async function _doChunkedSearchVideos(queryObjChunk) {
  const debug = Args.get().debug;
  const bestVideos = queryObjChunk.map((queryObj, idx) => {
    // TODO: cache the query
    return _searchVideos(queryObj.query)
      .then((response) => {
        const condensed = debug ? response.items.map((item) => { return { id: item.id.videoId, title: item.snippet.title, channel: item.snippet.channelTitle }; }) : null;
        debug && console.log('condensed', condensed);
        return response.items.reduce(_toBestVideo(queryObj), { score: 0 });
      })
      .catch((e) => {
        console.error('_doChunkedSearchVideos() error\n', e)
      });
  });
  return Promise.all(bestVideos);
}

function toQueryObject(track) {
  const title = track.title.trim().toLowerCase();
  const artists = track.artists.map((a) => a.trim().toLowerCase());
  return {
    title,
    artists,
    query: `${artists.join(' ')} - ${title} official music video`
  };
}

// TODO: could maybe use then returns with ids to possibly return it through just the thens, no separate array
function getBestIdsFromQueryChunks(queryChunks) {
  const debug = Args.get().debug;
  const ids = [];

  const reducedSearches = queryChunks.reduce(async (previousSearch, nextChunk) => {
    await previousSearch;
    return _doChunkedSearchVideos(nextChunk)
      .then((allResponses) => {
        // TODO: cache the query
        debug && console.log('allResponses', allResponses)
        const responseIds = allResponses.filter((response) => response.score > 0).map((response) => response.id)
        ids.push.apply(ids, responseIds);
      });
  }, Promise.resolve());

  return reducedSearches
    .then((unused) => {
      return ids;
    })
    .catch((e) => {
      console.error('getBestIdsFromQueryChunks() error\n', e)
    });
}

module.exports = {
  toQueryObject,
  getBestIdsFromQueryChunks
};
