const rp = require('request-promise');
const Secrets = require('./secrets');
const Args = require('./args');
const Common = require('./common');
const { Spotify } = Secrets;

// your application requests authorization
// const BASIC_AUTH = Buffer.from(`${Spotify.CLIENT_ID}:${Spotify.CLIENT_SECRET}`, 'base64');
const BASIC_AUTH = new Buffer(`${Spotify.CLIENT_ID}:${Spotify.CLIENT_SECRET}`).toString('base64');
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
    headers: { 'Authorization': `Basic ${BASIC_AUTH}` },
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

function getPlaylistTracks(token, playlistId) {
  const args = Args.get();
  // TODO: offset changes per call
  const urlParams = {
    limit: args.limit,
    offset: args.offset,
    fields: 'items(track(name, artists))'
  };
  const opts = Object.assign({}, Options.PLAYLIST);
  opts.headers.Authorization = `Bearer ${token}`;
  opts.url = Common.appendParamsToURL(opts.url.replace(Regex.PLAYLIST_ID, playlistId), urlParams);
  return rp(opts)
    .then((response) => {
      return response.items.map((item) => item.track);
    })
    .catch((e) => {
      console.error('getPlaylistTracks() error\n', e)
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
