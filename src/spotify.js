const rp = require('request-promise');
const _ = require('lodash');
const Secrets = require('./secrets');
const Args = require('./args');
const Common = require('./common');
const { Spotify } = Secrets;

const BASIC_CREDENTIALS = Buffer.from(`${Spotify.CLIENT_ID}:${Spotify.CLIENT_SECRET}`, 'utf8').toString('base64');
// spotify's native limit
const LIMIT = 100;
const Regex = {
  PLAYLIST_ID: /<playlistId>/gi
}
const Urls = {
  GET_PLAYLIST_TRACKS: 'https://api.spotify.com/v1/playlists/<playlistId>/tracks'
};
const Options = {
  AUTH:{
    method: 'POST',
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': `Basic ${BASIC_CREDENTIALS}` },
    form: { grant_type: 'client_credentials' },
    json: true
  },
  PLAYLIST: {
    // url: 'https://api.spotify.com/v1/users/1258023236/playlists',
    method: 'GET',
    url: Urls.GET_PLAYLIST_TRACKS,
    headers: { 'Authorization': 'Invalid token' },
    json: true
  }
};

function getPlaylistIdFromUrl(url) {
  // e.g. https://open.spotify.com/user/1235822306/playlist/w2gv2ZWcO6oyJ9P1JlFP9U?si=QDuxxT_1Ka8OzHcOQDbJHg
  if (!url) {
    return null;
  }
  const urlSplit = url.split('/');
  const idWithArg = urlSplit[urlSplit.length - 1];
  const indexOfQMark = idWithArg.indexOf('?');
  const idx = (indexOfQMark > -1) ? indexOfQMark : idWithArg.length;
  return idWithArg.slice(0, idx);
}

function authenticate() {
  return rp(Options.AUTH)
    .then((response) => {
      return response.access_token
    })
    .catch((e) => {
      console.error('authenticate() error\n', e)
    });
}

/**
 * Generate array of limits given the limit and the spotify LIMIT
 * e.g. limits(280), LIMIT = 100 -> [100, 100, 80]
 */
function _limits(limit) {
  return _.range(0, Math.ceil(limit / LIMIT)).map((val, idx) => {
    return Math.min(LIMIT, limit - (LIMIT * idx));
  });
}

function _getPlaylistOpts(token, playlistId, urlParams = {}) {
    const opts = Object.assign({}, Options.PLAYLIST);
    opts.headers.Authorization = `Bearer ${token}`;
    opts.url = Common.appendParamsToURL(opts.url.replace(Regex.PLAYLIST_ID, playlistId), urlParams);
    return opts;
}

/**
 * Spotify will return tracks forever, the offset overflows
 * e.g. playlist has 6 tracks and my limit is 5, if I call to it 3 times,
 * I get [0,1,2,3,4], [5,6,0,1,2], [3,4,5,6,0]
 */
function _getPlayListTotalTracks(token, playlistId) {
    const urlParams = { fields: 'total' };
    const opts = _getPlaylistOpts(token, playlistId, urlParams);
    return rp(opts)
      .then((response) => {
        return response.total;
      })
      .catch((e) => {
        console.error('_getPlayListTotalTracks() error\n', e)
      });
}

/**
 * Get the playlist tracks
 * if the limit is larger than spotify's, make multiple requests
 * then combine them all together
 */
function getPlaylistTracks(token, playlistId) {
  const args = Args.get();
  return _getPlayListTotalTracks(token, playlistId)
    .then((total) => {
      const limits = _limits(Math.min(args.limit, Math.max(0, total - args.offset)));
      const trackPromises = limits.map((limit, idx) => {
        const urlParams = {
          limit,
          offset: args.offset + _.sum(limits.slice(0, idx)),
          fields: 'items(track(name, artists))'
        };
        const opts = _getPlaylistOpts(token, playlistId, urlParams);
        return rp(opts)
          .then((response) => {
            return response.items.map((item) => item.track);
          })
          .catch((e) => {
            console.error('getPlaylistTracks() error\n', e)
          });
      });
      return Promise.all(trackPromises)
        .then((tracks) => tracks.reduce((acc, curr) => acc.concat(curr), []));
    });
}

function toBasicTrack(track) {
  return {
    title: track.name,
    artists: track.artists.map((artist) => artist.name)
  }
}

module.exports = {
  getPlaylistIdFromUrl,
  authenticate,
  getPlaylistTracks,
  toBasicTrack
};
