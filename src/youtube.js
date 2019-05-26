const rp = require('request-promise');
const _ = require('lodash');
const Common = require('./common');
const Secrets = require('./secrets');
const Score = require('./score');
const Args = require('./args');
const Cache = require('./cache');
const { Youtube } = Secrets;

const yes = [];
const no = [];

const RESULT_LIMIT = 3;
const Urls = {
  BASE_SEARCH: 'https://www.googleapis.com/youtube/v3/search?part=snippet'
};
const BASE_SEARCH_OPTIONS = {
  method: 'GET',
  url: Urls.BASE_SEARCH,
  headers: { 'Accept': 'application/json' },
  json: true
};

function _getSearchOptions(params) {
  const opts = Object.assign({}, BASE_SEARCH_OPTIONS);
  opts.url = `${opts.url}${params}&key=${Youtube.API_KEY}`;
  return opts;
}

function _searchVideos(query) {
  const hit = Cache.getIn(['youtube', 'search', 'video', query]);
  if (hit) {
    Cache.increment();
    Args.get().debug && console.log(`Hit on query: ${query}`);
    return Promise.resolve(hit);
  }
  const params = `&type=video&maxResults=${RESULT_LIMIT}&q=${query}`;
  const videoSearchOpts = _getSearchOptions(params);
  return rp(videoSearchOpts)
    .then((response) => {
      Cache.setIn(['youtube', 'search', 'video', query], response);
      return response;
    })
    .catch((e) => {
      const errors = ((e.error || {}).error || {}).errors || [];
      const quotaLimitExceeded = errors.some((err) => ['youtube.quota', 'usageLimits'].indexOf(err.domain) !== -1)
          && errors.some((err) => ['quotaExceeded', 'dailyLimitExceeded'].indexOf(err.reason) !== -1);
      if (quotaLimitExceeded) {
        console.error(e.message);
      } else {
        console.error('_searchVideos() error\n', e);
      }
      return { items: [] };
    });
}

const _toBestVideo = (queryObj) => (acc, curr, idx, arr) => {
  try {
    const id = curr.id.videoId;
    const title_OG = Common.replaceSpecialChars(_.unescape(curr.snippet.title), ' ');
    const title = Common.normalize(_.unescape(curr.snippet.title));
    if (curr.id.kind !== 'youtube#video') {
      return acc;
    }
    const channel = Common.normalize(curr.snippet.channelTitle);
    const rawScore = Score.calculate({ title, channel }, queryObj);

    if (rawScore < Score.MIN) {
      Args.get().debugScore && console.log(rawScore + ': ' + [id, title.toLowerCase(), channel.toLowerCase()].join(' | '));
      return acc;
    }
    // favor the order of items
    const idxBoost = idx * -1 + arr.length;
    const score = rawScore * idxBoost;
    Args.get().debugScore && console.log(score + ': ' + [id, title.toLowerCase(), channel.toLowerCase()].join(' | '));
    return (score > acc.score) ? { id, title, score } : acc;
  } catch (err) {
    console.error('Error while calculating score for item: ' + JSON.stringify(curr), err);
    return acc;
  }
}

async function _doChunkedSearchVideos(queryObjChunk) {
  const args = Args.get();
  const debug = args.debug;
  const bestVideos = queryObjChunk.map((queryObj, idx) => {
    return _searchVideos(queryObj.query)
      .then((response) => {
        const condensed = debug ? response.items.map((item) => { return { id: item.id.videoId, title: item.snippet.title, channel: item.snippet.channelTitle }; }) : null;
        debug && console.log('condensed', condensed);
        // args.debugScore && console.log('\n' + queryObj.query);
        const bestVideo = response.items.reduce(_toBestVideo(queryObj), { score: 0 });
        if (args.debugScore) {
          if (bestVideo.score === 0) {
            no.push(queryObj.query);
          } else {
            yes.push(queryObj.query);
          }
        }
        return bestVideo
      })
      .catch((e) => {
        console.error('_doChunkedSearchVideos() error\n', e)
      });
  });
  return Promise.all(bestVideos);
}

function toQueryObject(track) {
  const title_OG = Common.replaceSpecialChars(track.title.trim().toLowerCase(), ' ');
  const title = Common.normalizeTrackTitle(track.title);
  console.log(title)
  const artists_OG = track.artists.map((a) => Common.replaceSpecialChars(a.trim().toLowerCase(), ' '));
  const artists = track.artists.map((a) => Common.normalize(a));
  return {
    title_OG,
    title,
    artists_OG,
    artists,
    query: `${artists.join(' ')} - ${title} official music video`
  };
}

function getBestIdsFromQueries(queryObjects) {
  const args = Args.get();
  const debug = args.debug;
  const ids = [];

  const queryChunks = _.chunk(queryObjects, args.chunkSize);
  const reducedSearches = queryChunks.reduce(async (previousSearch, nextChunk) => {
    await previousSearch;
    return _doChunkedSearchVideos(nextChunk)
      .then((allResponses) => {
        debug && console.log('allResponses', allResponses)
        const responseIds = allResponses.filter((response) => response.score > 0).map((response) => response.id)
        ids.push.apply(ids, responseIds);
      });
  }, Promise.resolve());

  return reducedSearches
    .then((unused) => {
      if (Args.get().debugScore) {
        console.log('yes');
        console.log(yes);
        console.log('no');
        console.log(no);
      }
      return ids;
    })
    .catch((e) => {
      console.error('getBestIdsFromQueries() error\n', e)
    });
}

function upsertPlaylist(playlistId, playlistTitle, bestYtIds) {
  console.log(playlistId, playlistTitle, bestYtIds[0]);
  return Promise.resolve('success');
}

module.exports = {
  toQueryObject,
  getBestIdsFromQueries,
  upsertPlaylist
};
