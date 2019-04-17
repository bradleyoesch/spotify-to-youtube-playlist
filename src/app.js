const rp = require('request-promise');
const __ = require('./lodashes');
const Spotify = require('./spotify');
const Youtube = require('./youtube');

function parseArgs() {
  const args = {};
  if (process.argv.length <= 2) {
    return {};
  }
  const argArr = process.argv.slice(2);
  for (let i = 0; i < argArr.length; i++) {
    const arg = argArr[i];
    const nextArg = argArr[i + 1];
    // only support --arg value and -flag
    if (arg[0] === '-') {
      if (arg[1] === '-') {
        args[arg.slice(2)] = !isNaN(nextArg) ? parseInt(nextArg) : nextArg;
        i++;
      } else {
        args[arg.slice(1)] = true;
      }
    }
  }
  return args;
}

const args = parseArgs();
const playlistUrl = args.url;
if (!playlistUrl) {
  throw 'Playlist url is required!';
}
const limit = args.limit || 5;
const chunkSize = args.chunk || 5;
const playlistId = Spotify.getPlaylistIdFromUrl(playlistUrl);
if (!playlistId) {
  throw 'Could not get id from playlist url';
}

Spotify.authenticate()
  .then((response) => {
    const token = response.access_token;

    Spotify.getPlaylistBasicTrackInfo(token, playlistId)
      .then((playlistResponse) => {

        const tracks = playlistResponse.tracks.items.slice(0, limit).map(Spotify.toSummarizedTrack);
        const ytQueryObjects = tracks.map(Youtube.toQueryObject);
        const ytQueryChunks = __.chunk(ytQueryObjects, chunkSize);

        // TODO: should probably implement shitty caching first
        // probably just write to file with json parsing
        // { spotifyId, ytId }

        Youtube.getBestIdsFromQueryChunks(ytQueryChunks)
          .then((bestYtIds) => {
            console.log('bestYtIds');
            console.log(bestYtIds);
          })
      })
      .catch((playlistErr) => {
        console.log('playlistErr');
        console.log(playlistErr);
      });
  });

