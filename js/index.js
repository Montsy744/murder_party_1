let data = {};

fetch('./../data/data.json')
  .then(response => response.json())
  .then(json => {
    data = json;
  })
  .catch(err => {
    console.error("Erreur de chargement du JSON :", err);
  });

// Normalise une chaîne pour comparaison (accents, casse, espaces superflus)
function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // enlève les accents
}

function lookup() {
  const input = document.getElementById('coord');
  const result = document.getElementById('result');
  const key = input.value.trim().toUpperCase();

  result.classList.remove('found', 'notfound');

  if (!key) {
    result.textContent = "Entre une coordonnée.";
    return;
  }

  if (!data.hasOwnProperty(key)) {
    result.textContent = "Aucune valeur pour \"" + key + "\"";
    result.classList.add('notfound');
    return;
  }

  resolveEntry(key, data[key]);
}

// Fonction centrale : regarde ce qu'exige une entrée (case OU adresse déjà validée)
// et déclenche la bonne étape (adresse, mot de passe, ou affichage direct)
function resolveEntry(label, entry) {
  // Cas 1 : valeur directe, une simple string
  if (typeof entry === "string") {
    showValue(entry);
    return;
  }

  // Cas 2 : un objet qui demande une adresse
  if (typeof entry === "object" && entry.addresses) {
    askForAddress(label, entry);
    return;
  }

  // Cas 3 : un objet qui demande un mot de passe (avec ou sans étape d'adresse avant)
  if (typeof entry === "object" && entry.password) {
    askForPassword(label, entry);
    return;
  }
}

function showValue(value) {
  const result = document.getElementById('result');
  result.classList.remove('found', 'notfound');
  result.textContent = value;
  result.classList.add('found');
}

function showError(message) {
  const result = document.getElementById('result');
  result.classList.remove('found', 'notfound');
  result.textContent = message;
  result.classList.add('notfound');
}

function askForAddress(label, entry) {
  const result = document.getElementById('result');
  result.classList.remove('found', 'notfound');
  result.innerHTML = `
    <div style="margin-bottom: 0.5rem;">Adresse requise pour "${label}"</div>
    <input id="addressInput" type="text" placeholder="Entre l'adresse" style="margin-bottom:0.5rem;">
    <button id="validateAddress" style="width:100%;">Valider</button>
  `;

  const addressInput = document.getElementById('addressInput');
  const validateBtn = document.getElementById('validateAddress');

  // Pré-calcule une map normalisée : adresse normalisée -> sous-entrée
  const normalizedMap = {};
  for (const [addr, subEntry] of Object.entries(entry.addresses)) {
    normalizedMap[normalize(addr)] = subEntry;
  }

  function checkAddress() {
    const userKey = normalize(addressInput.value);
    if (normalizedMap.hasOwnProperty(userKey)) {
      // L'adresse est bonne : on repasse la sous-entrée dans resolveEntry
      // (elle peut être une string directe, OU exiger un mot de passe en plus)
      resolveEntry(label, normalizedMap[userKey]);
    } else {
      showError("Adresse incorrecte.");
    }
  }

  validateBtn.addEventListener('click', checkAddress);
  addressInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') checkAddress();
  });
  addressInput.focus();
}

function askForPassword(label, entry) {
  const result = document.getElementById('result');
  result.classList.remove('found', 'notfound');
  result.innerHTML = `
    <div style="margin-bottom: 0.5rem;">Mot de passe requis pour "${label}"</div>
    <input id="passwordInput" type="password" placeholder="Mot de passe" style="margin-bottom:0.5rem;">
    <button id="validatePassword" style="width:100%;">Valider</button>
  `;

  const passwordInput = document.getElementById('passwordInput');
  const validateBtn = document.getElementById('validatePassword');

  function checkPassword() {
    // comparaison stricte (sensible à la casse) — enlève .trim() des deux côtés si tu veux être tolérant aux espaces
    if (passwordInput.value.trim() === entry.password) {
      showValue(entry.value);
    } else {
      showError("Mot de passe incorrect.");
    }
  }

  validateBtn.addEventListener('click', checkPassword);
  passwordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') checkPassword();
  });
  passwordInput.focus();
}

document.getElementById('coord').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') lookup();
});