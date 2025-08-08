const municipis = [];
let markers = [];

const municipiInput = document.getElementById('municipiInput');
const autocompleteList = document.getElementById('autocomplete-list');
const cido_dom = undefined;
let oposicions= undefined;

let municipiSeleccionat = null; // Objeto con {name, lat, lng}

const map = L.map('map', {
  center: [41.8, 1.5],
  zoom: 8,
  doubleClickZoom: false,  // <--- Aquí desactivas zoom con doble clic
  maxBounds: L.latLngBounds([40.3, 0.0], [43.0, 3.5]),
  maxBoundsViscosity: 1.0,
  scrollWheelZoom: false
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 18
}).addTo(map);

const coordsBox = document.getElementById('coords');
map.on('mousemove', e => {
  coordsBox.textContent = `Lat: ${e.latlng.lat.toFixed(5)}, Lng: ${e.latlng.lng.toFixed(5)}`;
});

fetch('data/municipis.json')
  .then(response => response.json())
  .then(data => {
    data.forEach(m => {
      municipis.push({ name: m.Nom, lat: m.Latitud, lng: m.Longitud });
      const marker = L.marker([m.Latitud, m.Longitud]);
      marker.bindPopup(`<b>${m.Nom}</b>`);
      markers[m.Nom] = marker;
    });
  })
  .catch(err => console.error(err));

function closeAllLists() {
  autocompleteList.innerHTML = '';
}

function createAutocompleteItem(municipi) {
  const div = document.createElement('div');
  div.textContent = municipi.name;
  div.classList.add('autocomplete-item');
  div.addEventListener('click', () => {
    municipiInput.value = municipi.name;
    closeAllLists();
    selectMunicipi(municipi.name);
  });
  return div;
}
const list = document.getElementById('oposicionsList');
list.innerHTML = '';

function mostrarOposicions(lista) {
  // 1. Limpiar marcadores actuales del mapa
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  // 2. Limpiar listado HTML
  const container = document.getElementById('oposicionsList');
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<p>No hay oposiciones que coincidan con el filtro.</p>';
    return;
  }

  // 3. Recorrer lista de oposiciones filtradas
  lista.forEach(opos => {
    const card = document.createElement('div');
    card.className = 'oposicio-card';
    console.log(opos)
    card.innerHTML = `
      <div class="oposicio-title">${opos.resum}</div>
      <div class="oposicio-info">
        <strong>Ajuntament:</strong> ${opos.nom}<br>
        <strong>Data:</strong> ${new Date(opos.data_publicacio).toLocaleDateString()}
        <strong>Data termini:</strong> ${new Date(opos.data_venciment).toLocaleDateString()}
      </div>
      <a class="oposicio-link" href="${opos.enllac}" target="_blank">Veure més</a>
    `;

    container.appendChild(card);

    // Añadir marcador al mapa
    if (opos.lat && opos.lng) {
      const marker = L.marker([opos.lat, opos.lng]).addTo(map);

      const popupHTML = `
        <strong>${opos.resum}</strong><br>
        ${opos.nom}<br>
        Publicat: ${new Date(opos.data_publicacio).toLocaleDateString()}<br>
        Venciment: ${opos.data_venciment ? new Date(opos.data_venciment).toLocaleDateString() : "No hi ha data"}<br>
        <a href="${opos.enllac}" target="_blank">Veure detall</a>
      `;
  
      marker.bindPopup(popupHTML);      
      markers.push(marker);
    }
  });
}


function onMunicipiSeleccionat(name) {
  municipiSeleccionat = municipis.find(m => m.name === name);
  filtrarOposicions(oposicions);
}
function selectMunicipi(name) {
  onMunicipiSeleccionat(name)
  const marker = markers[name];
  if (!marker) return;
  if (!map.hasLayer(marker)) {
    marker.addTo(map);
  }
  // No mover ni hacer zoom, solo abrir popup
  marker.openPopup();
}

