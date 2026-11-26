const STORAGE_KEY = "paivanKalorilaskuri_v1";
const CALORIE_TARGET_KEY = "paivanKalorilaskuri_calorieTarget";
const DEFICIT_TARGET_KEY = "paivanKalorilaskuri_deficitTarget";
const STATE_VERSION = 2;

const STEP_CONFIG = [
  { id: "aamiainen", title: "Valitse aamiainen" },
  { id: "lounas", title: "Valitse lounas" },
  { id: "paivallinen", title: "Valitse päivällinen" },
  { id: "iltapala", title: "Valitse iltapala" },
  { id: "muut", title: "Lisää muut syödyt" }
];

const appEl = document.getElementById("app");
const appShellEl = document.querySelector(".app-shell");
const stepTitleEl = document.getElementById("step-title");
const topbarEl = document.getElementById("topbar");
const totalKcalEl = document.getElementById("total-kcal");
const totalTargetEl = document.getElementById("total-target");
const stepProgressEl = document.getElementById("step-progress");

let state = migrateState(loadState() || createInitialState());
state.deficitTarget = Number.isFinite(Number(state.deficitTarget)) ? Number(state.deficitTarget) : loadSavedDeficitTarget();
state.calorieTarget = Number.isFinite(Number(state.calorieTarget)) ? Number(state.calorieTarget) : 2600;

function loadSavedCalorieTarget() {
  return 2600;
}

function loadSavedDeficitTarget() {
  try {
    const raw = localStorage.getItem(DEFICIT_TARGET_KEY);
    return raw ? Number(raw) : 500;
  } catch {
    return 500;
  }
}

