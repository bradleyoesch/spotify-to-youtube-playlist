const rp = require('request-promise');
const Secrets = require('./secrets');
const { Spotify } = Secrets;

// your application requests authorization
// const BASIC_AUTH = Buffer.from(`${Spotify.CLIENT_ID}:${Spotify.CLIENT_SECRET}`, 'base64');
const BASIC_AUTH = new Buffer(`${Spotify.CLIENT_ID}:${Spotify.CLIENT_SECRET}`).toString('base64');
const Urls = {
  BASE_PLAYLIST: 'https://api.spotify.com/v1/playlists/'
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
    url: Urls.BASE_PLAYLIST,
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
    .catch((e) => {
      console.log('authenticate() error\n', e)
    });
}

function getPlaylistBasicTrackInfo(token, playlistId) {
  const opts = Object.assign({}, Options.PLAYLIST);
  opts.headers.Authorization = `Bearer ${token}`;
  opts.url = `${opts.url}${playlistId}`;
  // opts.fields='tracks.items(track(name, artists))';
  return rp(opts)
    .catch((e) => {
      console.log('getPlaylistBasicTrackInfo() error\n', e)
    });
}

function toSummarizedTrack(track) {
  return {
    title: track.track.name,
    artists: track.track.artists.map((artist) => artist.name)
  }
}

module.exports = {
  getPlaylistIdFromUrl,
  authenticate,
  getPlaylistBasicTrackInfo,
  toSummarizedTrack
};
