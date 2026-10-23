/**
 * Oriel — menu-data.js
 * Single source of truth for dishes. All prices are integer cents.
 *
 * IDs and prices for the six dishes shown on the homepage must stay in sync
 * with index.html: grilled-oysters, burnt-honey-beets, hearth-roasted-duck,
 * cedar-smoked-halibut, smoked-vanilla-cheesecake, dry-aged-ribeye.
 *
 * Fields:
 *   id           lowercase letters, digits and hyphens (also the #anchor on menu.html)
 *   category     one of the CATEGORIES ids
 *   tags         subset of DIETARY ids (vegan dishes are tagged vegan AND vegetarian)
 *   image        optional path; dishes without one render as text-only rows
 *   signature    optional; shows a "Signature" badge
 */

export const CATEGORIES = Object.freeze([
  { id: "starters", label: "Starters", note: "To begin, and to share." },
  { id: "mains", label: "From the Fire", note: "Cooked over oak and fruitwood." },
  { id: "sides", label: "Sides", note: "Made for the middle of the table." },
  { id: "desserts", label: "Desserts", note: "Finished at the hearth." },
  {
    id: "drinks",
    label: "Drinks",
    note: "All alcohol-free. Wine and cocktails are served in the restaurant only.",
  },
]);

export const DIETARY = Object.freeze([
  { id: "vegetarian", label: "Vegetarian", short: "V" },
  { id: "vegan", label: "Vegan", short: "VG" },
  { id: "gluten-free", label: "Gluten-free", short: "GF" },
]);

