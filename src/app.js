const rp = require('request-promise');
const _ = require('lodash');
const Args = require('./args');
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

!args.skipApi && Spotify.authenticate()
  .then((token) => {

    Spotify.getPlaylistTracks(token, playlistId)
      .then((tracks) => {

        const basicTracks = tracks.map(Spotify.toBasicTrack);
        const ytQueryObjects = basicTracks.map(Youtube.toQueryObject);
        const ytQueryChunks = _.chunk(ytQueryObjects, args.chunkSize);
        // TODO: should probably implement shitty caching first
        // probably just write to file with json parsing
        // { spotifyId, ytId }

        if (!args.skipYoutube) {
          Youtube.getBestIdsFromQueryChunks(ytQueryChunks)
            .then((bestYtIds) => {
              console.log('bestYtIds');
              console.log(bestYtIds);
              console.log('bestYtIds.length: ' + bestYtIds.length);
              Cache.write();
              Cache.print('hits');
            });
        }
      })
      .catch((playlistErr) => {
        console.log('playlistErr');
        console.log(playlistErr);
      });
  });
