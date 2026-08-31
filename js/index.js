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

  const entry = data[key];

  // Cas simple : une string directe
  if (typeof entry === "string") {
    result.textContent = entry;
    result.classList.add('found');
    return;
  }

  // Cas protégé : un objet avec plusieurs adresses possibles
  if (typeof entry === "object" && entry.addresses) {
    askForAddress(key, entry);
    return;
  }
}

function askForAddress(key, entry) {
  const result = document.getElementById('result');
  result.classList.remove('found', 'notfound');
  result.innerHTML = `
    <div style="margin-bottom: 0.5rem;">Adresse requise pour "${key}"</div>
    <input id="addressInput" type="text" placeholder="Entre l'adresse" style="margin-bottom:0.5rem;">
    <button id="validateAddress" style="width:100%;">Valider</button>
  `;

  const addressInput = document.getElementById('addressInput');
  const validateBtn = document.getElementById('validateAddress');

  // Pré-calcule une map normalisée : adresse normalisée -> valeur
  const normalizedMap = {};
  for (const [addr, val] of Object.entries(entry.addresses)) {
    normalizedMap[normalize(addr)] = val;
  }

  function checkAddress() {
    const userKey = normalize(addressInput.value);
    if (normalizedMap.hasOwnProperty(userKey)) {
      result.textContent = normalizedMap[userKey];
      result.classList.add('found');
    } else {
      result.textContent = "Adresse incorrecte.";
      result.classList.add('notfound');
    }
  }

  validateBtn.addEventListener('click', checkAddress);
  addressInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') checkAddress();
  });
  addressInput.focus();
}

document.getElementById('coord').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') lookup();
});