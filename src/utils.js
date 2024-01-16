export function find(selector) {
  return document.querySelector(selector);
}

export function timeout(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function slidingWindowAverageOf(array, amount = 10) {
  let subArray = array.slice(amount);

  return avg(subArray);
}

export function avg(array) {
  return array.reduce((sum, current) => current + sum, 0) / array.length;
}

export function timestampsToIntervals(array) {
  let intervals = [];

  for (let i = 0; i < array.length - 1; i++) {
    let later = array[i + 1];
    let before = array[i];
    let interval = later - before;

    intervals.push(interval);
  }

  return intervals;
}
