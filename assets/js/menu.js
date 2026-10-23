/**
 * Oriel — menu.js
 * Menu page: loads menu data, renders grouped dishes, search + filters,
 * and keeps add-to-cart / quantity controls in sync with the cart store.
 *
 * States handled: loading (skeleton), error (retry), empty results, results.
 * Requires JavaScript; menu.html shows a <noscript> notice otherwise.
 */

import {
  MAX_QTY,
  addItem,
  getItems,
  setQuantity,
  subscribe,
} from "./cart-store.js";
import {
  $,
  $$,
  createEl,
  debounce,
  formatCurrency,
  pluralize,
  prefersReducedMotion,
  showToast,
} from "./utils.js";

const els = {
  form: $("[data-menu-form]"),
  search: $("#menu-search"),
  categoryChips: $("[data-category-chips]"),
  dietChips: $("[data-diet-chips]"),
  count: $("[data-menu-count]"),
  clear: $("[data-clear-filters]"),
  results: $("[data-menu-results]"),
  loading: $("[data-menu-loading]"),
};
const chrome = $$("[data-menu-chrome]");

const state = { query: "", category: "all", diets: new Set() };

let categories = [];
let dietary = [];
let dishes = [];
let entries = []; // [{ dish, text }] — text is the normalised search haystack
let dishById = new Map();
let ready = false;

/* ---------- Helpers ---------- */

const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hasActiveFilters = () =>
  state.query.trim() !== "" || state.category !== "all" || state.diets.size > 0;

function setDisabled(button, disabled) {
  // aria-disabled keeps the button focusable so keyboard focus is never lost.
  if (disabled) button.setAttribute("aria-disabled", "true");
  else button.removeAttribute("aria-disabled");
}

/* ---------- Data loading & validation ---------- */

function validateMenu(mod) {
  const cats = (Array.isArray(mod.CATEGORIES) ? mod.CATEGORIES : []).filter(
    (c) => c && typeof c.id === "string" && typeof c.label === "string"
  );
  const diets = (Array.isArray(mod.DIETARY) ? mod.DIETARY : []).filter(
    (d) =>
      d &&
      typeof d.id === "string" &&
      typeof d.label === "string" &&
      typeof d.short === "string"
  );

  const catIds = new Set(cats.map((c) => c.id));
  const dietIds = new Set(diets.map((d) => d.id));
  const seen = new Set();

  const valid = (Array.isArray(mod.DISHES) ? mod.DISHES : [])
    .filter((d) => {
      const ok =
        d &&
        typeof d.id === "string" &&
        /^[a-z0-9-]+$/.test(d.id) &&
        !seen.has(d.id) &&
        typeof d.name === "string" &&
        d.name.trim() !== "" &&
        typeof d.description === "string" &&
        Number.isInteger(d.priceCents) &&
        d.priceCents >= 0 &&
        catIds.has(d.category);

      if (!ok) {
        console.warn("[oriel] Skipping invalid dish", d);
        return false;
      }
      seen.add(d.id);
      return true;
    })
    .map((d) => ({
      ...d,
      tags: Array.isArray(d.tags) ? d.tags.filter((t) => dietIds.has(t)) : [],
      image: typeof d.image === "string" ? d.image : "",
    }));

  if (!cats.length || !valid.length) {
    throw new Error("Menu data is empty or malformed");
  }
  return { cats, diets, valid };
}

async function loadMenu({ retry = false } = {}) {
  showLoading();
  try {
    // A cache-busting query makes a retry re-fetch after a failed import.
    const mod = await import(
      retry ? `./menu-data.js?retry=${Date.now()}` : "./menu-data.js"
    );
    const { cats, diets, valid } = validateMenu(mod);

    categories = cats;
    dietary = diets;
    dishes = valid;
    dishById = new Map(valid.map((d) => [d.id, d]));

    const catLabel = new Map(cats.map((c) => [c.id, c.label]));
    const dietLabel = new Map(diets.map((d) => [d.id, d.label]));
    entries = valid.map((dish) => ({
      dish,
      text: normalize(
        [
          dish.name,
          dish.description,
          catLabel.get(dish.category),
          ...dish.tags.map((t) => dietLabel.get(t)),
        ].join(" ")
      ),
    }));

    buildFilters();
    chrome.forEach((el) => {
      el.hidden = false;
    });
    ready = true;
    render();
    focusFromHash();
  } catch (error) {
    console.error("[oriel] Menu failed to load", error);
    showError();
  }
}

