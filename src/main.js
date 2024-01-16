import { reactive } from '@starbeam/collections';
// import { reactive } from '@starbeam/js';
import { Cell, DEBUG_RENDERER } from '@starbeam/universal';

import { avg, find, slidingWindowAverageOf, timeout, timestampsToIntervals } from './utils.js';

// NOTE:
//  60,000 / BPM = [one beat in ms]
//
//  BPM = 60000 / [one beat in ms]
const MS_IN_M = 60_000;

const MIN_BEATS = 10;

let tempo = Cell(120);
let latency = Cell();
let userTempo = Cell();

// each time a beat plays, the time it played is added to here.
// this'll be used to subtract from the user times (at the same index)
// to get an accurate read of latency.
//
// In the case of Apple Airpods, latency may be measured in seconds,
// so its important to *not* use the previous approach and hope the user
// presses the response key before the next beat (which meant that
//   https://github.com/NullVoxPopuli/latency-tester/issues/2
//   the user presses would line up with future beats.
let beatTimes = reactive.array();
// a lest of timestamps the user has entered.
// hopefully these match up with the timestamps of when the "beat" was played.
let userTimes = reactive.array();

let elements = {
  // data
  bpmInput: find('#bpm'),
  latencyDisplay: find('#latency'),
  modLatencyDisplay: find('#modLatency'),
  detectedBpm: find('#detectedBPM'),
  beatDuration: find('#beatDuration'),
  // controls
  stop: find('#stop'),
  tapZone: find('#tap-zone'),
  // info
  progress: find('progress'),
};

// audio player
// some inspiration from
// https://codepen.io/SitePoint/pen/JRaLVR?editors=1010
let isRunning = Cell(false);
let audioContext = new AudioContext();
let audioBuffer = await loadSound();
let player; // AudioBufferSourceNode

async function loadSound() {
  let response = await fetch('./kick.mp3', { mode: 'no-cors' });
  let arrayBuffer = await response.arrayBuffer();
  let audio = await audioContext.decodeAudioData(arrayBuffer);

  return audio;
}

function playSound(buffer, delay = 0) {
  player = audioContext.createBufferSource();
  player.buffer = audioBuffer;
  player.connect(audioContext.destination);
  player.loop = false;
  player.start(delay);
}

async function start() {
  let currentBpmInMs = MS_IN_M / tempo.current;

  // Why do arrays not have a clear?
  beatTimes.splice(0, beatTimes.length);
  userTimes.splice(0, userTimes.length);

  while (isRunning.current && countdown.current === 0) {
    playSound(audioBuffer);
    beatTimes.push(new Date());
    await timeout(currentBpmInMs);
  }
}

elements.bpmInput.value = tempo.current;
elements.bpmInput.addEventListener('input', (e) => {
  let value = e.target.value;
  let num = parseInt(value, 10);

  if (num) {
    tempo.current = num;
  }
});

let countdown = Cell(3);

elements.stop.addEventListener('click', () => {
  stop();
  clearTimeout(gettingReadyTimeout);
  clearInterval(progressInterval);

  isRunning.current = false;
  elements.progress.style.display = 'none';
  elements.tapZone.innerHTML = 'tap here to start';
});

function countdownMessage(count) {
  return `
    <h1>${count}</h1>
      On "zero", the beat will play. 
      <br>
      Tap when you hear it.
    `;
}

let gettingReadyTimeout;
let progressInterval;

elements.tapZone.addEventListener('click', () => {
  if (isRunning.current && countdown.current === 0) {
    userTimes.push(new Date());

    // Keep the number of entries low
    if (userTimes.length > MIN_BEATS) {
      userTimes.shift();
      // do the same for the beats
      // we want to make sure we keep the window about the same size
      // this also allows us to account for the situation where
      // the user time could be > 1 or 2 beat-lengths different
      // from the beat time.
      beatTimes.shift();
    }

    return;
  }

  isRunning.current = true;
  elements.tapZone.innerHTML = `Get ready`;
  elements.progress.style.display = 'block';

  let fiveS = 5_000;
  let increments = 1;

  progressInterval = setInterval(() => {
    increments += 1;
    elements.progress.value = fiveS - increments * 100;
  }, 100);
  gettingReadyTimeout = setTimeout(() => {
    countdown.current = 3;
    elements.tapZone.innerHTML = countdownMessage(countdown.current);

    gettingReadyTimeout = setTimeout(() => {
      countdown.current = 2;
      elements.tapZone.innerHTML = countdownMessage(countdown.current);

      gettingReadyTimeout = setTimeout(() => {
        countdown.current = 1;
        elements.tapZone.innerHTML = countdownMessage(countdown.current);

        gettingReadyTimeout = setTimeout(() => {
          countdown.current = 0;
          elements.tapZone.innerHTML = 'Tap';
          clearInterval(progressInterval);
          elements.progress.style.display = 'none';

          start();
        }, 1000);
      }, 1000);
    }, 1000);
  }, 2000);
});

DEBUG_RENDERER.render({
  render: () => userTempo.current,
  debug: (tempo) => {
    elements.detectedBpm.innerHTML = tempo ? tempo.toFixed(3) : 'pending';
  },
});

DEBUG_RENDERER.render({
  render: () => [...userTimes],
  debug: (times) => {
    if (times.length < 2) return;

    let intervals = timestampsToIntervals(times);

    let intervalAvg = avg(intervals);
    let bpm = 60000 / intervalAvg;

    userTempo.current = bpm;
  },
});

DEBUG_RENDERER.render({
  render: () => {
    return {
      userTimes: [...userTimes],
      beatTimes: [...beatTimes],
    };
  },
  debug: (data) => {
    let userLength = data.userTimes.length;

    if (userLength < 2) return;

    // Get the approprate length of system-beats.
    // It's possible there are more system beats,
    // because the user is delayed.
    //
    // Likewise, it's also possible someone is trying to break the tool
    // and give more beats faster than they're supposed to
    let systemBeats = data.beatTimes.slice(0, Math.min(userLength, data.beatTimes.length));

    let intervals = [];

    for (let i = 0; i < userLength; i++) {
      let user = data.userTimes[i];
      let system = data.beatTimes[i];
      let interval = user - system;

      intervals.push(interval);
    }

    let latencyAvg = avg(intervals);

    latency.current = latencyAvg;
  },
});

DEBUG_RENDERER.render({
  render: () => [latency.current, tempo.current],
  debug: ([ms, bpm]) => {
    // We can't get milliseconds with more precisions than 1 decimal place.
    // This is probably fine, as human's can't perceive the difference between
    // tenths of milliseconds.
    let rounded = ms ? ms.toFixed(1) : 0;
    let beatDuration = MS_IN_M / bpm;
    let mod = rounded ? (rounded % (MS_IN_M / bpm)).toFixed(1) : 'pending';

    elements.latencyDisplay.innerHTML = rounded || 'pending';
    elements.modLatencyDisplay.innerHTML = mod;
  },
});

DEBUG_RENDERER.render({
  render: () => tempo.current,
  debug: (bpm) => (elements.beatDuration.innerHTML = MS_IN_M / bpm),
});

DEBUG_RENDERER.render({
  render: () => isRunning.current,
  debug: (isRunning) => {
    if (isRunning) {
      elements.bpmInput.disabled = true;
      elements.stop.style.display = 'block';

      return;
    }

    elements.bpmInput.disabled = false;
    elements.stop.style.display = 'none';
  },
});
