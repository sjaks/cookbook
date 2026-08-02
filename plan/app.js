const STORAGE_KEY = "paivanKalorilaskuri_v1";
const CALORIE_TARGET_KEY = "paivanKalorilaskuri_calorieTarget";

const STEP_CONFIG = [
  { id: "aamiainen", title: "Valitse aamiainen" },
  { id: "lounas", title: "Valitse lounas" },
  { id: "valipala", title: "Valitse välipala" },
  { id: "paivallinen", title: "Valitse päivällinen" },
  { id: "iltapala", title: "Valitse iltapala" },
  { id: "muut", title: "Lisää muut syödyt" }
];

const appEl = document.getElementById("app");
const stepTitleEl = document.getElementById("step-title");
const totalKcalEl = document.getElementById("total-kcal");
const totalProteinEl = document.getElementById("total-protein");

let state = loadState() || createInitialState();

function loadSavedCalorieTarget() {
  try {
    const raw = localStorage.getItem(CALORIE_TARGET_KEY);
    return raw ? Number(raw) : 2000;
  } catch {
    return 2000;
  }
}

function createInitialState() {
  return {
    date: getTodayISO(),
    currentStep: 0,
    completed: false,
    setupDone: false,
    calorieTarget: loadSavedCalorieTarget(),
    selections: {}
  };
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Tallennetun tilan lukeminen epaonnistui", error);
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sumTotals() {
  return Object.values(state.selections).reduce(
    (acc, entry) => {
      acc.kcal += Number(entry.kcal || 0);
      acc.proteiini += Number(entry.proteiini || 0);
      return acc;
    },
    { kcal: 0, proteiini: 0 }
  );
}

function updateCounter(previewKcal = 0, previewProtein = 0) {
  const totals = sumTotals();
  const kcal = totals.kcal + previewKcal;
  const proteiini = totals.proteiini + previewProtein;
  totalKcalEl.textContent = String(Math.round(kcal));
  totalProteinEl.textContent = String(Math.round(proteiini * 10) / 10);

  const progressEl = document.getElementById("kcal-progress");
  if (!progressEl) return;
  const target = state.calorieTarget || 2000;
  const pct = Math.min((kcal / target) * 100, 100);
  const over = kcal - target;
  const barColor    = over > 80 ? "#f87171" : over > 0 ? "#fbbf24" : "#4ade80";
  const bgGradient  = over > 80
    ? "linear-gradient(145deg, #7f1d1d, #6b1111)"
    : over > 0
    ? "linear-gradient(145deg, #78350f, #5c2a00)"
    : "linear-gradient(145deg, #0d7f4f, #0b6a43)";
  progressEl.style.width = pct + "%";
  progressEl.style.background = barColor;
  totalKcalEl.closest(".counter-card").style.background = bgGradient;
}

function nextStep() {
  state.currentStep += 1;
  if (state.currentStep >= STEP_CONFIG.length) {
    state.completed = true;
  }
  saveState();
  render();
}

function setSelection(mealId, selection) {
  state.selections[mealId] = selection;
  saveState();
  updateCounter();
}

function updateSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, rgba(31,42,31,0.12) ${pct}%)`;
}

function renderCaloriePicker() {
  const saved = state.calorieTarget || 2000;
  appEl.innerHTML = `
    <div class="calorie-picker">
      <p class="picker-label">Aseta päivän energiatavoite</p>
      <div class="kcal-display" id="kcal-display">${saved} <span class="kcal-unit">kcal</span></div>
      <div class="slider-wrap">
        <span class="slider-bound">1600</span>
        <input type="range" id="calorie-slider" min="1600" max="3000" step="50" value="${saved}" />
        <span class="slider-bound">3000</span>
      </div>
      <button class="primary-btn proceed-btn" id="start-btn">Aloita aamiaisesta &rarr;</button>
    </div>
  `;

  const slider = document.getElementById("calorie-slider");
  const display = document.getElementById("kcal-display");

  updateSliderFill(slider);

  slider.addEventListener("input", () => {
    display.innerHTML = `${slider.value} <span class="kcal-unit">kcal</span>`;
    updateSliderFill(slider);
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    state.calorieTarget = Number(slider.value);
    state.setupDone = true;
    localStorage.setItem(CALORIE_TARGET_KEY, String(state.calorieTarget));
    saveState();
    render();
  });
}

function render() {
  updateCounter();

  if (!state.setupDone) {
    stepTitleEl.textContent = "Energiatavoite";
    renderCaloriePicker();
    return;
  }

  if (state.completed) {
    stepTitleEl.textContent = "Päivän yhteenveto";
    renderSummary();
    return;
  }

  const step = STEP_CONFIG[state.currentStep];
  stepTitleEl.textContent = step.title;

  if (step.id === "muut") {
    renderCustomIngredientPicker(step.id, true);
    return;
  }

  renderMealPicker(step.id);
}

function renderMealPicker(mealId) {
  const options = MEAL_OPTIONS[mealId] || [];
  appEl.innerHTML = `
    <h2 class="section-title">Valitse valmiista vaihtoehdoista</h2>
    <div class="grid" id="meal-grid"></div>
    <button class="custom-toggle" id="custom-btn">Tai rakenna oma ateria aineksista</button>
  `;

  const grid = document.getElementById("meal-grid");
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.innerHTML = `
      <span class="option-name">${option.nimi}</span>
      <span class="option-meta">${option.kcal} kcal · ${option.proteiini} g proteiinia</span>
    `;

    button.addEventListener("click", () => {
      setSelection(mealId, {
        tyyppi: "valmis",
        nimi: option.nimi,
        kcal: option.kcal,
        proteiini: option.proteiini,
        tuotteet: []
      });
      nextStep();
    });

    grid.appendChild(button);
  });

  document.getElementById("custom-btn").addEventListener("click", () => {
    renderCustomIngredientPicker(mealId, false);
  });
}

function calculateIngredientTotals(items) {
  return items.reduce(
    (acc, item) => {
      acc.kcal += item.kcal * item.maara;
      acc.proteiini += item.proteiini * item.maara;
      return acc;
    },
    { kcal: 0, proteiini: 0 }
  );
}

function renderCustomIngredientPicker(mealId, isOthers) {
  const heading = isOthers
    ? "Valitse aterioiden ulkopuoliset syömiset"
    : "Rakenna oma ateria aineksista";

  appEl.innerHTML = `
    <h2 class="section-title">${heading}</h2>
    <div class="ingredients" id="ingredient-list"></div>
    <div class="actions">
      <button class="primary-btn" id="save-custom-btn">${isOthers ? "Laske summa" : "Lisää valinta"}</button>
      ${
        isOthers
          ? ""
          : '<button class="ghost-btn" id="back-btn">Takaisin valmiisiin vaihtoehtoihin</button>'
      }
    </div>
  `;

  const list = document.getElementById("ingredient-list");
  // restore previously saved quantities when returning to this step
  const savedItems = state.selections[mealId]?.tuotteet || [];
  const savedQty = Object.fromEntries(savedItems.map((i) => [i.id, i.maara]));

  INGREDIENT_OPTIONS.forEach((ingredient) => {
    const row = document.createElement("div");
    row.className = "ingredient-row";

    row.innerHTML = `
      <div>
        <label>${ingredient.nimi}</label>
        <small>${ingredient.kcal} kcal · ${ingredient.proteiini} g / ${ingredient.yksikko}</small>
      </div>
      <div class="stepper" id="qty-${ingredient.id}" data-value="${savedQty[ingredient.id] || 0}">
        <button type="button" class="stepper-btn" aria-label="Vähennä">−</button>
        <span class="stepper-val">${savedQty[ingredient.id] || 0}</span>
        <button type="button" class="stepper-btn" aria-label="Lisää">+</button>
      </div>
    `;
    const stepper = row.querySelector(".stepper");
    const valEl = stepper.querySelector(".stepper-val");
    stepper.classList.toggle("has-value", (savedQty[ingredient.id] || 0) > 0);
    stepper.querySelectorAll(".stepper-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = btn.textContent.trim() === "+" ? 1 : -1;
        const next = Math.max(0, Number(stepper.dataset.value) + dir);
        stepper.dataset.value = next;
        valEl.textContent = next;
        stepper.classList.toggle("has-value", next > 0);
        if (isOthers) {
          // subtract already-committed muut so it isn't counted twice
          const oldKcal = state.selections[mealId]?.kcal || 0;
          const oldProtein = state.selections[mealId]?.proteiini || 0;
          const preview = INGREDIENT_OPTIONS.reduce(
            (acc, ing) => {
              const v = Number(document.getElementById(`qty-${ing.id}`)?.dataset.value || 0);
              acc.kcal += ing.kcal * v;
              acc.proteiini += ing.proteiini * v;
              return acc;
            },
            { kcal: 0, proteiini: 0 }
          );
          updateCounter(preview.kcal - oldKcal, preview.proteiini - oldProtein);
        }
      });
    });
    list.appendChild(row);
  });

  if (!isOthers) {
    document.getElementById("back-btn").addEventListener("click", () => {
      renderMealPicker(mealId);
    });
  }

  document.getElementById("save-custom-btn").addEventListener("click", () => {
    const items = INGREDIENT_OPTIONS.map((ingredient) => {
    const value = document.getElementById(`qty-${ingredient.id}`).dataset.value;
      const quantity = Math.max(0, Number(value || 0));

      return {
        id: ingredient.id,
        nimi: ingredient.nimi,
        maara: quantity,
        kcal: ingredient.kcal,
        proteiini: ingredient.proteiini,
        yksikko: ingredient.yksikko
      };
    }).filter((item) => item.maara > 0);

    if (items.length === 0 && !isOthers) {
      window.alert("Valitse ainakin yksi aines ja määrä.");
      return;
    }

    if (items.length === 0 && isOthers) {
      nextStep();
      return;
    }

    const totals = calculateIngredientTotals(items);

    setSelection(mealId, {
      tyyppi: "custom",
      nimi: isOthers ? "Muut" : "Oma ateria",
      kcal: Math.round(totals.kcal),
      proteiini: Math.round(totals.proteiini * 10) / 10,
      tuotteet: items
    });

    nextStep();
  });
}

function mealLabel(mealId) {
  const labels = {
    aamiainen: "Aamiainen",
    lounas: "Lounas",
    valipala: "Välipala",
    paivallinen: "Päivällinen",
    iltapala: "Iltapala",
    muut: "Muut"
  };

  return labels[mealId] || mealId;
}

function renderSummary() {
  const totals = sumTotals();

  const sections = STEP_CONFIG.map((step) => {
    const data = state.selections[step.id];

    if (!data) {
      return `
        <article class="summary-item">
          <p class="summary-heading">${mealLabel(step.id)}</p>
          <p class="summary-meta">Ei kirjattu</p>
        </article>
      `;
    }

    const details = data.tuotteet?.length
      ? `<ul>${data.tuotteet
          .map(
            (item) => `<li>${item.nimi}: ${item.maara} ${item.yksikko}</li>`
          )
          .join("")}</ul>`
      : "";

    return `
      <article class="summary-item">
        <p class="summary-heading">${mealLabel(step.id)}: ${data.nimi}</p>
        <p class="summary-meta">${Math.round(data.kcal)} kcal · ${Math.round(data.proteiini * 10) / 10} g proteiinia</p>
        ${details}
      </article>
    `;
  }).join("");

  appEl.innerHTML = `
    <h2 class="section-title">${formatDate(state.date)}</h2>

    <div class="summary-list">
      ${sections}
    </div>

    <div class="actions">
      <button class="ghost-btn" id="edit-muut-btn">Lisää ruokia</button>
      <button class="primary-btn" id="reset-btn">Laske uusi päivä</button>
    </div>
  `;

  document.getElementById("edit-muut-btn").addEventListener("click", () => {
    state.completed = false;
    state.currentStep = STEP_CONFIG.findIndex((s) => s.id === "muut");
    saveState();
    render();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    state = createInitialState();
    saveState();
    render();
  });
}

render();