function createInitialState() {
  return {
    version: STATE_VERSION,
    date: getTodayISO(),
    currentStep: 0,
    completed: false,
    setupDone: false,
    calorieTarget: 2600,
    deficitTarget: loadSavedDeficitTarget(),
    selections: {}
  };
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
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

function migrateState(savedState) {
  if (savedState.version >= STATE_VERSION) return savedState;

  const snack = savedState.selections?.valipala;
  if (snack) {
    const otherFoods = savedState.selections.muut;
    const productsById = new Map();

    [...(otherFoods?.tuotteet || []), ...(snack.tuotteet || [])].forEach((item) => {
      const existing = productsById.get(item.id);
      productsById.set(item.id, existing
        ? { ...existing, maara: existing.maara + item.maara }
        : { ...item });
    });

    const tuotteet = [...productsById.values()];
    savedState.selections.muut = {
      tyyppi: "custom",
      nimi: "Muut",
      kcal: Math.round(tuotteet.reduce((total, item) => total + item.kcal * item.maara, 0)),
      tuotteet
    };
    delete savedState.selections.valipala;
  }

  if (!savedState.completed && savedState.currentStep > 2) {
    savedState.currentStep -= 1;
  }

  savedState.version = STATE_VERSION;
  return savedState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sumTotals() {
  return Object.values(state.selections).reduce(
    (acc, entry) => {
      acc.kcal += Number(entry.kcal || 0);
      return acc;
    },
    { kcal: 0 }
  );
}

function sortByFavoriteThenName(items) {
  return [...items].sort((a, b) =>
    Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
    String(a.nimi || "").localeCompare(String(b.nimi || ""), "fi", {
      sensitivity: "base"
    })
  );
}

function updateCounter(previewKcal = 0) {
  const totals = sumTotals();
  const kcal = totals.kcal + previewKcal;
  const consumption = state.calorieTarget || 2600;
  const deficitTarget = Math.max(0, Number(state.deficitTarget ?? 500));
  const eatableTarget = Math.max(0, consumption - deficitTarget);
  const overTargetThreshold = 100;
  const remainingToEatableTarget = Math.round(eatableTarget - kcal);

  totalKcalEl.textContent = String(Math.round(kcal));
  totalTargetEl.textContent = String(Math.round(eatableTarget));

  const progressEl = document.getElementById("kcal-progress");
  if (!progressEl) return;
  const pct = eatableTarget === 0
    ? kcal <= 0
      ? 100
      : 0
    : Math.max(0, Math.min((kcal / eatableTarget) * 100, 100));

  let colorState = "topbar--green";
  let barColor = "#4ade80";
  const underTargetThreshold = 400;

  if (kcal >= eatableTarget + overTargetThreshold) {
    colorState = "topbar--red";
    barColor = "#f87171";
  } else if (kcal > eatableTarget) {
    colorState = "topbar--orange";
    barColor = "#fbbf24";
  } else if (remainingToEatableTarget >= underTargetThreshold) {
    colorState = "topbar--orange";
    barColor = "#fbbf24";
  } else {
    colorState = "topbar--green";
    barColor = "#4ade80";
  }

  if (eatableTarget === 0 && kcal > 0 && kcal < overTargetThreshold) {
    colorState = "topbar--orange";
    barColor = "#fbbf24";
  }

  if (eatableTarget === 0 && kcal >= overTargetThreshold) {
    colorState = "topbar--red";
    barColor = "#f87171";
  }

  topbarEl.classList.remove("topbar--green", "topbar--orange", "topbar--red");
  topbarEl.classList.add(colorState);

  progressEl.style.width = pct + "%";
  progressEl.style.background = barColor;
}

function updateStepProgress(percent) {
  const progress = Math.max(0, Math.min(percent, 100));
  const markers = [...stepProgressEl.children];
  const currentIndex = Math.round((progress / 100) * (markers.length - 1));

  const markerProgress = (currentIndex / (markers.length - 1)) * 100;
  stepProgressEl.style.setProperty("--step-progress", `${markerProgress}%`);
  markers.forEach((marker, index) => {
    marker.classList.toggle("is-complete", index < currentIndex);
    marker.classList.toggle("is-current", index === currentIndex);
    if (index === currentIndex) {
      marker.setAttribute("aria-current", "step");
    } else {
      marker.removeAttribute("aria-current");
    }
  });
}

function nextStep() {
  state.currentStep += 1;
  if (state.currentStep >= STEP_CONFIG.length) {
    state.completed = true;
  }
  saveState();
  render();
}

function resetApp() {
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  saveState();
  render();
}

function setSelection(mealId, selection) {
  state.selections[mealId] = selection;
  saveState();
  updateCounter();
}

function clearSelection(mealId) {
  delete state.selections[mealId];
  saveState();
  updateCounter();
}

function updateSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, rgba(31,42,31,0.12) ${pct}%)`;
}

function renderCaloriePicker() {
  const saved = state.calorieTarget || 2600;
  const savedDeficit = Math.max(0, Number(state.deficitTarget ?? 500));
  appEl.innerHTML = `
    <div class="calorie-picker">
      <p class="picker-label">Päivän kulutus</p>
      <div class="kcal-display" id="kcal-display">${saved} <span class="kcal-unit">kcal</span></div>
      <div class="slider-wrap">
        <span class="slider-bound">1600</span>
        <input type="range" id="calorie-slider" min="1600" max="3000" step="50" value="${saved}" />
        <span class="slider-bound">3000</span>
      </div>

      <p class="picker-label">Tavoitevaje</p>
      <div class="kcal-display" id="deficit-display">${savedDeficit} <span class="kcal-unit">kcal</span></div>
      <div class="slider-wrap">
        <span class="slider-bound">0</span>
        <input type="range" id="deficit-slider" min="0" max="600" step="10" value="${savedDeficit}" />
        <span class="slider-bound">600</span>
      </div>

      <button class="primary-btn proceed-btn" id="start-btn">Aloita aamiaisesta &rarr;</button>
    </div>
  `;

  const slider = document.getElementById("calorie-slider");
  const deficitSlider = document.getElementById("deficit-slider");
  const display = document.getElementById("kcal-display");
  const deficitDisplay = document.getElementById("deficit-display");

  updateSliderFill(slider);
  updateSliderFill(deficitSlider);

  slider.addEventListener("input", () => {
    display.innerHTML = `${slider.value} <span class="kcal-unit">kcal</span>`;
    updateSliderFill(slider);
  });

  deficitSlider.addEventListener("input", () => {
    deficitDisplay.innerHTML = `${deficitSlider.value} <span class="kcal-unit">kcal</span>`;
    updateSliderFill(deficitSlider);
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    state.calorieTarget = Number(slider.value);
    state.deficitTarget = Number(deficitSlider.value);
    state.setupDone = true;
    localStorage.setItem(CALORIE_TARGET_KEY, String(state.calorieTarget));
    localStorage.setItem(DEFICIT_TARGET_KEY, String(state.deficitTarget));
    saveState();
    render();
  });
}

function render() {
  updateCounter();

  if (!state.setupDone) {
    appShellEl.classList.remove("app-shell--wide");
    stepTitleEl.textContent = "Päivän kulutus ja tavoitevaje";
    updateStepProgress(0);
    renderCaloriePicker();
    return;
  }

  if (state.completed) {
    appShellEl.classList.remove("app-shell--wide");
    stepTitleEl.textContent = "Päivän yhteenveto";
    updateStepProgress(100);
    renderSummary();
    return;
  }

  const step = STEP_CONFIG[state.currentStep];
  stepTitleEl.textContent = step.title;
  updateStepProgress(((state.currentStep + 1) / (STEP_CONFIG.length + 1)) * 100);

  if (step.id === "muut") {
    renderOtherFoodsPicker();
    return;
  }

  renderMealPicker(step.id);
}

function renderMealPicker(mealId) {
  appShellEl.classList.remove("app-shell--wide");
  const optionsKey = ["aamiainen", "iltapala"].includes(mealId)
    ? "aamu_ilta"
    : ["lounas", "paivallinen"].includes(mealId)
      ? "lounas_illallinen"
      : mealId;
  const options = sortByFavoriteThenName(MEAL_OPTIONS[optionsKey] || []);
  appEl.innerHTML = `
    <h2 class="section-title">Valitse valmiista vaihtoehdoista</h2>
    <div class="grid" id="meal-grid"></div>
    <div class="actions">
      <button class="custom-toggle" id="manual-btn">Mukautettu ateria</button>
      <button class="ghost-btn danger-btn" id="cancel-btn">Peruuta</button>
    </div>
  `;

  const grid = document.getElementById("meal-grid");
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    if (option.favorite) {
      button.classList.add("option-btn--favorite");
    }
    button.innerHTML = `
      <span class="option-name">${option.nimi}</span>
      ${option.favorite ? '<span class="favorite-badge">Yleinen valinta</span>' : ""}
      <span class="option-meta">${option.kcal} kcal</span>
    `;

    button.addEventListener("click", () => {
      setSelection(mealId, {
        tyyppi: "valmis",
        nimi: option.nimi,
        kcal: option.kcal,
        tuotteet: []
      });
      nextStep();
    });

    grid.appendChild(button);
  });

  document.getElementById("manual-btn").addEventListener("click", () => {
    renderManualMealPicker(mealId);
  });

  document.getElementById("cancel-btn").addEventListener("click", resetApp);
}

function renderManualMealPicker(mealId) {
  appShellEl.classList.add("app-shell--wide");
  appEl.innerHTML = `
    <h2 class="section-title">Lisää ateria manuaalisesti</h2>
    <form class="manual-form" id="manual-form" novalidate>
      <label class="field-label" for="manual-name">Nimi</label>
      <input class="field-input" id="manual-name" name="name" type="text" value="Tuntematon" required />

      <label class="field-label" for="manual-kcal">Energia (kcal)</label>
      <div class="manual-slider-value" id="manual-kcal-value">500 kcal</div>
      <div class="slider-wrap slider-wrap--manual">
        <span class="slider-bound">0</span>
        <input type="range" id="manual-kcal" name="kcal" min="0" max="1500" step="10" value="500" required />
        <span class="slider-bound">1500</span>
      </div>

      <div class="actions">
        <button class="primary-btn" type="submit">Lisää valinta</button>
        <button class="ghost-btn" type="button" id="manual-back-btn">Takaisin valintoihin</button>
      </div>
    </form>
  `;

  document.getElementById("manual-back-btn").addEventListener("click", () => {
    renderMealPicker(mealId);
  });

  const kcalInput = document.getElementById("manual-kcal");
  const nameInput = document.getElementById("manual-name");
  const kcalValueEl = document.getElementById("manual-kcal-value");

  let allowAutoName = true;

  function getAutoNameByKcal(kcal) {
    if (kcal <= 350) return "Kevyt tuntematon";
    if (kcal <= 500) return "Tuntematon";
    return "Tuhti tuntematon";
  }

  function maybeApplyAutoName() {
    if (!allowAutoName) return;
    nameInput.value = getAutoNameByKcal(Number(kcalInput.value));
  }

  function updateManualSliderValues() {
    kcalValueEl.textContent = `${kcalInput.value} kcal`;
  }

  updateSliderFill(kcalInput);
  maybeApplyAutoName();
  updateManualSliderValues();

  kcalInput.addEventListener("input", () => {
    updateSliderFill(kcalInput);
    maybeApplyAutoName();
    updateManualSliderValues();
  });

  nameInput.addEventListener("input", () => {
    const value = String(nameInput.value || "").trim();
    const autoNames = ["Tuntematon", "Kevyt tuntematon", "Tuhti tuntematon"];
    allowAutoName = autoNames.includes(value);
  });

  document.getElementById("manual-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const nimi = String(nameInput.value || "").trim();
    const kcal = Number(kcalInput.value);
    if (!nimi || !Number.isFinite(kcal) || kcal < 0) {
      window.alert("Täytä kaikki kentät oikein.");
      return;
    }

    setSelection(mealId, {
      tyyppi: "manual",
      nimi,
      kcal: Math.round(kcal),
      tuotteet: []
    });

    nextStep();
  });
}

function calculateIngredientTotals(items) {
  return items.reduce(
    (acc, item) => {
      acc.kcal += item.kcal * item.maara;
      return acc;
    },
    { kcal: 0 }
  );
}

function normalizeText(value) {
  return String(value || "")
    .toLocaleLowerCase("fi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function renderOtherFoodsPicker() {
  const mealId = "muut";
  appEl.innerHTML = `
    <div class="section-head"><h2 class="section-title section-title--inline">Valitse aterioiden ulkopuoliset syömiset</h2><button class="ghost-btn" id="skip-btn" type="button">Ohita</button></div>
    <input class="field-input ingredient-search" id="ingredient-search" type="search" placeholder="Hae ainesosaa..." aria-label="Hae ainesosaa" />
    <div class="ingredients" id="ingredient-list"></div>
    <div class="actions">
      <button class="primary-btn" id="save-custom-btn">Laske summa</button>
      <button class="ghost-btn danger-btn" id="cancel-btn">Peruuta</button>
    </div>
  `;

  const list = document.getElementById("ingredient-list");
  // restore previously saved quantities when returning to this step
  const savedItems = state.selections[mealId]?.tuotteet || [];
  const savedQty = Object.fromEntries(savedItems.map((i) => [i.id, i.maara]));

  const sortedIngredients = sortByFavoriteThenName(INGREDIENT_OPTIONS);

  sortedIngredients.forEach((ingredient) => {
    const row = document.createElement("div");
    row.className = "ingredient-row";
    if (ingredient.favorite) {
      row.classList.add("ingredient-row--favorite");
    }
    row.dataset.name = normalizeText(ingredient.nimi);

    row.innerHTML = `
      <div>
        <label>${ingredient.nimi}</label>
        ${ingredient.favorite ? '<span class="favorite-badge">Yleinen valinta</span>' : ""}
        <small>${ingredient.kcal} kcal / ${ingredient.yksikko}</small>
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
        // Subtract already-committed items so they are not counted twice.
        const oldKcal = state.selections[mealId]?.kcal || 0;
        const preview = INGREDIENT_OPTIONS.reduce(
          (acc, ing) => {
            const v = Number(document.getElementById(`qty-${ing.id}`)?.dataset.value || 0);
            acc.kcal += ing.kcal * v;
            return acc;
          },
          { kcal: 0 }
        );
        updateCounter(preview.kcal - oldKcal);
      });
    });
    list.appendChild(row);
  });

  const searchEl = document.getElementById("ingredient-search");
  const applyIngredientFilter = () => {
    const query = normalizeText(searchEl.value);
    list.querySelectorAll(".ingredient-row").forEach((row) => {
      const matches = query.length === 0 || row.dataset.name.includes(query);
      row.style.display = matches ? "grid" : "none";
    });
  };

  searchEl.addEventListener("input", applyIngredientFilter);
  searchEl.addEventListener("change", applyIngredientFilter);

  document.getElementById("cancel-btn").addEventListener("click", resetApp);

  document.getElementById("skip-btn").addEventListener("click", () => {
    clearSelection(mealId);
    nextStep();
  });

  document.getElementById("save-custom-btn").addEventListener("click", () => {
    const items = INGREDIENT_OPTIONS.map((ingredient) => {
      const value = document.getElementById(`qty-${ingredient.id}`).dataset.value;
      const quantity = Math.max(0, Number(value || 0));

      return {
        id: ingredient.id,
        nimi: ingredient.nimi,
        maara: quantity,
        kcal: ingredient.kcal,
        yksikko: ingredient.yksikko
      };
    }).filter((item) => item.maara > 0);

    if (items.length === 0) {
      clearSelection(mealId);
      nextStep();
      return;
    }

    const totals = calculateIngredientTotals(items);

    setSelection(mealId, {
      tyyppi: "custom",
      nimi: "Muut",
      kcal: Math.round(totals.kcal),
      tuotteet: items
    });

    nextStep();
  });
}

function mealLabel(mealId) {
  const labels = {
    aamiainen: "Aamiainen",
    lounas: "Lounas",
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
        <p class="summary-meta">${Math.round(data.kcal)} kcal</p>
        ${details}
      </article>
    `;
  }).join("");

  appEl.innerHTML = `
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
