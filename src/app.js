const rp = require('request-promise');
const _ = require('lodash');
const Args = require('./args');
const Spotify = require('./spotify');
const Youtube = require('./youtube');
const Cache = require('./cache');

Args.set();
const args = Args.get();

const spotifyPlaylistId = args.id ? args.id : Spotify.getPlaylistIdFromUrl(args.url);
if (!spotifyPlaylistId) {
  throw 'Could not get id from playlist url';
}

Cache.load();

// authenticate with spotify
!args.skipApi && Youtube.getMatchingPlaylists(args.channelId, spotifyPlaylistId)
  .then((matchingPlaylists) => {
    args.debug && console.log(`Matching playlists:\n${matchingPlaylists}`);
    const matchingPlaylist = matchingPlaylists[0];
    if (matchingPlaylist && !args.upsertPlaylist) {
      console.log(`Matching playlist:\n${matchingPlaylist}`);
    } else {
      const ytPlaylistId = matchingPlaylist ? 'TODO' : null;
      Spotify.authenticate()
        .then((token) => {
          // use that autheticated token to get tracks for the given playlist
          Spotify.getPlaylistTracks(token, spotifyPlaylistId)
            .then(({ title, tracks }) => {
              const basicTracks = tracks.map(Spotify.toBasicTrack);
              args.debugSpotify && console.log(basicTracks, `length: ${basicTracks.length}`);

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
                    args.upsertPlaylist && Youtube.upsertPlaylist(args.channelId, ytPlaylistId, spotifyPlaylistId, title, bestYtIds)
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
    }
  });