/* ---------- Loading & error states ---------- */

function showLoading() {
  els.results.setAttribute("aria-busy", "true");
  if (els.loading) els.results.replaceChildren(els.loading);
}

function showError() {
  chrome.forEach((el) => {
    el.hidden = true;
  });
  els.results.removeAttribute("aria-busy");

  const wrap = createEl("div", {
    className: "empty-state",
    attrs: { role: "alert" },
  });
  wrap.append(
    createEl("h2", {
      className: "empty-state__title",
      text: "The menu couldn’t be loaded.",
    }),
    createEl("p", {
      className: "empty-state__text",
      text: "Something went wrong while loading the dishes. Check your connection and try again.",
    })
  );
  const retry = createEl("button", {
    className: "btn btn--primary",
    text: "Try again",
    attrs: { type: "button", "data-action": "retry" },
  });
  wrap.append(retry);
  els.results.replaceChildren(wrap);
}

/* ---------- Filters ---------- */

function buildChip(label, value, pressed) {
  return createEl("button", {
    className: "chip",
    text: label,
    attrs: {
      type: "button",
      "aria-pressed": String(pressed),
      "data-value": value,
    },
  });
}

function buildFilters() {
  els.categoryChips.replaceChildren(
    buildChip("All", "all", state.category === "all"),
    ...categories.map((c) => buildChip(c.label, c.id, state.category === c.id))
  );
  els.dietChips.replaceChildren(
    ...dietary.map((d) => buildChip(d.label, d.id, state.diets.has(d.id)))
  );
}

function syncFilterUI() {
  $$("[data-value]", els.categoryChips).forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.value === state.category));
  });
  $$("[data-value]", els.dietChips).forEach((chip) => {
    chip.setAttribute("aria-pressed", String(state.diets.has(chip.dataset.value)));
  });
  els.clear.hidden = !hasActiveFilters();
}

function filterDishes() {
  const terms = normalize(state.query).split(/\s+/).filter(Boolean);
  const requiredDiets = [...state.diets];

  return entries
    .filter(
      ({ dish, text }) =>
        (state.category === "all" || dish.category === state.category) &&
        requiredDiets.every((tag) => dish.tags.includes(tag)) &&
        terms.every((term) => text.includes(term))
    )
    .map(({ dish }) => dish);
}

function clearAll() {
  state.query = "";
  state.category = "all";
  state.diets.clear();
  els.search.value = "";
  render();
  els.search.focus();
}

/* ---------- Rendering ---------- */

function dietBadges(dish) {
  const hasVegan = dish.tags.includes("vegan");
  return dietary.filter(
    (d) => dish.tags.includes(d.id) && !(d.id === "vegetarian" && hasVegan)
  );
}

