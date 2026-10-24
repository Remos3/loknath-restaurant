/**
 * Lokenath Restaurant & Hotel — menu-data.js
 * Single source of truth for dishes. Prices are in rupees in this file and are
 * converted to integer paise (priceCents) so the cart never does float maths.
 *
 * Source: the restaurant's printed menu (two pages). Spellings follow the
 * printed menu (Chat, Chawmein, Biriyani, Pokora, Torka...).
 *
 * Items printed with "Full / Half" prices are listed as two separate dishes,
 * e.g. "Mutton Biriyani (Full)" and "Mutton Biriyani (Half)", so each can be
 * added to the cart on its own.
 *
 * Tags are only set where the dish name makes it clear. Untagged dishes are
 * unspecified (ask the restaurant). Please confirm tags with the owner.
 */

export const CATEGORIES = Object.freeze([
  { id: "biriyani", label: "Biriyani", note: "Full and half plates." },
  { id: "fried-rice", label: "Fried Rice", note: "" },
  { id: "pulao", label: "Pulao", note: "" },
  { id: "thali", label: "Rice Meals (থালী)", note: "ভাত থালী · Rice meals with curry." },
  { id: "kosha", label: "Kosha & Curries", note: "" },
  { id: "roti-paratha", label: "Roti & Paratha", note: "Roti, Torka and Paratha." },
  { id: "chawmein", label: "Chawmein", note: "Full and half plates." },
  { id: "momo", label: "Momo", note: "" },
  { id: "rolls", label: "Rolls", note: "" },
  { id: "burger", label: "Burger", note: "" },
  { id: "snacks", label: "Snacks", note: "" },
  { id: "chat", label: "Chat", note: "" },
  { id: "soup", label: "Soup", note: "" },
  { id: "drinks", label: "Coffee & Drinks", note: "" },
]);

export const DIETARY = Object.freeze([
  { id: "vegetarian", label: "Vegetarian", short: "V" },
  { id: "non-veg", label: "Non-vegetarian", short: "NV" },
]);

const V = ["vegetarian"];
const NV = ["non-veg"];

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const list = [];

/** One price. */
function add(category, name, rupees, tags = [], description = "") {
  list.push({
    id: slugify(name),
    name,
    description,
    priceCents: rupees * 100,
    category,
    tags,
    image: "",
  });
}

/** Full and Half prices become two dishes. */
function addFullHalf(category, name, full, half, tags = []) {
  add(category, `${name} (Full)`, full, tags, "Full plate");
  add(category, `${name} (Half)`, half, tags, "Half plate");
}

/* ---------- Biriyani ---------- */
addFullHalf("biriyani", "Mutton Biriyani", 280, 150, NV);
addFullHalf("biriyani", "Chicken Biriyani", 180, 100, NV);
addFullHalf("biriyani", "Paneer Biriyani", 180, 100, V);
addFullHalf("biriyani", "Egg Biriyani", 150, 80, NV);

/* ---------- Fried Rice ---------- */
addFullHalf("fried-rice", "Chicken Fried Rice", 150, 80, NV);
addFullHalf("fried-rice", "Paneer Fried Rice", 150, 80, V);
addFullHalf("fried-rice", "Egg Fried Rice", 120, 70, NV);
add("fried-rice", "Mixed Fried Rice", 180);
add("fried-rice", "Veg Fried Rice", 100, V);
add("fried-rice", "Jira Rice", 120, V);
add("fried-rice", "Plain Schezwan Rice", 120, V);
add("fried-rice", "Chicken Schezwan Rice", 150, NV);

/* ---------- Pulao ---------- */
add("pulao", "Pulao", 20, V);
add("pulao", "Chicken Pulao", 60, NV);
add("pulao", "Egg Pulao", 30, NV);
add("pulao", "Paneer Pulao", 70, V);

/* ---------- Rice meals (থালী) ---------- */
add("thali", "Mutton Thali", 220, NV, "মটন থালী");
add("thali", "Chicken Thali", 140, NV, "চিকেন থালী");
add("thali", "Chicken Masala Thali", 180, NV, "চিকেন মসালা থালী");
add("thali", "Boal Fish Thali", 150, NV, "বোয়াল মাছ থালী");
add("thali", "Baus Fish Thali", 120, NV, "বাউস মাছ থালী");
add("thali", "Pona Fish Thali", 110, NV, "পনা মাছ থালী");
add("thali", "Small Fish Thali", 130, NV, "ছোট মাছ থালী");
add("thali", "Rui Fish Thali", 100, NV, "রুই মাছ থালী");
add("thali", "Egg Curry Thali", 90, NV, "এগ কারী থালী");
add("thali", "Niramish Thali", 70, V, "নিরামিষ থালী · Vegetarian meal");

