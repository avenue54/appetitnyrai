if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
  history.scrollRestoration = 'manual';
  window.addEventListener('pageshow', () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    history.scrollRestoration = 'auto';
  }, { once: true });
}

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#primary-nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.setAttribute('aria-label', expanded ? 'Открыть меню' : 'Закрыть меню');
    nav.classList.toggle('is-open', !expanded);
  });

  nav.addEventListener('click', event => {
    if (event.target.closest('a')) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Открыть меню');
      nav.classList.remove('is-open');
    }
  });
}

const menuTabs = [...document.querySelectorAll('.menu-tab')];
const menuCards = [...document.querySelectorAll('.menu-item')];
const menuGroupHeadings = document.querySelectorAll('.menu-group-heading');
const menuSearch = document.querySelector('#menu-search');
let activeCategory = 'all';
const normalizeSearch = value => value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim();
function filterMenu() {
  const words = normalizeSearch(menuSearch.value).split(/\s+/).filter(Boolean);
  let count = 0;
  const visibleGroups = new Set();
  for (const card of menuCards) {
    const text = normalizeSearch(card.querySelector('.menu-item-copy').textContent);
    card.hidden = !(activeCategory === 'all' || card.dataset.category === activeCategory)
      || !words.every(word => text.includes(word));
    if (!card.hidden) {
      count++;
      visibleGroups.add(card.dataset.menuGroup);
    }
  }
  for (const heading of menuGroupHeadings) {
    heading.hidden = !visibleGroups.has(heading.dataset.menuGroup);
  }
  document.querySelector('#menu-results').textContent = `Найдено позиций: ${count}`;
  document.querySelector('#menu-empty').hidden = count > 0;
}
menuTabs.forEach(button => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    menuTabs.forEach(tab => {
      tab.classList.toggle('is-active', tab === button);
      tab.setAttribute('aria-pressed', String(tab === button));
    });
    filterMenu();
  });
});
document.querySelectorAll('.hero-menu a').forEach(link => {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    menuSearch.value = '';
    menuTabs.find(tab => tab.dataset.filter === link.dataset.menuFilter).click();
  });
});
menuSearch.addEventListener('input', filterMenu);
filterMenu();

const dishDialog = document.querySelector('#dish-dialog');
const dishSize = document.querySelector('#dish-size');
const dishAddButton = document.querySelector('#dish-add-to-cart');
const directAddButtons = document.querySelectorAll('.cart-add:not(.size-choice)');

function updateDishSelection() {
  const id = dishDialog.dataset.dishId + dishSize.value;
  dishDialog.querySelector('.dish-dialog-price').textContent = rubles.format(dishes.get(id).price);
  updateAddButton(dishAddButton, id);
  document.querySelector('#dish-cart-status').textContent = '';
}

dishSize.addEventListener('change', updateDishSelection);

document.querySelectorAll('.menu-item-open, .size-choice').forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('.menu-item');
    const title = card.querySelector('h4').textContent;
    const photo = dishDialog.querySelector('.dish-dialog-photo');
    dishDialog.querySelector('#dish-dialog-title').textContent = title;
    dishDialog.querySelector('#dish-dialog-description').textContent = card.querySelector('p').textContent;
    photo.style.backgroundPosition = card.querySelector('.menu-photo').style.backgroundPosition;
    photo.style.backgroundImage = card.querySelector('.menu-photo').style.backgroundImage;
    photo.setAttribute('aria-label', title);
    dishDialog.dataset.dishId = card.dataset.dishId;
    dishSize.closest('label').hidden = !card.hasAttribute('data-large-price');
    dishSize.value = '';
    updateDishSelection();
    dishDialog.showModal();
  });
});

dishDialog.addEventListener('click', event => {
  if (event.target === dishDialog) dishDialog.close();
});

const cart = new Map();
const dishes = new Map();
for (const card of menuCards) {
  const { dishId, price, largePrice } = card.dataset;
  if (price === undefined) continue;
  const title = card.querySelector('h4').textContent;
  const photo = card.querySelector('.menu-photo');
  const dish = {
    title: largePrice ? `${title} (средняя)` : title,
    price: Number(price),
    photoPosition: photo.style.backgroundPosition,
    photoImage: photo.style.backgroundImage
  };
  dishes.set(dishId, dish);
  if (largePrice) {
    dishes.set(`${dishId}-large`, { ...dish, title: `${title} (большая)`, price: Number(largePrice) });
  }
}
const cartDialog = document.querySelector('#cart-dialog');
const cartList = document.querySelector('#cart-list');
const cartToggle = document.querySelector('#cart-toggle');
const cartStatus = document.querySelector('#cart-status');
const cartClose = document.querySelector('#cart-close');
const rubles = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

