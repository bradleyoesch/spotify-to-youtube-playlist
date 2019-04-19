const __ = require('./lodashes');
const Args = require('./args');

const MAX = 10;
const MIN = 4;

const scoreSumFuncs = [
  (target, source) => __.includesIgnoreCase(target.title, source.title) ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.title, source.artists[0]) ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.title, 'official') ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.channel, source.artists[0]) ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.channel, source.artists[0].replace(/\s/g, '')) ? 1 : 0,
  (target, source) => __.equalsIgnoreCase(target.channel, source.artists[0]) ? 2 : 0,
  (target, source) => __.includesIgnoreCase(target.channel, 'vevo') ? 2 : 0,
  (target, source) => __.equalsIgnoreCase(target.channel, 'vevo') ? 2 : 0,
];

const scoreMultFuncs = [
  // if yt has it but not the actual song, revert to 0 bc it's likely a shitty upload
  (target, source) => __.includesIgnoreCase(target.title, 'lyrics') && !__.includesIgnoreCase(source.title, 'lyrics') ? 0 : 1,
  (target, source) => __.includesIgnoreCase(target.title, 'high quality') && !__.includesIgnoreCase(source.title, 'high quality') ? 0 : 1,
  (target, source) => __.includesIgnoreCase(target.title, 'album version') && !__.includesIgnoreCase(source.title, 'album version') ? 0 : 1,
];

/**
 * Just given a youtube result of { title, channel }
 * And a spotify track of { title, [ artists ] }
 * See if we can reasonably guess if the result is likely a music video for the track
 */
function calculate(youtubeResult, queryObj) {
  const initialScore = 0;

  const sumScore = scoreSumFuncs.reduce((acc, curr) => {
    return acc + curr(youtubeResult, queryObj);
  }, initialScore);

  const multScore = scoreMultFuncs.reduce((acc, curr) => {
    return acc * curr(youtubeResult, queryObj);
  }, sumScore)

  if (Args.get().debug) {
    console.log('youtubeResult');
    console.log(youtubeResult);
    console.log('queryObj');
    console.log(queryObj);
    console.log(multScore);
  }
  return multScore;
}

function test() {
  const target = {
    title: 'mark demiller - song name lyrics',
    // title: 'mark demiller - song name (official music video)',
    channel: 'mark demiller'
  };
  const source = {
    title: 'song name',
    artists: [ 'mark demiller' ]
  }
  const foo = scoreSumFuncs.reduce((acc, curr) => {
    return acc + curr(target, source);
  }, 0);
  const bar = scoreMultFuncs.reduce((acc, curr) => {
    return acc * curr(target, source);
  }, foo)
  console.log(bar);
}

test();

module.exports = {
  MIN,
  MAX,
  calculate
};
