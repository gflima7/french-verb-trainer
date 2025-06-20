chrome.runtime.onInstalled.addListener(() => {
  // Set the alarm to trigger every 30 minutes
  chrome.alarms.create("frenchTrainerAlarm", {
    periodInMinutes: 30
  });
});

chrome.alarms.onAlarm.addListener(() => {
  openQuiz();
});

chrome.action.onClicked.addListener(() => {
  openQuiz();
});

function openQuiz() {
  chrome.windows.create({
    url: chrome.runtime.getURL("src/quiz.html"),
    type: "popup",
    width: 400
  });
}
