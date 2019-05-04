const Common = require('./common');
const Args = require('./args');

const MAX = 10;
const MIN = 5;

const scoreObjs = [
  {
    func: (target, source) => Common.includesIgnoreCase(target.title, source.title),
    weight: 2
  },
  {
    func: (target, source) => Common.includesIgnoreCase(target.title, source.artists[0]),
    weight: 1
  },
  {
    func: (target, source) => Common.includesIgnoreCase(target.title, 'official'),
    weight: 1
  },
  {
    func: (target, source) => Common.includesIgnoreCase(target.channel, source.artists[0]),
    weight: 1
  },
  {
    func: (target, source) => Common.includesIgnoreCase(target.channel, source.artists[0].replace(/\s/g, '')),
    weight: 1
  },
  {
    func: (target, source) => Common.equalsIgnoreCase(target.channel, source.artists[0]),
    weight: 2
  },
  {
    func: (target, source) => Common.includesIgnoreCase(target.channel, 'vevo'),
    weight: 2
  },
  {
    func: (target, source) => Common.equalsIgnoreCase(target.channel, 'vevo'),
    weight: 2
  }
];

const isShittyFuncs = [
  // if yt has it but not the actual song, it's likely a shitty upload
  (target, source) => Common.includesIgnoreCase(target.title, 'lyrics') && !Common.includesIgnoreCase(source.title, 'lyrics'),
  (target, source) => Common.includesIgnoreCase(target.title, 'high quality') && !Common.includesIgnoreCase(source.title, 'high quality'),
  (target, source) => Common.includesIgnoreCase(target.title, 'album version') && !Common.includesIgnoreCase(source.title, 'album version'),
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

  const score = scoreObjs.reduce((acc, curr) => {
    return acc + (curr.func(youtubeResult, queryObj) ? curr.weight : 0);
  }, 0);

  return score;
}

module.exports = {
  MIN,
  MAX,
  calculate
};
