// Supabase Configuration
const SUPABASE_URL = "https://amsshjptvzzoskcjqqbe.supabase.co";
const SUPABASE_KEY = "sb_publishable_sJ_BAPbnHi_zyEiOr6YA0g_BHE_weNx";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allMenuItems = [];
let cart = {}; // key: "itemId_variant" => { id, name, variant, price, qty }
let activeCategory = 'All';

// App Initialization
async function init() {
  await fetchCategories();
  await fetchMenuItems();
}

// Fetch categories from DB
async function fetchCategories() {
  const { data } = await db.from('categories').select('*').order('sort_order', { ascending: true });
  if (data) {
    const nav = document.getElementById('categoryNav');
    data.forEach(c => {
      const btn = document.createElement('button');
      btn.className = "cat-btn bg-gray-100 text-gray-600 hover:bg-gray-200 px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors";
      btn.textContent = c.name;
      btn.onclick = () => filterCategory(c.name);
      nav.appendChild(btn);
    });
  }
}

// Fetch available menu items
async function fetchMenuItems() {
  const { data, error } = await db.from('menu_items')
    .select('*')
    .eq('is_available', true);

  if (error) {
    document.getElementById('menuContainer').innerHTML = `<p class="text-center text-red-500 text-sm py-8">Failed to load menu: ${error.message}</p>`;
    return;
  }

  // Categories map load karna
  const { data: cats } = await db.from('categories').select('*');
  const catMap = {};
  if (cats) {
    cats.forEach(c => catMap[c.id] = c.name);
  }

  allMenuItems = data.map(item => ({
    ...item,
    category_name: catMap[item.category_id] || ''
  }));

  renderMenu(allMenuItems);
}

// Render menu cards
function renderMenu(items) {
  const container = document.getElementById('menuContainer');
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-400 py-10 text-sm">No items found.</p>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3";

    const vegIcon = item.is_veg
      ? `<span class="inline-flex items-center justify-center w-3.5 h-3.5 border border-green-600 rounded-sm p-[1px]"><span class="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span>`
      : `<span class="inline-flex items-center justify-center w-3.5 h-3.5 border border-red-600 rounded-sm p-[1px]"><span class="w-1.5 h-1.5 bg-red-600 rounded-full"></span></span>`;

    let actionUI = '';

    if (item.has_variants) {
      actionUI = `
        <div class="flex flex-col gap-1.5 items-end">
          <div class="flex items-center gap-1">
            <span class="text-[11px] text-gray-500 font-semibold">Half ₹${item.price_half}</span>
            ${getCartButton(item, 'Half', item.price_half)}
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[11px] text-gray-500 font-semibold">Full ₹${item.price_full}</span>
            ${getCartButton(item, 'Full', item.price_full)}
          </div>
        </div>
      `;
    } else {
      actionUI = `
        <div class="flex flex-col items-end">
          <span class="text-sm font-black text-gray-900 mb-1">₹${item.price_single}</span>
          ${getCartButton(item, 'Regular', item.price_single)}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-1.5 mb-0.5">
          ${vegIcon}
          <span class="text-xs text-amber-700 font-semibold uppercase">${item.category_name}</span>
        </div>
        <h3 class="font-bold text-sm text-gray-800 leading-snug">${item.name}</h3>
      </div>
      <div>${actionUI}</div>
    `;
    container.appendChild(card);
  });
}

// Generate Add / Qty buttons
function getCartButton(item, variant, price) {
  const key = `${item.id}_${variant}`;
  const qty = cart[key] ? cart[key].qty : 0;

  if (qty > 0) {
    return `
      <div class="inline-flex items-center bg-red-50 border border-red-200 rounded-lg overflow-hidden">
        <button onclick="updateQty('${key}', -1)" class="w-6 h-6 text-red-600 font-bold active:bg-red-100 flex items-center justify-center">-</button>
        <span class="w-6 text-center text-xs font-bold text-red-700">${qty}</span>
        <button onclick="updateQty('${key}', 1)" class="w-6 h-6 text-red-600 font-bold active:bg-red-100 flex items-center justify-center">+</button>
      </div>
    `;
  }
  return `
    <button onclick="addToCart('${item.id}', '${encodeURIComponent(item.name)}', '${variant}', ${price})" 
      class="bg-white text-red-600 border border-red-500 active:bg-red-600 active:text-white px-3 py-1 rounded-lg text-xs font-bold uppercase shadow-sm transition">
      ADD
    </button>
  `;
}