export const DISHES = Object.freeze([
  /* ---------- Starters ---------- */
  {
    id: "grilled-oysters",
    name: "Grilled Oysters",
    description: "Calabrian chili butter, charred lemon, breadcrumb.",
    priceCents: 2200,
    category: "starters",
    tags: [],
    image: "assets/img/menu/oysters.webp",
  },
  {
    id: "burnt-honey-beets",
    name: "Burnt Honey Beets",
    description: "Whipped goat cheese, hazelnut, pickled shallot.",
    priceCents: 1600,
    category: "starters",
    tags: ["vegetarian", "gluten-free"],
    image: "assets/img/menu/beets.webp",
  },
  {
    id: "charred-leeks",
    name: "Charred Leeks",
    description: "Roasted pepper romesco, toasted almond, sherry vinegar.",
    priceCents: 1400,
    category: "starters",
    tags: ["vegan", "vegetarian", "gluten-free"],
    image: "",
  },
  {
    id: "wood-fired-flatbread",
    name: "Wood-Fired Flatbread",
    description: "Blistered dough, whipped ricotta, wildflower honey, thyme.",
    priceCents: 1500,
    category: "starters",
    tags: ["vegetarian"],
    image: "",
  },
  {
    id: "beef-tartare",
    name: "Beef Tartare",
    description: "Hand-cut beef, smoked egg yolk, capers, rye crisp.",
    priceCents: 2000,
    category: "starters",
    tags: [],
    image: "",
  },
  {
    id: "delicata-squash-soup",
    name: "Delicata Squash Soup",
    description: "Brown butter, pepitas, sage, crème fraîche.",
    priceCents: 1300,
    category: "starters",
    tags: ["vegetarian", "gluten-free"],
    image: "",
  },

  /* ---------- From the fire ---------- */
  {
    id: "hearth-roasted-duck",
    name: "Hearth-Roasted Duck",
    description: "Cherry, fennel, burnt orange jus.",
    priceCents: 4200,
    category: "mains",
    tags: ["gluten-free"],
    image: "assets/img/menu/duck.webp",
    signature: true,
  },
  {
    id: "cedar-smoked-halibut",
    name: "Cedar-Smoked Halibut",
    description: "Brown butter, charred lemon, sea beans.",
    priceCents: 3800,
    category: "mains",
    tags: ["gluten-free"],
    image: "assets/img/menu/halibut.webp",
    signature: true,
  },
  {
    id: "dry-aged-ribeye",
    name: "Dry-Aged Ribeye",
    description: "Bone marrow jus, smoked shallot.",
    priceCents: 6800,
    category: "mains",
    tags: ["gluten-free"],
    image: "assets/img/menu/ribeye.webp",
    signature: true,
  },
  {
    id: "whole-roasted-cauliflower",
    name: "Whole Roasted Cauliflower",
    description: "Harissa, almond tahini, pomegranate, herbs.",
    priceCents: 2800,
    category: "mains",
    tags: ["vegan", "vegetarian", "gluten-free"],
    image: "",
  },
  {
    id: "wood-oven-lamb-shoulder",
    name: "Wood-Oven Lamb Shoulder",
    description: "Slow-roasted, white beans, salsa verde, preserved lemon.",
    priceCents: 4600,
    category: "mains",
    tags: ["gluten-free"],
    image: "",
  },
  {
    id: "hearth-chicken",
    name: "Hearth Chicken",
    description: "Brined half chicken, charred lemon, garlic jus.",
    priceCents: 3400,
    category: "mains",
    tags: ["gluten-free"],
    image: "",
  },
  {
    id: "roasted-maitake-polenta",
    name: "Roasted Maitake & Polenta",
    description: "Creamy stone-ground polenta, thyme, aged cheddar.",
    priceCents: 2600,
    category: "mains",
    tags: ["vegetarian", "gluten-free"],
    image: "",
  },

  /* ---------- Sides ---------- */
  {
    id: "ember-potatoes",
    name: "Ember Potatoes",
    description: "Crushed fingerlings, rosemary, flaky salt, aioli.",
    priceCents: 1000,
    category: "sides",
    tags: ["vegetarian", "gluten-free"],
    image: "",
  },
  {
    id: "bitter-greens",
    name: "Bitter Greens",
    description: "Garlic, chili, lemon, toasted breadcrumb.",
    priceCents: 1100,
    category: "sides",
    tags: ["vegan", "vegetarian"],
    image: "",
  },
  {
    id: "charred-broccolini",
    name: "Charred Broccolini",
    description: "Garlic, lemon, chili flake, olive oil.",
    priceCents: 1200,
    category: "sides",
    tags: ["vegan", "vegetarian", "gluten-free"],
    image: "",
  },

  /* ---------- Desserts ---------- */
  {
    id: "smoked-vanilla-cheesecake",
    name: "Smoked Vanilla Cheesecake",
    description: "Burnt Basque style, roasted plums, oat crumble.",
    priceCents: 1400,
    category: "desserts",
    tags: ["vegetarian"],
    image: "assets/img/menu/cheesecake.webp",
  },
  {
    id: "ash-baked-chocolate-torte",
    name: "Ash-Baked Chocolate Torte",
    description: "Flourless chocolate, sea salt, crème fraîche.",
    priceCents: 1400,
    category: "desserts",
    tags: ["vegetarian", "gluten-free"],
    image: "",
  },
  {
    id: "roasted-pear",
    name: "Roasted Pear",
    description: "Honey, vanilla bean, toasted oats, whipped cream.",
    priceCents: 1300,
    category: "desserts",
    tags: ["vegetarian"],
    image: "",
  },

  /* ---------- Drinks ---------- */
  {
    id: "smoked-grapefruit-spritz",
    name: "Smoked Grapefruit Spritz",
    description: "Charred grapefruit, rosemary, sparkling water.",
    priceCents: 900,
    category: "drinks",
    tags: ["vegan", "vegetarian", "gluten-free"],
    image: "",
  },
  {
    id: "house-ginger-soda",
    name: "House Ginger Soda",
    description: "Fresh ginger, lemon, cane sugar, soda.",
    priceCents: 700,
    category: "drinks",
    tags: ["vegan", "vegetarian", "gluten-free"],
    image: "",
  },
  {
    id: "warm-spiced-cider",
    name: "Warm Spiced Cider",
    description: "Pressed apple, cinnamon, clove, orange peel.",
    priceCents: 800,
    category: "drinks",
    tags: ["vegan", "vegetarian", "gluten-free"],
    image: "",
  },
]);

export function getDishById(id) {
  return DISHES.find((dish) => dish.id === id) ?? null;
}