// Filtrado básico con búsqueda aproximada (case insensitive)
municipiInput.addEventListener('input', () => {
  const val = municipiInput.value.trim().toLowerCase();
  closeAllLists();
  if (!val) return;

  // Filtrar municipios que contienen el texto
  const matches = municipis.filter(m =>
    m.name.toLowerCase().includes(val)
  ).slice(0, 10); // máximo 10 resultados

  matches.forEach(m => {
    const item = createAutocompleteItem(m);
    autocompleteList.appendChild(item);
  });
});

// Cerrar lista si se hace clic fuera
document.addEventListener('click', e => {
  if (e.target !== municipiInput) {
    closeAllLists();
  }
});

// Opcional: manejo de teclas para navegar la lista (arriba, abajo, enter)
let currentFocus = -1;

municipiInput.addEventListener('keydown', (e) => {
  const items = autocompleteList.querySelectorAll('.autocomplete-item');
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    currentFocus++;
    if (currentFocus >= items.length) currentFocus = 0;
    setActive(items);
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    currentFocus--;
    if (currentFocus < 0) currentFocus = items.length -1;
    setActive(items);
    e.preventDefault();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (currentFocus > -1) {
      items[currentFocus].click();
    }
  }
});

function setActive(items) {
  items.forEach(i => i.classList.remove('autocomplete-active'));
  if (currentFocus > -1 && items[currentFocus]) {
    items[currentFocus].classList.add('autocomplete-active');
  }
}

const today = new Date();

// Fecha dos meses atrás
const dosMesesAntes = new Date(today);
dosMesesAntes.setMonth(today.getMonth() - 2);

// Asegurar que el día sigue siendo válido al restar meses (por ejemplo, 31 de julio → 30 de mayo)
if (dosMesesAntes.getDate() !== today.getDate()) {
  dosMesesAntes.setDate(0); // último día del mes anterior
}

// Formatear en formato YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

const filters = {
  data_darrer_anunci: formatDate(dosMesesAntes),
  termini_presentaci: formatDate(today),
  ens_keyword: "AJUNTAMENT",
  resum_keyword: "Admin",
  limit: 50,
  count:0
};

const baseUrl = "https://analisi.transparenciacatalunya.cat/api/v3/views/a2hm-uzyj/query.json";
const countbaseURL = "https://analisi.transparenciacatalunya.cat/api/v3/views/a2hm-uzyj/query.json";