/* ---------- Kosha & curries ---------- */
add("kosha", "Chicken Kosha", 140, NV);
add("kosha", "Chicken Fry", 140, NV);
add("kosha", "Chilli Chicken", 140, NV);
add("kosha", "Karai Chicken", 150, NV);
add("kosha", "Chicken Butter Masala", 150, NV);
add("kosha", "Paneer Butter Masala", 140, V);
add("kosha", "Chilli Paneer", 150, V);
add("kosha", "Karai Paneer", 150, V);

/* ---------- Roti, Torka & Paratha ---------- */
add("roti-paratha", "Plain Roti", 10, V);
add("roti-paratha", "Butter Roti", 15, V);
add("roti-paratha", "Dal Torka", 60, V);
add("roti-paratha", "Plain Paratha", 30, V);
add("roti-paratha", "Laccha Paratha", 40, V);
add("roti-paratha", "Egg Paratha", 40, NV);
add("roti-paratha", "Alu Paratha", 40, V);
add("roti-paratha", "Special Paratha", 70);
add("roti-paratha", "Chicken Paratha", 70, NV);
add("roti-paratha", "Chicken Muglai Paratha", 90, NV);
add("roti-paratha", "Egg Muglai Paratha", 80, NV);

/* ---------- Chawmein ---------- */
addFullHalf("chawmein", "Chicken Chawmein", 100, 60, NV);
addFullHalf("chawmein", "Paneer Chawmein", 100, 60, V);
addFullHalf("chawmein", "Egg Chawmein", 80, 50, NV);
addFullHalf("chawmein", "Veg Chawmein", 60, 30, V);

/* ---------- Momo ---------- */
addFullHalf("momo", "Chicken Steam Momo", 60, 30, NV);
addFullHalf("momo", "Chicken Fry Momo", 80, 50, NV);
add("momo", "Chicken Pan Fried Momo", 100, NV);
add("momo", "Veg Momo", 40, V);
addFullHalf("momo", "Veg Fry Momo", 60, 30, V);
add("momo", "Veg Pan Fried Momo", 80, V);
add("momo", "Chicken Butter Toasted Momo", 100, NV);
add("momo", "Veg Butter Toasted Momo", 80, V);

/* ---------- Rolls ---------- */
add("rolls", "Chicken Roll", 70, NV);
add("rolls", "Chicken Egg Roll", 80, NV);
add("rolls", "Paneer Roll", 80, V);
add("rolls", "Egg Roll", 30, NV);

/* ---------- Burger ---------- */
add("burger", "Chicken Burger", 100, NV);
add("burger", "Veg Burger", 80, V);

/* ---------- Snacks ---------- */
addFullHalf("snacks", "Chicken Pokora", 120, 60, NV);
add("snacks", "Chicken Lolipop", 150, NV);
add("snacks", "Chilli Chicken Dry", 150, NV);
add("snacks", "Paneer Pokora", 100, V);
add("snacks", "Egg Pokora", 80, NV);
add("snacks", "Egg Paw Bhaji", 50, NV);
add("snacks", "Chicken Leg Piece", 70, NV);
add("snacks", "Liver Fry", 120, NV);
add("snacks", "French Fried", 50, V);

/* ---------- Chat ---------- */
add("chat", "Plain Chat", 40, V);
add("chat", "Egg Chat", 50, NV);
add("chat", "Chicken Chat", 80, NV);
add("chat", "Mixed Chat", 100);
add("chat", "Paneer Chat", 80, V);

/* ---------- Soup ---------- */
add("soup", "Chicken Hot Sour Soup", 70, NV);
add("soup", "Chicken Manchow Soup", 80, NV);
add("soup", "Chicken Sweet Corn Soup", 70, NV);

/* ---------- Coffee & drinks ---------- */
add("drinks", "Hot Coffee", 30, V);
add("drinks", "Cold Coffee", 70, V);
add("drinks", "Lassi", 60, V);
add("drinks", "Kiikat Shake", 100, V);
add("drinks", "Masala Coke", 80, V);
add("drinks", "Chocolate Shake", 100, V);

export const DISHES = Object.freeze(list);

export function getDishById(id) {
  return DISHES.find((dish) => dish.id === id) ?? null;
}
