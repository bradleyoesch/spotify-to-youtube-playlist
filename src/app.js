const rp = require('request-promise');
const __ = require('./lodashes');
const Args = require('./args');
const Spotify = require('./spotify');
const Youtube = require('./youtube');

Args.set();
const args = Args.get();

const playlistId = Spotify.getPlaylistIdFromUrl(args.url);
if (!playlistId) {
  throw 'Could not get id from playlist url';
}

!args.skipAll && Spotify.authenticate()
  .then((token) => {

    Spotify.getPlaylistTracks(token, playlistId)
      .then((tracks) => {

        const basicTracks = tracks.map(Spotify.toBasicTrack);
        const ytQueryObjects = basicTracks.map(Youtube.toQueryObject);
        const ytQueryChunks = __.chunk(ytQueryObjects, args.chunkSize);
        // TODO: should probably implement shitty caching first
        // probably just write to file with json parsing
        // { spotifyId, ytId }

        if (!args.skipYoutube) {
          Youtube.getBestIdsFromQueryChunks(ytQueryChunks)
            .then((bestYtIds) => {
              console.log('bestYtIds');
              console.log(bestYtIds);
            })
        }
      })
      .catch((playlistErr) => {
        console.log('playlistErr');
        console.log(playlistErr);
      });
  });

