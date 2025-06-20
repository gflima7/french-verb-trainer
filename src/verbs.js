const verbs = ["être", "avoir", "aller", "faire", "finir", "prendre", "venir", "dire", "pouvoir", "voir"];
const tenses = ["présent", "imparfait", "futur", "passé composé", "conditionnel"];

function gaussianRandom(mean = 0, stdev = 1) {
  let u = 1 - Math.random(); 
  let v = 1 - Math.random();
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickRandomGaussian(arr) {
  let index;
  do {
    index = Math.round(gaussianRandom(arr.length / 2, arr.length / 4));
  } while (index < 0 || index >= arr.length);
  return arr[index];
}

function getVerbAndTense() {
  const verb = pickRandomGaussian(verbs);
  const tense = pickRandomGaussian(tenses);
  const helper = `Example: ${verb} in ${tense}`;
  return { verb, tense, helper };
}
