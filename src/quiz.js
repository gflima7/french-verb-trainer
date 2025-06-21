// === DOM Elements & State ===
const form = document.getElementById("conjugationForm");
const verbTenseEl = document.getElementById("verbTense");
const helperEl = document.getElementById("helper");
const hintEl = document.getElementById("hint");
const verbTypeEl = document.getElementById("verbType");

let verbs = [];
let rules = {};
let current = {};
let answers = {};
let failCount = 0;

// === Constants ===
const persons = ["je", "tu", "il", "nous", "vous", "ils"];

// === Data Loading ===
async function loadData() {
  const [verbsRes, rulesRes] = await Promise.all([
    fetch("../data/verbs.json"),
    fetch("../data/rules.json")
  ]);
  verbs = await verbsRes.json();
  rules = await rulesRes.json();
}

// === Utility Functions ===
function normalizeLabel(label) {
  return label.replace("il/elle/on", "il").replace("ils/elles", "ils");
}

function showHint() {
  hintEl.style.display = "block";
  hintEl.innerHTML =
    "<strong>Réponses correctes :</strong><br>" +
    Object.entries(answers)
      .map(([person, conjugation]) =>
        `<b>${capitalizeFirst(person)}</b> : ${conjugation}`
      )
      .join("<br>");
  document.querySelector('.center-layout').classList.add('with-hint');
}

// When hiding the hint, remove the class:
function hideHint() {
  hintEl.style.display = "none";
  document.querySelector('.center-layout').classList.remove('with-hint');
}

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// === SRS (Spaced Repetition System) ===
function getSRSData() {
  return JSON.parse(localStorage.getItem("srsData") || "{}");
}

function setSRSData(data) {
  localStorage.setItem("srsData", JSON.stringify(data));
}

function updateSRS(verb, tense, success) {
  const key = `${verb}::${tense}`;
  const data = getSRSData();
  const now = Date.now();
  let entry = data[key] || { streak: 0, next: now };

  if (success) {
    entry.streak = (entry.streak || 0) + 1;
    const intervals = [1, 2, 4, 7, 15, 30];
    const days = intervals[Math.min(entry.streak, intervals.length - 1)];
    entry.next = now + days * 24 * 60 * 60 * 1000;
  } else {
    entry.streak = 0;
    entry.next = now + 24 * 60 * 60 * 1000;
  }

  data[key] = entry;
  setSRSData(data);
}

function pickVerbSRS() {
  const data = getSRSData();
  const now = Date.now();
  const due = [];

  verbs.forEach(verbEntry => {
    Object.keys(verbEntry.conjugations).forEach(tense => {
      const key = `${verbEntry.verb}::${tense.replace(/-/g, " ")}`;
      const entry = data[key];
      if (!entry || entry.next <= now) {
        due.push({ verbEntry, tense });
      }
    });
  });

  let verbEntry, tense;
  if (due.length) {
    const pick = due[Math.floor(Math.random() * due.length)];
    verbEntry = pick.verbEntry;
    tense = pick.tense;
  } else {
    verbEntry = verbs[Math.floor(Math.random() * verbs.length)];
    const tenses = Object.keys(verbEntry.conjugations);
    tense = tenses[Math.floor(Math.random() * tenses.length)];
  }

  return { verbEntry, tense };
}

function updateVerifyBtnColor() {
  const btn = document.getElementById("verifyBtn");
  btn.classList.remove("btn-attempt-0", "btn-attempt-1", "btn-attempt-2", "btn-attempt-3");
  if (failCount >= 3) {
    btn.classList.add("btn-attempt-3");
  } else {
    btn.classList.add(`btn-attempt-${failCount}`);
  }
}

function updateVerifyBtnText() {
  const btn = document.getElementById("verifyBtn");
  if (!btn) return;
  btn.textContent = (failCount >= 3) ? "Suivant" : "Vérifier";
}

// === Quiz Setup & Rules ===
function pickVerb() {
  const { verbEntry, tense } = pickVerbSRS();

  let normalizedTense = tense.replace(/-/g, " ");

  current = {
    verb: verbEntry.verb,
    tense: normalizedTense,
    type: verbEntry.type
  };

  answers = {};
  const conjugations = verbEntry.conjugations[tense];
  for (let key in conjugations) {
    answers[normalizeLabel(key)] = conjugations[key];
  }

  failCount = 0;
  updateVerifyBtnColor();
  updateVerifyBtnText();

  const displayVerb = capitalizeFirst(current.verb);
  const displayTense = normalizedTense
    .split(" ")
    .map(word => capitalizeFirst(word))
    .join(" ");
  verbTenseEl.textContent = `${displayVerb} - ${displayTense}`;

  verbTypeEl.textContent = current.type === "irregular" ? "Verbe irrégulier" : "Verbe régulier";

  let rule = "";
  if (rules[tense]) {
    rule =
      rules[tense]["all"] ||
      (current.type === "regular" && current.verb?.endsWith("er") && rules[tense]["regular -er"]) ||
      (current.type === "regular" && current.verb?.endsWith("ir") && rules[tense]["regular -ir"]) ||
      (current.type === "regular" && current.verb?.endsWith("re") && rules[tense]["regular -re"]) ||
      (rules[tense]["irregular"] && current.type === "irregular" && rules[tense]["irregular"]) ||
      rules[tense]["regular"] ||
      "";
  }
  if (!rule) rule = "No rule found for this tense.";
  helperEl.textContent = rule;

  form.innerHTML = "";
  persons.forEach(label => {
    const row = document.createElement("div");
    row.className = "form-row";

    const lbl = document.createElement("label");
    lbl.textContent = capitalizeFirst(label);

    const input = document.createElement("input");
    input.setAttribute("data-label", label);
    input.type = "text";

    row.appendChild(lbl);
    row.appendChild(input);
    form.appendChild(row);
  });

  let answersHtml =
    "<strong>Réponses correctes :</strong><br>" +
    Object.entries(answers)
      .map(([person, conjugation]) => `<b>${capitalizeFirst(person)}</b>: ${conjugation}`)
      .join("<br>");
  hintEl.innerHTML = answersHtml;
  hintEl.style.display = "none";

  persons.forEach(label => {
    const input = form.querySelector(`input[data-label="${label}"]`);
    input.addEventListener("input", () => {
      const user = input.value.trim().toLowerCase();
      const correct = answers[label]?.toLowerCase();
      if (user === correct && user !== "") {
        input.style.borderColor = "green";
        input.title = "";
      } else if (user !== "") {
        input.style.borderColor = "red";
        input.title = `Correct : ${correct}`;
      } else {
        input.style.borderColor = "";
        input.title = "";
      }
    });
  });

  persons.forEach((label, idx) => {
    const input = form.querySelector(`input[data-label="${label}"]`);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = form.querySelector(`input[data-label="${persons[idx + 1]}"]`);
        if (next) next.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = form.querySelector(`input[data-label="${persons[idx - 1]}"]`);
        if (prev) prev.focus();
      }
    });
  });
}

