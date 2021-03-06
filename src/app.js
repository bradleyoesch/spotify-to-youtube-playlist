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

// authenticate with spotify
!args.skipApi && Spotify.authenticate()
  .then((token) => {
    // use that autheticated token to get tracks for the given playlist
    Spotify.getPlaylistTracks(token, playlistId)
      .then(({ title, tracks }) => {
        const basicTracks = tracks.map(Spotify.toBasicTrack);
        args.debugSpotify && console.log(basicTracks, basicTracks.length);

        if (!args.skipYoutube) {
          // convert the tracks to youtube queries to find the best videos
          const ytQueryObjects = basicTracks.map(Youtube.toQueryObject);
          Youtube.getBestIdsFromQueries(ytQueryObjects)
            .then((bestYtIds) => {
              console.log('bestYtIds');
              console.log(bestYtIds);
              console.log('bestYtIds.length: ' + bestYtIds.length);
              Cache.write();
              Cache.print('hits');
              args.upsertPlaylist && Youtube.upsertPlaylist(playlistId, title, bestYtIds)
                .then((response) => {
                  console.log('upsertPlaylist response');
                  console.log(response);
                })
            });
        }
      })
      .catch((playlistErr) => {
        console.log('playlistErr');
        console.log(playlistErr);
      });
  });