async function fetchData() {

  const query = `
    SELECT 
      \`resum\` AS __select_alias__,
      \`data_pub\` AS __select_alias1__,
      \`data_darrer_anunci\` AS __select_alias2__,
      \`enlla\` AS __select_alias3__,
      \`codi_ens\` AS __select_alias4__,
      \`nom_ens\` AS __select_alias5__,
      \`termini_presentaci_\` AS __select_alias6__,
      \`latitud\` AS __select_alias7__,
      \`longitud\` AS __select_alias8__,
      \`geocoded\` AS __select_alias9__
    WHERE 
      (\`data_darrer_anunci\` > '${filters.data_darrer_anunci}' 
        AND \`data_darrer_anunci\` IS NOT NULL)
      AND (
        (\`termini_presentaci_\` > '${filters.termini_presentaci}' 
          AND \`termini_presentaci_\` IS NOT NULL)
        OR \`termini_presentaci_\` IS NULL)
      AND (UPPER(\`nom_ens\`) LIKE '%${filters.ens_keyword.toUpperCase()}%')
      AND (UPPER(\`resum\`) LIKE '%${filters.resum_keyword.toUpperCase()}%')
    LIMIT ${filters.limit}
  `;

  const url = `${baseUrl}?query=${encodeURIComponent(query)}`;
  const app_token = "U29jcmF0YS0td2VraWNrYXNz0";
  const crsf_token = "chX03khzvFhY8F-g65VXq0cYVun1hXCw8qFJ0ZQKvJteifCccqlUr1ZNyMXshFL4ShlOMlVV_ZltAvzfEUdrZA";
  

  const response = await fetch(url, {
    headers: {
      "X-App-Token": app_token,
      "X-CSRF-Token": crsf_token || "",
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Error al obtener los datos: ${response.status}`);
  }

  const data = await response.json();
  oposicions = data.map(item => ({
    resum: item["__select_alias__"],
    data_publicacio: item["__select_alias1__"],
    data_venciment: item["__select_alias6__"],
    enllac: item["__select_alias3__"]?.url,
    nom: item["__select_alias5__"],
    lat: parseFloat(item["__select_alias7__"]),
    lng: parseFloat(item["__select_alias8__"])
  }));

  mostrarOposicions(oposicions)
  await fetchCount();

  return data;
}

function actualizarLimitCount() {
  const display = document.getElementById('limitCountDisplay');
  if (!display) return;

  display.textContent = `Es mostren ${filters.limit} de  ${filters.count}`;
}

async function fetchCount() {

  const countQuery = `
    SELECT 
      count(*) as __count_alias__
    WHERE 
      (\`data_darrer_anunci\` > '${filters.data_darrer_anunci}' 
        AND \`data_darrer_anunci\` IS NOT NULL)
      AND (
        (\`termini_presentaci_\` > '${filters.termini_presentaci}' 
          AND \`termini_presentaci_\` IS NOT NULL)
        OR \`termini_presentaci_\` IS NULL)
      AND (UPPER(\`nom_ens\`) LIKE '%${filters.ens_keyword.toUpperCase()}%')
      AND (UPPER(\`resum\`) LIKE '%${filters.resum_keyword.toUpperCase()}%')
    LIMIT ${filters.limit}
  `;

  const url = `${countbaseURL}?query=${encodeURIComponent(countQuery)}`;
  const app_token = "U29jcmF0YS0td2VraWNrYXNz0";
  const crsf_token = "chX03khzvFhY8F-g65VXq0cYVun1hXCw8qFJ0ZQKvJteifCccqlUr1ZNyMXshFL4ShlOMlVV_ZltAvzfEUdrZA";
  

  const response = await fetch(url, {
    headers: {
      "X-App-Token": app_token,
      "X-CSRF-Token": crsf_token || "",
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Error al obtener los datos: ${response.status}`);
  }

  const data = await response.json();

  filters.count = data[0].__count_alias__;

  actualizarLimitCount();
}

const searchBtn = document.getElementById('searchBtn');

searchBtn.addEventListener('click', () => {
  // Usamos los IDs correctos según el HTML proporcionado
  filters.data_darrer_anunci = document.getElementById('dateFilter').value || "";
  filters.termini_presentaci = document.getElementById('dateFilterTermini').value || "";
  filters.ens_keyword = document.getElementById('ensFilter').value || "";
  filters.resum_keyword = document.getElementById('resumFilter').value || "";
  filters.limit = parseInt(document.getElementById('limitFilter').value) || 100;

  fetchData();
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const toRad = angle => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en km
}

let distanciaKm = null;  // Variable global para la distancia

const distanceInput = document.getElementById('distanceInput');

distanceInput.addEventListener('input', () => {
  const val = distanceInput.value.trim();
  distanciaKm = val === '' ? null : Number(val);
  filtrarOposicions();
  
  // Aquí puedes añadir código para filtrar el mapa o lista usando distanciaKm
});

function filtrarOposicions() {
  if (!municipiSeleccionat || distanciaKm === null || distanciaKm === 0) {
    // Mostrar todas si no hay filtro completo
    mostrarOposicions(oposicions);
    return;
  }

  const filtradas = oposicions.filter(op => {
    const dist = haversineDistance(
      municipiSeleccionat.lat, municipiSeleccionat.lng,
      op.lat, op.lng
    );
    return dist <= distanciaKm;
  });
  
  mostrarOposicions(filtradas);
}

fetchData()

function inicializarFiltros() {
  document.getElementById('dateFilter').value = filters.data_darrer_anunci;
  document.getElementById('dateFilterTermini').value = filters.termini_presentaci;
  document.getElementById('ensFilter').value = filters.ens_keyword;
  document.getElementById('resumFilter').value = filters.resum_keyword;
  document.getElementById('limitFilter').value = filters.limit;
}

// Llamar al cargar
inicializarFiltros();