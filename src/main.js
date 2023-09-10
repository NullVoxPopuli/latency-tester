// import { reactive } from "@starbeam/collections";
import { reactive } from "@starbeam/js";
import { Cell, DEBUG_RENDERER } from "@starbeam/universal";

import { slidingWindowAverageOf, timeout, find } from "./utils.js";

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
  bpmInput: find("#bpm"),
  latencyDisplay: find("#latency"),
  detectedBpm: find("#detectedBPM"),
  // controls
  stop: find('#stop'), 
  tapZone: find('#tap-zone'), 
  // messaging on top of the controls
  info: find('#info'),
  subinfo: find('#subinfo')
};

// audio player
// some inspiration from
// https://codepen.io/SitePoint/pen/JRaLVR?editors=1010
let isRunning = Cell(false);
let audioContext;
let audioBuffer;
let player; // AudioBufferSourceNode

async function loadSound() {
  if (audioBuffer) return;

  let response = await fetch("./kick.mp3", { mode: "no-cors" });
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
  currentBpmInMs = MS_IN_M / tempo;
  bpmIntervals = [];
  latencies = [];
  audioContext = new AudioContext();
  audioBuffer = await loadSound();

  while (isRunning) {
    playSound(audioBuffer);
    lastBeatAt = new Date();
    await timeout(currentBpmInMs);
  }
}

elements.bpmInput.value = tempo.current;
elements.bpmInput.addEventListener("input", (e) => {
  let value = e.target.value;
  let num = parseInt(value, 10);

  if (num) {
    tempo.current = num;
  }
});

function handleUserBeat(e) {
  let userBeatAt = new Date();

  userTimes.push(userBeatAt);
}

elements.stop.addEventListener('click', () => {
  isRunning.current = false;    
});

elements.tapZone.addEventListener('click', () => {
  if (isRunning.current) {
    // TODO: record tap
    // Get 3 baseline taps first to make sure
    // the user is paying attention
    // be sure to include a countdown

    return;
  }

  isRunning.current = true;
  tapZone.innerHTML = `tap to the beat`;
});

DEBUG_RENDERER.render({
  render: () => userTimes.length <= MIN_BEATS,
  debug: (needMoreData) => {
    if (needMoreData) {
      let remaining = MIN_BEATS - userTimes.length; 

      elements.subinfo.innerHTML = `Need ${remaining} more tap(s)`;
      return;
    }

    elements.subinfo.innerHTML = '';
  },
});

DEBUG_RENDERER.render({
  render: () => userTempo.current, 
  debug: (tempo) => {
    elements.detectedBpm.innerHTML = tempo;
  }
});

DEBUG_RENDERER.render({
  render: () => latency.current, 
  debug: (ms) => {
    elements.latencyDisplay.innerHTML = ms;
  }
});

DEBUG_RENDERER.render({
  render: () => isRunning.current, 
  debug: (isRunning) => {
    if (isRunning) {
      bpmInput.disabled = true;
      elements.stop.style.display = 'block';
      return;
    }
    bpmInput.disabled = false;
    elements.stop.style.display = 'none';
  }
});


function bpmDetector(e) {
  if (e.target === toggler) return;

  let newTimestamp = new Date();
  let interval = bpmLastTimestamp ? newTimestamp - bpmLastTimestamp : 0;

  bpmIntervals.push(interval);
  bpmLastTimestamp = new Date();

  if (bpmIntervals.length > 10) {
    let avg = slidingWindowAverageOf(bpmIntervals);
    let bpm = 60000 / avg;

    detectedBpm.innerHTML = bpm;
  }
}
