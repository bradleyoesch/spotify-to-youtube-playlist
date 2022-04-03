const rp = require('request-promise');
const _ = require('lodash');
const Args = require('./args');
const Common = require('./common');
const Spotify = require('./spotify');
const Youtube = require('./youtube');
const Cache = require('./cache');

Args.set();
const args = Args.get();

// const playlistId = args.id ? args.id : Spotify.getPlaylistIdFromUrl(args.url);
// if (!playlistId) {
//   throw 'Could not get id from playlist url';
// }

Cache.load();

false && Youtube.getMatchingPlaylists(args.channelId, playlistId)
  .then((matchingPlaylists) => {
    console.log(matchingPlaylists[0]);
  });

Spotify.authenticate()
  .then((response) => {
    console.log(response);
  })
