let data = {};

fetch('./../data/data.json')
  .then(response => response.json())
  .then(json => {
    data = json;
  })
  .catch(err => {
    console.error("Erreur de chargement du JSON :", err);
  });

function lookup() {
  const input = document.getElementById('coord');
  const result = document.getElementById('result');
  const key = input.value.trim().toUpperCase();

  result.classList.remove('found', 'notfound');

  if (!key) {
    result.textContent = "Entre une coordonnée.";
    return;
  }

  if (data.hasOwnProperty(key)) {
    result.textContent = data[key];
    result.classList.add('found');
  } else {
    result.textContent = "Aucune valeur pour \"" + key + "\"";
    result.classList.add('notfound');
  }
}

document.getElementById('coord').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') lookup();
});