function buildItem(dish) {
  const hasMedia = Boolean(dish.image);
  const li = createEl("li", {
    className: hasMedia ? "menu-item menu-item--media" : "menu-item",
    attrs: { id: dish.id, tabindex: "-1", "data-dish-id": dish.id },
  });

  if (hasMedia) {
    const figure = createEl("figure", { className: "menu-item__media" });
    figure.append(
      createEl("img", {
        attrs: {
          src: dish.image,
          alt: "",
          width: 240,
          height: 300,
          loading: "lazy",
          decoding: "async",
        },
      })
    );
    li.append(figure);
  }

  /* Body */
  const body = createEl("div", { className: "menu-item__body" });
  const title = createEl("div", { className: "menu-item__title" });
  title.append(createEl("h3", { className: "menu-item__name", text: dish.name }));
  if (dish.signature) {
    title.append(
      createEl("span", { className: "badge badge--accent", text: "Signature" })
    );
  }
  body.append(title, createEl("p", { className: "menu-item__desc", text: dish.description }));

  const badges = dietBadges(dish);
  if (badges.length) {
    const list = createEl("ul", {
      className: "diet-tags",
      attrs: { role: "list", "aria-label": "Dietary information" },
    });
    badges.forEach((d) => {
      const item = createEl("li", { className: "diet-tag" });
      item.append(
        createEl("span", { text: d.short, attrs: { "aria-hidden": "true" } }),
        createEl("span", { className: "visually-hidden", text: d.label })
      );
      list.append(item);
    });
    body.append(list);
  }
  li.append(body);

  /* Price + cart controls */
  const buy = createEl("div", { className: "menu-item__buy" });
  buy.append(
    createEl("span", {
      className: "menu-item__price",
      text: formatCurrency(dish.priceCents),
    })
  );

  const action = createEl("div", { className: "menu-item__action" });

  const add = createEl("button", {
    className: "btn btn--secondary btn--sm",
    attrs: { type: "button", "data-action": "add" },
  });
  add.append(
    "Add",
    createEl("span", { className: "visually-hidden", text: ` ${dish.name} to cart` })
  );

  const qty = createEl("div", {
    className: "qty",
    attrs: {
      role: "group",
      "aria-label": `Quantity of ${dish.name} in cart`,
      hidden: "",
    },
  });
  qty.append(
    createEl("button", {
      className: "qty__btn",
      text: "−",
      attrs: {
        type: "button",
        "data-action": "decrease",
        "aria-label": `Decrease quantity of ${dish.name}`,
      },
    }),
    createEl("output", {
      className: "qty__value",
      text: "0",
      attrs: { "aria-live": "polite" },
    }),
    createEl("button", {
      className: "qty__btn",
      text: "+",
      attrs: {
        type: "button",
        "data-action": "increase",
        "aria-label": `Increase quantity of ${dish.name}`,
      },
    })
  );

  action.append(add, qty);
  buy.append(action);
  li.append(buy);
  return li;
}

function buildGroup(category, items) {
  const headingId = `group-${category.id}`;
  const section = createEl("section", {
    className: "menu-group",
    attrs: { "aria-labelledby": headingId },
  });

  const head = createEl("div", { className: "menu-group__head" });
  head.append(
    createEl("h2", {
      className: "menu-group__title",
      text: category.label,
      attrs: { id: headingId },
    })
  );
  if (category.note) {
    head.append(createEl("p", { className: "text-muted", text: category.note }));
  }

  const list = createEl("ul", { className: "menu-items", attrs: { role: "list" } });
  items.forEach((dish) => list.append(buildItem(dish)));

  section.append(head, list);
  return section;
}

function buildEmpty() {
  const wrap = createEl("div", { className: "empty-state" });
  wrap.append(
    createEl("h2", { className: "empty-state__title", text: "No dishes found." }),
    createEl("p", {
      className: "empty-state__text",
      text: "Try a different search term, or remove a filter to see more of the menu.",
    }),
    createEl("button", {
      className: "btn btn--secondary",
      text: "Clear filters",
      attrs: { type: "button", "data-action": "clear" },
    })
  );
  return wrap;
}

function countMessage(shown) {
  if (shown === 0) return "No dishes match";
  if (!hasActiveFilters() && shown === dishes.length) {
    return `${shown} ${pluralize(shown, "dish", "dishes")}`;
  }
  return `Showing ${shown} of ${dishes.length} ${pluralize(dishes.length, "dish", "dishes")}`;
}

function render() {
  if (!ready) return;

  const matches = filterDishes();
  els.results.removeAttribute("aria-busy");

  if (!matches.length) {
    els.results.replaceChildren(buildEmpty());
  } else {
    const groups = categories
      .map((category) => ({
        category,
        items: matches.filter((d) => d.category === category.id),
      }))
      .filter((group) => group.items.length)
      .map((group) => buildGroup(group.category, group.items));
    els.results.replaceChildren(...groups);
  }

  els.count.textContent = countMessage(matches.length);
  syncFilterUI();
  syncBuyControls();
}

/* ---------- Cart synchronisation ---------- */