// === Quiz Submission & Feedback ===
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = document.getElementById("verifyBtn");
  const inputs = form.querySelectorAll(".form-row input");

  if (failCount >= 3 && btn.textContent === "Suivant") {
    let hasEmpty = false, hasWrong = false;
    inputs.forEach((input) => {
      const label = input.getAttribute("data-label");
      const user = input.value.trim().toLowerCase();
      const correct = answers[label]?.toLowerCase();

      // Remove previous error state
      input.classList.remove("input-error");
      input.placeholder = "";
      input.title = "";

      if (!user) {
        input.value = "";
        input.placeholder = "Veuillez remplir ce champ";
        input.classList.add("input-error");
        hasEmpty = true;
      } else if (user !== correct) {
        input.value = "";
        input.placeholder = "Corrigez cette réponse";
        input.classList.add("input-error");
        hasWrong = true;
      }
    });

    // Add focus handler for error fields
    inputs.forEach((input) => {
      input.addEventListener("focus", function handler() {
        if (input.classList.contains("input-error")) {
          input.classList.remove("input-error");
          input.placeholder = "";
          input.title = "";
          input.removeEventListener("focus", handler);
        }
      });
    });

    if (hasEmpty || hasWrong) return;
    pickVerb();
    return;
  }

  let correctCount = 0;

  inputs.forEach((input) => {
    const label = input.getAttribute("data-label");
    const user = input.value.trim().toLowerCase();
    const correct = answers[label]?.toLowerCase();

    if (user === correct && user !== "") {
      input.style.borderColor = "green";
      correctCount++;
    } else if (user !== "") {
      input.style.borderColor = "red";
      input.title = `Correct: ${correct}`;
    } else {
      input.style.borderColor = "";
      input.title = "";
    }
  });

  if (correctCount === Object.values(answers).length) {
    helperEl.textContent = "✅ Tout est correct ! Bravo.";
    updateSRS(current.verb, current.tense, true);

    document.getElementById("verifyBtn").style.display = "none";

    hintEl.style.display = "none";

    form.querySelectorAll("input").forEach(input => input.disabled = true);

    document.querySelectorAll(".action-btn").forEach(btn => btn.remove());

    const newBtn = document.createElement("button");
    newBtn.textContent = "Nouvel exercice";
    newBtn.className = "action-btn";
    newBtn.style.marginRight = "10px";
    newBtn.type = "button";
    newBtn.onclick = () => {
      document.querySelectorAll(".action-btn").forEach(btn => btn.remove());
      form.querySelectorAll("input").forEach(input => input.disabled = false);
      document.getElementById("verifyBtn").style.display = "";
      pickVerb();
    };

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Fermer";
    closeBtn.className = "action-btn";
    closeBtn.type = "button";
    closeBtn.onclick = () => {
      window.close();
    };

    form.parentNode.appendChild(newBtn);
    form.parentNode.appendChild(closeBtn);

  } else {
    failCount++;
    updateSRS(current.verb, current.tense, false);
    if (failCount >= 3) {
      showHint(); 
    } else {
      hintEl.style.display = "none"; 
    }
    const tense = current.tense;
    let rule = "";
    if (rules[tense]) {
      rule =
        rules[tense]["all"] ||
        (current.type === "regular" && current.verb?.endsWith("er") && rules[tense]["regular -er"]) ||
        (current.type === "regular" && current.verb?.endsWith("ir") && rules[tense]["regular -ir"]) ||
        (current.type === "regular" && current.verb?.endsWith("re") && rules[tense]["regular -re"]) ||
        (rules[tense]["irregular"] && current.type === "irregular" && rules[tense]["irregular"]) ||
        rules[tense]["regular"] ||
        "";
    }
    if (!rule) rule = "Aucune règle trouvée pour ce temps.";
    helperEl.textContent = rule;
  }

  updateVerifyBtnColor();
  updateVerifyBtnText();
});

document.getElementById("close-alert").onclick = function() {
  document.getElementById("alert-overlay").style.display = "none";
};

function showAlertBanner() {
  const banner = document.getElementById("alert-banner");
  banner.classList.add("show");
  banner.style.display = "block";
  setTimeout(() => {
    banner.classList.remove("show");
    setTimeout(() => { banner.style.display = "none"; }, 300);
  }, 2200); // visible for 2.2s
}

// === App Initialization ===
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  pickVerb();
});
