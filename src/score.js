const __ = require('./lodashes');
const Args = require('./args');

const MAX = 10;
const MIN = 4;

const scoreFuncs = [
  (target, source) => __.includesIgnoreCase(target.title, source.title) ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.title, source.artists[0]) ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.title, 'official') ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.channel, source.artists[0]) ? 1 : 0,
  (target, source) => __.includesIgnoreCase(target.channel, source.artists[0].replace(/\s/g, '')) ? 1 : 0,
  (target, source) => __.equalsIgnoreCase(target.channel, source.artists[0]) ? 2 : 0,
  (target, source) => __.includesIgnoreCase(target.channel, 'vevo') ? 2 : 0,
  (target, source) => __.equalsIgnoreCase(target.channel, 'vevo') ? 2 : 0,
];

const isShittyFuncs = [
  // if yt has it but not the actual song, it's likely a shitty upload
  (target, source) => __.includesIgnoreCase(target.title, 'lyrics') && !__.includesIgnoreCase(source.title, 'lyrics'),
  (target, source) => __.includesIgnoreCase(target.title, 'high quality') && !__.includesIgnoreCase(source.title, 'high quality'),
  (target, source) => __.includesIgnoreCase(target.title, 'album version') && !__.includesIgnoreCase(source.title, 'album version'),
];

/**
 * Just given a youtube result of { title, channel }
 * And a spotify track of { title, [ artists ] }
 * See if we can reasonably guess if the result is likely a music video for the track
 */
function calculate(youtubeResult, queryObj) {
  const isShitty = isShittyFuncs.some((func) => {
    return func(youtubeResult, queryObj);
  });
  if (isShitty) {
    return 0;
  }

  const score = scoreFuncs.reduce((acc, curr) => {
    return acc + curr(youtubeResult, queryObj);
  }, 0);

  if (Args.get().debug) {
    console.log('youtubeResult');
    console.log(youtubeResult);
    console.log('queryObj');
    console.log(queryObj);
    console.log(score);
  }
  return score;
}

module.exports = {
  MIN,
  MAX,
  calculate
};
