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
// e.g.
// '''
//   https://accounts.google.com/o/oauth2/v2/auth?
//   scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly&
//   access_type=offline&
//   include_granted_scopes=true&
//   state=state_parameter_passthrough_value&
//   redirect_uri=http%3A%2F%2Flocalhost%2Foauth2callback&
//   response_type=code&
//   client_id=client_id
// '''
// '''
//   http://localhost/oauth2callback?state=state_parameter_passthrough_value
//   &code=4/awGnzqkGFgJPCHTrx7RSR_4jxMBy9rjy7DQ5d5qJjrKugRp3Yn1vAHSnlaSk4tRwzpYPOjTA-T49EDC9mFtwNfs
//   &scope=https://www.googleapis.com/auth/drive.metadata.readonly
// '''
const Params = {
  OAUTH: {
    scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
    access_type: 'offline',
    include_granted_scopes: true,
    redirect_uri: 'http://localhost',
    response_type: 'code',
    client_id: Youtube.OAuth.CLIENT_ID
  },
  TOKEN: {
    code: Youtube.OAuth.CODE,
    client_id: Youtube.OAuth.CLIENT_ID,
    client_secret: Youtube.OAuth.CLIENT_SECRET,
    redirect_uri: 'http://localhost',
    grant_type: 'authorization_code',
  }
};
const Urls = {
  AUTHENTICATE: Common.appendParamsToURL('https://accounts.google.com/o/oauth2/v2/auth', Params.OAUTH),
  TOKEN: Common.appendParamsToURL('https://www.googleapis.com/oauth2/v4/token', Params.TOKEN),
  SEARCH: 'https://www.googleapis.com/youtube/v3/search?part=snippet',
  // TODO: are these correct?
  PLAYLIST_LIST: 'https://www.googleapis.com/youtube/v3/playlists?part=snippet',
  PLAYLIST_INSERT: 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
  PLAYLIST_ITEM_INSERT: 'https://www.googleapis.com/youtube/v3/playlistItems',
};
const Options = {
  SEARCH: {
    method: 'GET',
    url: Urls.SEARCH,
    headers: { Accept: 'application/json' },
    json: true
  },
  PLAYLIST_LIST: {
    method: 'GET',
    url: Urls.PLAYLIST_LIST,
    headers: { Accept: 'application/json' },
    json: true
  },
  PLAYLIST_INSERT: {
    method: 'POST',
    url: Urls.PLAYLIST_INSERT,
    headers: { Authorization: 'Invalid token' },
    json: true
  },
  PLAYLIST_ITEM_INSERT: {
    method: 'POST',
    url: Urls.PLAYLIST_ITEM_INSERT,
    headers: { Authorization: 'Invalid token' },
    json: true
  },
};

function getOAuthUrl() {
  return Urls.AUTHENTICATE;
}

function _getOptions(options, params = '') {
  const opts = Object.assign({}, options);
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
  const videoSearchOpts = _getOptions(Options.SEARCH, params);
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
        return bestVideo;
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

function _getTag(spotifyPlaylistId) {
  return `spotifyPlaylistId-${spotifyPlaylistId}`;
}

function getMatchingPlaylists(channelId, spotifyPlaylistId) {
  const args = Args.get();
  if (!args.upsertPlaylist) {
    return Promise.resolve([]);
  }
  const playlistTag = _getTag(spotifyPlaylistId);
  const params = `&channelId=${channelId}&maxResults=50`;
  const playlistListOpts = _getOptions(Options.PLAYLIST_LIST, params);
  return rp(playlistListOpts)
    .then((response) => {
      // TODO: gonna have to deal with paging through these ugh
      return response.items.filter((item) => {
        return _.includes(item.snippet.tags || [], playlistTag);
      });
    })
    .catch((e) => {
      console.error('getMatchingPlaylists() error\n', e)
    });
}

function _createInsertPlaylistData(spotifyPlaylistId, playlistTitle) {
  return _.cloneDeep({
    part: 'snippet,status',
    resource: {
      snippet: {
        title: playlistTitle,
        description: `${playlistTitle} - playlist of music videos from the spotify playlist\nhttps://open.spotify.com/playlist/${spotifyPlaylistId}\n\nhttps://github.com/bradleyoesch/spotify-to-youtube-playlist`,
        tags: [
          'spotify-to-youtube-playlist',
          _getTag(spotifyPlaylistId)
        ],
        defaultLanguage: 'en'
      },
      status: {
        privacyStatus: 'public'
      }
    }
  });
}

function _updatePlaylist(insertedPlaylistId, ytIds) {
    // TODO
  const opts = Object.assign(Options.PLAYLIST_ITEM_INSERT,)
  const token = 'foo';
  opts.headers.Authorization = `Bearer ${token}`;
  const playlistUpdateOpts = _getOptions(opts);
}

function upsertPlaylist(channelId, ytPlaylistId, spotifyPlaylistId, playlistTitle, ytIds) {
  if (!ytPlaylistId) {
    // insert/create new playlist
    const data = _createInsertPlaylistData(spotifyPlaylistId, playlistTitle);
    const opts = Object.assign(Options.PLAYLIST_INSERT, { data });
    // TODO
    const token = 'foo';
    opts.headers.Authorization = `Bearer ${token}`;
    const playlistInsertOpts = _getOptions(opts);
    return rp(playlistInsertOpts)
      .then((response) => {
        console.log('insert response')
        console.log(response)
        const insertedPlaylistId = response.id;
        return response;
      })
      .catch((e) => {
        console.error('upsertPlaylist() insert error\n', e)
      });
  } else {
    // update
  }
  // console.log(playlistId, playlistTitle, ytIds[0]);
  // const params = `&channelId=${channelId}&maxResults=50`;
  // const playlistListOpts = _getOptions(Options.PLAYLIST_LIST, params);
  // return rp(playlistListOpts)
  //   .catch((e) => {
  //     console.error(e);
  //   });
}



module.exports = {
  getOAuthUrl,
  toQueryObject,
  getBestIdsFromQueries,
  getMatchingPlaylists,
  upsertPlaylist,
};