// Add item to cart
function addToCart(id, rawName, variant, price) {
  const name = decodeURIComponent(rawName);
  const key = `${id}_${variant}`;
  cart[key] = { id, name, variant, price, qty: 1 };
  updateCartUI();
}

// Update quantity (+ / -)
function updateQty(key, delta) {
  if (cart[key]) {
    cart[key].qty += delta;
    if (cart[key].qty <= 0) delete cart[key];
  }
  updateCartUI();
}

// Update sticky bar and state
function updateCartUI() {
  let count = 0;
  let total = 0;
  for (const k in cart) {
    count += cart[k].qty;
    total += (cart[k].qty * cart[k].price);
  }

  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = total;
  document.getElementById('modalTotal').textContent = total;

  const bar = document.getElementById('cartBar');
  if (count > 0) {
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
    closeCheckoutModal();
  }

  renderMenu(currentFilteredItems());
}

// Category filter
function filterCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    if (btn.textContent === cat) {
      btn.className = "cat-btn active bg-red-600 text-white px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shadow-sm";
    } else {
      btn.className = "cat-btn bg-gray-100 text-gray-600 hover:bg-gray-200 px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors";
    }
  });
  renderMenu(currentFilteredItems());
}

function currentFilteredItems() {
  if (activeCategory === 'All') return allMenuItems;
  return allMenuItems.filter(i => i.category_name === activeCategory);
}

// Modal handling
function openCheckoutModal() {
  const container = document.getElementById('checkoutItems');
  container.innerHTML = '';
  for (const k in cart) {
    const item = cart[k];
    const line = document.createElement('div');
    line.className = "flex justify-between items-center text-xs";
    line.innerHTML = `
      <span>${item.name} ${item.variant !== 'Regular' ? '(' + item.variant + ')' : ''} &times; ${item.qty}</span>
      <span class="font-semibold">₹${item.qty * item.price}</span>
    `;
    container.appendChild(line);
  }
  document.getElementById('checkoutModal').classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

// Submit Order (Supabase DB + WhatsApp)
async function handlePlaceOrder(e) {
  e.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const submitBtn = document.getElementById('submitBtn');

  const itemsArray = Object.values(cart);
  let totalAmount = 0;
  itemsArray.forEach(i => totalAmount += (i.qty * i.price));

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Processing...`;

  const { data, error } = await db.from('orders').insert([{
    customer_name: name,
    customer_phone: phone,
    delivery_address: address,
    items: itemsArray,
    total_amount: totalAmount,
    status: 'pending'
  }]).select();

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i class="fa-brands fa-whatsapp text-lg"></i> Place Order via WhatsApp`;

  if (error) {
    alert("Order submission error: " + error.message);
    return;
  }

  const orderNumber = data[0]?.order_number || 'NEW';

  let waText = `*🔔 NEW ORDER (#${orderNumber})*\n`;
  waText += `*Restaurant:* Lokenath Restaurant & Hotel\n`;
  waText += `--------------------------\n`;
  waText += `*Name:* ${name}\n`;
  waText += `*Phone:* ${phone}\n`;
  waText += `*Address:* ${address}\n`;
  waText += `--------------------------\n*Items:*\n`;
  itemsArray.forEach(i => {
    waText += `• ${i.name} ${i.variant !== 'Regular' ? '(' + i.variant + ')' : ''} x ${i.qty} = ₹${i.qty * i.price}\n`;
  });
  waText += `--------------------------\n`;
  waText += `*Total Amount:* ₹${totalAmount}\n`;
  waText += `*Payment:* Cash on Delivery\n`;

  const encodedUrl = `https://wa.me/919387078054?text=${encodeURIComponent(waText)}`;

  cart = {};
  updateCartUI();
  closeCheckoutModal();
  window.location.href = encodedUrl;
}

// Start
init();
```[span_0](start_span)[span_0](end_span)[span_1](start_span)[span_1](end_span)

Paste karke **Commit changes** kar dijiye. Uske 30 second baad browser me page ko ek baar hard refresh karke dekhein!
