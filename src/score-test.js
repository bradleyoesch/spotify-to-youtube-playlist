const rp = require('request-promise');
const _ = require('lodash');
const Args = require('./args');
const Common = require('./common');
const Spotify = require('./spotify');
const Youtube = require('./youtube');
const Cache = require('./cache');

Args.set();
const args = Args.get();

const playlistId = args.id ? args.id : Spotify.getPlaylistIdFromUrl(args.url);
if (!playlistId) {
  throw 'Could not get id from playlist url';
}

Cache.load();

// authenticate with spotify
!args.skipApi && Spotify.authenticate()
  .then((token) => {
    // use that autheticated token to get tracks for the given playlist
    Spotify.getPlaylistTracks(token, playlistId)
      .then((tracks) => {
        const basicTracks = tracks.map(Spotify.toBasicTrack);
        const titles = basicTracks.map((t) => { return { title: t.title, norm: Common.normalizeTitle(t.title) }; });
        console.log(titles);
      })
      .catch((playlistErr) => {
        console.log('playlistErr');
        console.log(playlistErr);
      });
  });