function updateAddButton(button, id) {
  const quantity = cart.get(id) || 0;
  button.textContent = quantity ? `В корзине: ${quantity} шт.` : 'В корзину';
  button.setAttribute('aria-label', quantity
    ? `Добавить ещё: ${dishes.get(id).title}. В корзине ${quantity} шт.`
    : `В корзину: ${dishes.get(id).title}`);
}

function renderCart() {
  const focused = document.activeElement;
  const focusedId = focused.dataset.dishId;
  const focusedAction = focused.dataset.cartAction;
  let count = 0;
  let total = 0;
  const rows = [];
  for (const [id, quantity] of cart) {
    const dish = dishes.get(id);
    count += quantity;
    total += dish.price * quantity;
    const row = document.querySelector('#cart-row-template').content.firstElementChild.cloneNode(true);
    row.querySelector('.cart-item-title').textContent = dish.title;
    row.querySelector('.cart-item-photo').style.backgroundPosition = dish.photoPosition;
    row.querySelector('.cart-item-photo').style.backgroundImage = dish.photoImage;
    row.querySelector('.cart-item-price').textContent = `${rubles.format(dish.price)} за шт. · ${rubles.format(dish.price * quantity)}`;
    row.querySelector('.cart-quantity').textContent = quantity;
    const labels = { minus: 'Уменьшить количество', plus: 'Увеличить количество', remove: 'Удалить' };
    row.querySelectorAll('button').forEach(button => {
      button.dataset.dishId = id;
      button.setAttribute('aria-label', `${labels[button.dataset.cartAction]}: ${dish.title}`);
    });
    rows.push(row);
  }
  cartList.replaceChildren(...rows);
  document.querySelector('#cart-empty').hidden = cart.size > 0;
  document.querySelector('#cart-summary').hidden = cart.size === 0;
  document.querySelector('#cart-checkout').hidden = cart.size === 0;
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-total').textContent = rubles.format(total);
  document.querySelector('#cart-button-total').textContent = rubles.format(total);
  cartToggle.setAttribute('aria-label', `Открыть корзину: ${count} шт., ${rubles.format(total)}`);
  directAddButtons.forEach(button => updateAddButton(button, button.closest('.menu-item').dataset.dishId));
  if (dishDialog.dataset.dishId) updateAddButton(dishAddButton, dishDialog.dataset.dishId + dishSize.value);
  if (focusedAction) {
    const replacement = Array.from(cartList.querySelectorAll('button')).find(button => button.dataset.dishId === focusedId && button.dataset.cartAction === focusedAction);
    (replacement || cartList.querySelector('button') || cartClose).focus();
  }
}

function addToCart(id) {
  cart.set(id, (cart.get(id) || 0) + 1);
  renderCart();
  cartStatus.textContent = `${dishes.get(id).title}: добавлено в корзину`;
}

directAddButtons.forEach(button => {
  button.addEventListener('click', () => addToCart(button.closest('.menu-item').dataset.dishId));
});
dishAddButton.addEventListener('click', () => {
  addToCart(dishDialog.dataset.dishId + dishSize.value);
  document.querySelector('#dish-cart-status').textContent = 'Добавлено в корзину';
});
cartToggle.addEventListener('click', () => cartDialog.showModal());
cartDialog.addEventListener('click', event => {
  if (event.target === cartDialog) cartDialog.close();
});
cartList.addEventListener('click', event => {
  const button = event.target.closest('button[data-cart-action]');
  if (!button) return;
  const id = button.dataset.dishId;
  const action = button.dataset.cartAction;
  const quantity = cart.get(id);
  if (action === 'remove' || (action === 'minus' && quantity === 1)) {
    cart.delete(id);
  } else {
    cart.set(id, quantity + (action === 'plus' ? 1 : -1));
  }
  renderCart();
  cartStatus.textContent = 'Корзина обновлена';
});
renderCart();