function syncBuyControls(items = getItems()) {
  const quantities = new Map(items.map((item) => [item.id, item.qty]));

  $$("[data-dish-id]", els.results).forEach((li) => {
    const qty = quantities.get(li.dataset.dishId) ?? 0;
    const add = $('[data-action="add"]', li);
    const group = $(".qty", li);
    if (!add || !group) return;

    add.hidden = qty > 0;
    group.hidden = qty === 0;

    if (qty > 0) {
      $(".qty__value", group).textContent = String(qty);
      setDisabled($('[data-action="increase"]', group), qty >= MAX_QTY);
    }
  });
}

function currentQty(id) {
  return getItems().find((item) => item.id === id)?.qty ?? 0;
}

function onResultsClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "retry") {
    loadMenu({ retry: true });
    return;
  }
  if (action === "clear") {
    clearAll();
    return;
  }
  if (button.getAttribute("aria-disabled") === "true") return;

  const li = button.closest("[data-dish-id]");
  const dish = li && dishById.get(li.dataset.dishId);
  if (!dish) return;

  const qty = currentQty(dish.id);

  if (action === "add") {
    const line = addItem(
      {
        id: dish.id,
        name: dish.name,
        priceCents: dish.priceCents,
        image: dish.image,
      },
      1
    );
    if (!line) {
      showToast("Sorry, that dish couldn’t be added.", { type: "error" });
      return;
    }
    showToast(`${dish.name} added to your cart (demo).`, { type: "success" });
    $('[data-action="increase"]', li)?.focus();
    return;
  }

  if (action === "increase") {
    if (qty >= MAX_QTY) {
      showToast(`You can order up to ${MAX_QTY} of each dish.`);
      return;
    }
    setQuantity(dish.id, qty + 1);
    return;
  }

  if (action === "decrease") {
    setQuantity(dish.id, qty - 1);
    if (qty - 1 <= 0) {
      showToast(`${dish.name} removed from your cart.`);
      $('[data-action="add"]', li)?.focus();
    }
  }
}

/* ---------- Deep links (menu.html#dish-id) ---------- */

function focusFromHash() {
  let id = "";
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  if (!id || !dishById.has(id)) return;

  const find = () => $(`[data-dish-id="${CSS.escape(id)}"]`, els.results);
  let target = find();

  if (!target) {
    // The dish is hidden by the current filters: reset them first.
    state.query = "";
    state.category = "all";
    state.diets.clear();
    els.search.value = "";
    render();
    target = find();
  }
  if (!target) return;

  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "center",
  });
  target.focus({ preventScroll: true });
  target.classList.add("is-targeted");
  setTimeout(() => target.classList.remove("is-targeted"), 2600);
}

/* ---------- Events ---------- */

function onImageError(event) {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  const li = img.closest(".menu-item");
  img.closest(".menu-item__media")?.remove();
  li?.classList.remove("menu-item--media");
}

function bindEvents() {
  els.form.addEventListener("submit", (event) => event.preventDefault());

  els.search.addEventListener(
    "input",
    debounce(() => {
      state.query = els.search.value;
      render();
    }, 150)
  );

  els.categoryChips.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-value]");
    if (!chip) return;
    state.category = chip.dataset.value;
    render();
  });

  els.dietChips.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-value]");
    if (!chip) return;
    const id = chip.dataset.value;
    if (state.diets.has(id)) state.diets.delete(id);
    else state.diets.add(id);
    render();
  });

  els.clear.addEventListener("click", clearAll);
  els.results.addEventListener("click", onResultsClick);
  // Image "error" events don't bubble, so listen in the capture phase.
  els.results.addEventListener("error", onImageError, true);

  window.addEventListener("hashchange", () => {
    if (ready) focusFromHash();
  });

  // Fires for changes on this page, in other tabs, and after bfcache restores.
  subscribe(({ items }) => syncBuyControls(items));
}

/* ---------- Boot ---------- */

if (els.form && els.search && els.categoryChips && els.dietChips && els.count && els.clear && els.results) {
  bindEvents();
  loadMenu();
}
