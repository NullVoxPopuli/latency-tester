export function timeout(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function slidingWindowAverageOf(array, amount = 10) {
  let subArray = array.slice(amount);
  let avg =
    subArray.reduce((sum, current) => current + sum, 0) / subArray.length;

  return avg;
}
