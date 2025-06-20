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

const persons = ["je", "tu", "il", "nous", "vous", "ils"];

async function loadData() {
  const [verbsRes, rulesRes] = await Promise.all([
    fetch(chrome.runtime.getURL("data/verbs.json")),
    fetch(chrome.runtime.getURL("data/rules.json"))
  ]);
  verbs = await verbsRes.json();
  rules = await rulesRes.json();
}

function normalizeLabel(label) {
  return label.replace("il/elle/on", "il").replace("ils/elles", "ils");
}

function showHint() {
  hintEl.style.display = "block";
  hintEl.innerHTML =
    "<strong>Réponses correctes :</strong><br>" +
    Object.entries(answers)
      .map(([person, conjugation]) => `<b>${capitalizeFirst(person)}</b> : ${conjugation}`)
      .join("<br>");
}

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pickVerb() {
  const verbEntry = verbs[Math.floor(Math.random() * verbs.length)];
  const tenses = Object.keys(verbEntry.conjugations);
  const tense = tenses[Math.floor(Math.random() * tenses.length)];

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

  // Capitalize verb and tense for display
  const displayVerb = capitalizeFirst(current.verb);
  const displayTense = normalizedTense
    .split(" ")
    .map(word => capitalizeFirst(word))
    .join(" ");
  verbTenseEl.textContent = `${displayVerb} - ${displayTense}`;

  // Show if verb is regular or irregular
  verbTypeEl.textContent = current.type === "irregular" ? "Verbe irrégulier" : "Verbe régulier";

  // Robust rule lookup
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

  // Render form
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

  // Always render answers, but hide them initially
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

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputs = form.querySelectorAll(".form-row input");

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

    // Hide the "Vérifier" button
    document.getElementById("verifyBtn").style.display = "none";

    // Hide the correct answers
    hintEl.style.display = "none";

    // Disable inputs and show "Nouvel exercice" and "Fermer" buttons
    form.querySelectorAll("input").forEach(input => input.disabled = true);

    // Remove existing action buttons if any
    document.querySelectorAll(".action-btn").forEach(btn => btn.remove());

    // Create "Nouvel exercice" button
    const newBtn = document.createElement("button");
    newBtn.textContent = "Nouvel exercice";
    newBtn.className = "action-btn";
    newBtn.style.marginRight = "10px";
    newBtn.type = "button";
    newBtn.onclick = () => {
      // Remove action buttons and re-enable form
      document.querySelectorAll(".action-btn").forEach(btn => btn.remove());
      form.querySelectorAll("input").forEach(input => input.disabled = false);
      document.getElementById("verifyBtn").style.display = ""; // Show the button again
      pickVerb();
    };

    // Create "Fermer" button
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
    if (failCount >= 3) {
      hintEl.style.display = "block";
    }
    // Restore the rule/helper text after incorrect attempt
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
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  pickVerb();
});
