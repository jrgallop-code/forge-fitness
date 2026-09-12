(() => {
  'use strict';

  const restaurants = [
    {
      id: 'boston-pizza',
      name: 'Boston Pizza',
      mark: 'BP',
      note: 'Prototype dataset · 24 items',
      sectionOrder: ['High-protein picks', 'Pizza', 'Bowls & mains', 'Salads', 'Pasta', 'Sides'],
      items: [
        item('bp-1', 'Grilled Chicken Power Bowl', 'High-protein picks', 610, 52, 58, 18, 'Grilled chicken, seasoned rice and vegetables', ['High protein', 'Balanced']),
        item('bp-2', 'Chicken Garden Salad', 'High-protein picks', 470, 44, 25, 22, 'Greens, grilled chicken and a light herb dressing', ['High protein']),
        item('bp-3', 'Steak & Vegetable Plate', 'High-protein picks', 690, 55, 49, 27, 'Sliced steak, vegetables and roasted potatoes', ['High protein']),
        item('bp-4', 'Chicken & Vegetable Thin Crust', 'Pizza', 720, 46, 78, 24, 'Thin crust with chicken and roasted vegetables', ['Popular']),
        item('bp-5', 'Spicy Chicken Personal Pizza', 'Pizza', 840, 48, 91, 31, 'Personal-size pizza with spicy chicken and peppers', ['Popular']),
        item('bp-6', 'Garden Vegetable Personal Pizza', 'Pizza', 680, 27, 86, 24, 'Personal-size pizza with mixed vegetables', ['Vegetarian']),
        item('bp-7', 'Classic Cheese Personal Pizza', 'Pizza', 760, 31, 88, 31, 'Personal-size pizza with tomato sauce and cheese', ['Vegetarian']),
        item('bp-8', 'Grilled Chicken Sandwich', 'Bowls & mains', 680, 48, 59, 28, 'Chicken breast, vegetables and a toasted bun', ['High protein']),
        item('bp-9', 'Chicken Rice Bowl', 'Bowls & mains', 740, 49, 82, 24, 'Seasoned rice, grilled chicken and vegetables', ['Balanced']),
        item('bp-10', 'Classic Beef Burger', 'Bowls & mains', 910, 43, 67, 52, 'Beef patty, cheese, vegetables and a toasted bun', ['Popular']),
        item('bp-11', 'Double Chicken Plate', 'Bowls & mains', 790, 72, 54, 31, 'Two grilled chicken portions with rice and vegetables', ['Highest protein']),
        item('bp-12', 'Mediterranean Chicken Salad', 'Salads', 540, 43, 31, 27, 'Chicken, greens, tomato, cucumber and feta', ['High protein']),
        item('bp-13', 'Steakhouse Salad', 'Salads', 620, 45, 29, 36, 'Sliced steak, greens and roasted vegetables', ['High protein']),
        item('bp-14', 'Garden Side Salad', 'Salads', 160, 6, 18, 8, 'Mixed greens, tomato and cucumber', ['Vegetarian']),
        item('bp-15', 'Chicken Marinara', 'Pasta', 760, 50, 91, 22, 'Chicken breast, pasta and tomato sauce', ['High protein']),
        item('bp-16', 'Shrimp Tomato Pasta', 'Pasta', 710, 39, 94, 19, 'Shrimp, pasta, tomato and herbs', []),
        item('bp-17', 'Creamy Chicken Pasta', 'Pasta', 980, 49, 102, 42, 'Chicken and pasta in a creamy sauce', ['Popular']),
        item('bp-18', 'Tomato Vegetable Pasta', 'Pasta', 650, 24, 104, 15, 'Pasta, vegetables and tomato sauce', ['Vegetarian']),
        item('bp-19', 'Seasoned Chicken Bites', 'Sides', 420, 34, 31, 18, 'Bite-size chicken pieces with seasoning', ['Shareable']),
        item('bp-20', 'Roasted Vegetables', 'Sides', 150, 5, 22, 6, 'A side of mixed roasted vegetables', ['Vegetarian']),
        item('bp-21', 'Seasoned Rice', 'Sides', 240, 5, 47, 4, 'A side of seasoned long-grain rice', ['Vegetarian']),
        item('bp-22', 'Crispy Fries', 'Sides', 430, 6, 56, 21, 'A side of crisp seasoned fries', ['Vegetarian']),
        item('bp-23', 'Garlic Flatbread', 'Sides', 310, 9, 45, 11, 'Warm flatbread with garlic seasoning', ['Vegetarian']),
        item('bp-24', 'Chicken Soup', 'Sides', 190, 16, 20, 5, 'Chicken and vegetables in a savoury broth', []),
      ],
    },
    {
      id: 'swiss-chalet',
      name: 'Swiss Chalet',
      mark: 'SC',
      note: 'Prototype dataset · 12 items',
      sectionOrder: ['High-protein picks', 'Chicken dinners', 'Sandwiches & salads', 'Sides'],
      items: [
        item('sc-1', 'Quarter Chicken Plate', 'High-protein picks', 630, 47, 58, 23, 'Roasted chicken, potato and vegetables', ['High protein']),
        item('sc-2', 'Double Leg Chicken Plate', 'High-protein picks', 820, 70, 59, 34, 'Two chicken legs, potato and vegetables', ['Highest protein']),
        item('sc-3', 'Chicken Breast & Vegetables', 'High-protein picks', 510, 52, 32, 19, 'Roasted chicken breast and mixed vegetables', ['High protein']),
        item('sc-4', 'Quarter Chicken Dinner', 'Chicken dinners', 690, 46, 72, 24, 'Quarter chicken with a classic side', ['Popular']),
        item('sc-5', 'Half Chicken Dinner', 'Chicken dinners', 920, 77, 73, 39, 'Half chicken with a classic side', ['Highest protein']),
        item('sc-6', 'Chicken & Rice Plate', 'Chicken dinners', 710, 50, 81, 21, 'Roasted chicken with seasoned rice', ['Balanced']),
        item('sc-7', 'Chicken Kaiser', 'Sandwiches & salads', 590, 44, 57, 21, 'Chicken breast and vegetables on a toasted bun', ['High protein']),
        item('sc-8', 'Chicken Caesar Salad', 'Sandwiches & salads', 480, 42, 22, 26, 'Chicken, romaine and a creamy dressing', ['High protein']),
        item('sc-9', 'Chicken Garden Salad', 'Sandwiches & salads', 390, 39, 21, 17, 'Chicken breast over mixed greens', ['Light choice']),
        item('sc-10', 'Mixed Vegetables', 'Sides', 120, 5, 20, 3, 'A side of mixed vegetables', ['Vegetarian']),
        item('sc-11', 'Seasoned Fries', 'Sides', 430, 6, 58, 20, 'A side of seasoned fries', ['Vegetarian']),
        item('sc-12', 'Chicken Soup', 'Sides', 180, 14, 19, 5, 'Chicken and vegetables in broth', []),
      ],
    },
    {
      id: 'subway',
      name: 'Subway',
      mark: 'SW',
      note: 'Prototype dataset · 12 items',
      sectionOrder: ['High-protein picks', '6-inch sandwiches', 'Bowls & salads', 'Sides'],
      items: [
        item('sw-1', 'Double Chicken Protein Bowl', 'High-protein picks', 490, 58, 24, 18, 'Double chicken, vegetables and selected sauce', ['Highest protein']),
        item('sw-2', 'Grilled Chicken 6-inch', 'High-protein picks', 420, 35, 48, 10, 'Chicken and vegetables on whole-grain bread', ['High protein']),
        item('sw-3', 'Turkey Protein Bowl', 'High-protein picks', 330, 38, 20, 11, 'Turkey and vegetables with selected sauce', ['Light choice']),
        item('sw-4', 'Steak 6-inch', '6-inch sandwiches', 450, 32, 49, 14, 'Steak, cheese and vegetables', ['Popular']),
        item('sw-5', 'Turkey 6-inch', '6-inch sandwiches', 360, 27, 48, 7, 'Turkey and vegetables on whole-grain bread', ['Light choice']),
        item('sw-6', 'Tuna 6-inch', '6-inch sandwiches', 520, 25, 48, 25, 'Tuna and vegetables on selected bread', []),
        item('sw-7', 'Veggie 6-inch', '6-inch sandwiches', 290, 12, 49, 5, 'Fresh vegetables on whole-grain bread', ['Vegetarian']),
        item('sw-8', 'Chicken Protein Bowl', 'Bowls & salads', 370, 42, 22, 13, 'Chicken and vegetables with selected sauce', ['High protein']),
        item('sw-9', 'Steak Salad', 'Bowls & salads', 350, 32, 18, 17, 'Steak, cheese and mixed vegetables', []),
        item('sw-10', 'Turkey Salad', 'Bowls & salads', 260, 28, 16, 9, 'Turkey and mixed vegetables', ['Light choice']),
        item('sw-11', 'Baked Chips', 'Sides', 140, 2, 24, 4, 'Single-serve baked chips', ['Vegetarian']),
        item('sw-12', 'Chocolate Cookie', 'Sides', 220, 3, 30, 10, 'Single chocolate cookie', ['Vegetarian']),
      ],
    },
  ];

  function item(id, name, section, calories, protein, carbs, fat, description, flags) {
    return { id, name, section, calories, protein, carbs, fat, description, flags, serving: '1 menu serving' };
  }

  const state = {
    restaurantId: 'boston-pizza',
    search: '',
    quick: new Set(),
    maxCalories: 1200,
    minProtein: 0,
    sort: 'menu',
    meal: 'Dinner',
    activeItemId: null,
    logged: [],
  };

  const remaining = { calories: 820, protein: 62 };
  const els = {
    results: document.querySelector('#menu-results'),
    restaurantName: document.querySelector('#restaurant-name'),
    restaurantMark: document.querySelector('#restaurant-mark'),
    restaurantMeta: document.querySelector('#restaurant-meta'),
    search: document.querySelector('#menu-search'),
    clearSearch: document.querySelector('#clear-search'),
    resultsEyebrow: document.querySelector('#results-eyebrow'),
    resultsTitle: document.querySelector('#results-title'),
    sortButton: document.querySelector('#sort-button'),
    filterCount: document.querySelector('#filter-count'),
    categoryNav: document.querySelector('#category-nav'),
    menuStatus: document.querySelector('#menu-status'),
    remainingCalories: document.querySelector('#remaining-calories'),
    remainingProtein: document.querySelector('#remaining-protein'),
    logTray: document.querySelector('#log-tray'),
    logTrayCopy: document.querySelector('#log-tray-copy'),
    sheetLayer: document.querySelector('#sheet-layer'),
    sheetContent: document.querySelector('#sheet-content'),
    toast: document.querySelector('#toast'),
  };

  function currentRestaurant() {
    return restaurants.find((restaurant) => restaurant.id === state.restaurantId) || restaurants[0];
  }

  function activeLimits() {
    const maxValues = [state.maxCalories];
    let minProtein = state.minProtein;
    if (state.quick.has('fits')) maxValues.push(remaining.calories);
    if (state.quick.has('under700')) maxValues.push(700);
    if (state.quick.has('protein40')) minProtein = Math.max(minProtein, 40);
    return { maxCalories: Math.min(...maxValues), minProtein };
  }

  function filteredItems() {
    const query = state.search.trim().toLowerCase();
    const limits = activeLimits();
    return currentRestaurant().items.filter((menuItem) => {
      const searchable = `${menuItem.name} ${menuItem.description} ${menuItem.section}`.toLowerCase();
      return menuItem.calories <= limits.maxCalories && menuItem.protein >= limits.minProtein && (!query || searchable.includes(query));
    });
  }

  function sorted(items) {
    const list = [...items];
    if (state.sort === 'protein') list.sort((a, b) => b.protein - a.protein || a.calories - b.calories);
    if (state.sort === 'calories-low') list.sort((a, b) => a.calories - b.calories || b.protein - a.protein);
    if (state.sort === 'density') list.sort((a, b) => (b.protein / b.calories) - (a.protein / a.calories));
    return list;
  }

  function density(menuItem) {
    return ((menuItem.protein / menuItem.calories) * 100).toFixed(1);
  }

  function render() {
    const restaurant = currentRestaurant();
    const matches = filteredItems();
    const loggedTotals = state.logged.reduce((totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
    }), { calories: 0, protein: 0 });
    const customFilterCount = Number(state.maxCalories < 1200) + Number(state.minProtein > 0);
    const totalFilterCount = state.quick.size + customFilterCount;
    els.restaurantName.textContent = restaurant.name;
    els.restaurantMark.textContent = restaurant.mark;
    els.restaurantMeta.textContent = `${restaurant.items.length} prototype items · ${restaurant.sectionOrder.length} sections`;
    els.search.placeholder = `Search ${restaurant.name} menu`;
    els.clearSearch.hidden = !state.search;
    els.resultsEyebrow.textContent = state.search || totalFilterCount ? `${matches.length} MATCH${matches.length === 1 ? '' : 'ES'}` : 'FULL MENU';
    els.resultsTitle.textContent = state.search || totalFilterCount > 1 ? 'Results for you' : `${restaurant.name} menu`;
    els.sortButton.textContent = sortLabel(state.sort);
    els.menuStatus.textContent = `${restaurant.items.length} items organized into ${restaurant.sectionOrder.length} menu sections`;
    els.remainingCalories.textContent = Math.max(0, remaining.calories - loggedTotals.calories);
    els.remainingProtein.textContent = Math.max(0, remaining.protein - loggedTotals.protein);
    els.logTray.hidden = state.logged.length === 0;
    els.logTrayCopy.innerHTML = state.logged.length
      ? `<strong>${state.meal} · ${state.logged.length} item${state.logged.length === 1 ? '' : 's'}</strong><span>${loggedTotals.calories} cal · ${loggedTotals.protein} g protein</span>`
      : '';
    els.filterCount.hidden = totalFilterCount === 0;
    els.filterCount.textContent = totalFilterCount;
    document.querySelectorAll('[data-quick-filter]').forEach((button) => {
      button.classList.toggle('is-active', state.quick.has(button.dataset.quickFilter));
      button.setAttribute('aria-pressed', String(state.quick.has(button.dataset.quickFilter)));
    });

    els.categoryNav.innerHTML = restaurant.sectionOrder.map((sectionName, index) => `
      <button type="button" class="${index === 0 ? 'is-current' : ''}" data-section-target="${slug(sectionName)}">${escapeHtml(sectionName)}</button>
    `).join('');

    if (!matches.length) {
      els.results.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/></svg>
        <strong>No menu items match</strong>
        <p>Try widening the calorie range, lowering protein, or clearing your search.</p>
        <button type="button" data-reset-filters>Clear filters</button>
      </div>`;
      return;
    }

    const sections = restaurant.sectionOrder.map((sectionName) => ({
      name: sectionName,
      items: sorted(matches.filter((menuItem) => menuItem.section === sectionName)),
    })).filter((section) => section.items.length);

    els.results.innerHTML = sections.map((section) => `
      <section class="menu-section" id="menu-${slug(section.name)}">
        <div class="section-title"><h3>${escapeHtml(section.name)}</h3><span>${section.items.length} item${section.items.length === 1 ? '' : 's'}</span></div>
        <div class="item-list">
          ${section.items.map(menuItemTemplate).join('')}
        </div>
      </section>
    `).join('');
  }

  function menuItemTemplate(menuItem) {
    const fitFlag = menuItem.calories <= remaining.calories ? '<span class="item-flag item-flag--protein">Fits today</span>' : '';
    const proteinFlag = Number(density(menuItem)) >= 7.5 ? '<span class="item-flag item-flag--protein">Protein efficient</span>' : '';
    const flags = menuItem.flags.slice(0, 1).map((flag) => `<span class="item-flag">${escapeHtml(flag)}</span>`).join('');
    return `<button class="menu-item" type="button" data-item-id="${menuItem.id}" aria-label="View ${escapeHtml(menuItem.name)} details">
      <span class="item-visual item-visual--${iconForSection(menuItem.section).className}" aria-hidden="true">${iconForSection(menuItem.section).svg}</span>
      <span class="item-copy">
        <strong>${escapeHtml(menuItem.name)}</strong>
        <small>${escapeHtml(menuItem.description)}</small>
        <span class="item-flags">${fitFlag}${proteinFlag}${flags}</span>
        <span class="item-secondary-macros">C ${menuItem.carbs} g&nbsp;&nbsp;·&nbsp;&nbsp;F ${menuItem.fat} g</span>
      </span>
      <span class="item-nutrition">
        <span class="item-calories"><strong>${menuItem.calories}</strong><small>CALORIES</small></span>
        <span class="item-protein"><strong>${menuItem.protein}</strong><span>g protein</span></span>
      </span>
    </button>`;
  }

  function iconForSection(section) {
    if (/pizza/i.test(section)) return { className: 'pizza', svg: '<svg viewBox="0 0 32 32"><path d="M5 25 14 6c5 1 9 3 13 7L5 25Z"/><path d="M14 6c5 1 9 3 13 7M11 13l2 .1M18 15l2 .2M12 20l2 .2"/></svg>' };
    if (/salad/i.test(section)) return { className: 'salad', svg: '<svg viewBox="0 0 32 32"><path d="M6 14h20c0 7-4 12-10 12S6 21 6 14Z"/><path d="M10 12c0-3 2-5 5-5M16 12c0-4 3-7 7-7M17 11c3-1 6 0 7 3"/></svg>' };
    if (/pasta/i.test(section)) return { className: 'pasta', svg: '<svg viewBox="0 0 32 32"><path d="M6 14h20c0 7-4 12-10 12S6 21 6 14Z"/><path d="M11 8v7M16 6v9M21 8v7"/></svg>' };
    if (/side/i.test(section)) return { className: 'sides', svg: '<svg viewBox="0 0 32 32"><path d="M9 8h14l2 17H7L9 8Z"/><path d="m11 8 1-4M16 8V3M21 8l-1-4"/></svg>' };
    return { className: 'plate', svg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><path d="M5 26h22"/></svg>' };
  }

  function sortLabel(sort) {
    return ({ menu: 'Menu order', protein: 'Most protein', 'calories-low': 'Lowest calories', density: 'Best protein / cal' })[sort];
  }

  function openSheet(type) {
    if (type === 'restaurants') els.sheetContent.innerHTML = restaurantSheet();
    if (type === 'filters') els.sheetContent.innerHTML = filtersSheet();
    if (type === 'about') els.sheetContent.innerHTML = aboutSheet();
    if (type === 'item') els.sheetContent.innerHTML = itemSheet();
    if (type === 'log') els.sheetContent.innerHTML = logSheet();
    els.sheetLayer.hidden = false;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => els.sheetContent.querySelector('button, input, select')?.focus({ preventScroll: true }));
  }

  function closeSheet() {
    els.sheetLayer.hidden = true;
    document.body.classList.remove('sheet-open');
  }

  function sheetHeader(eyebrow, title) {
    return `<header class="sheet-header"><div><span>${eyebrow}</span><h2 id="sheet-title">${title}</h2></div><button class="sheet-close" type="button" data-close-sheet>Done</button></header>`;
  }

  function restaurantSheet() {
    return `${sheetHeader('CHOOSE A LOCATION', 'Select restaurant')}
      <div class="restaurant-options">
        ${restaurants.map((restaurant) => `<button class="restaurant-option${restaurant.id === state.restaurantId ? ' is-selected' : ''}" type="button" data-restaurant-id="${restaurant.id}">
          <span class="restaurant-mark">${restaurant.mark}</span>
          <span class="restaurant-option-copy"><strong>${restaurant.name}</strong><small>${restaurant.note}</small></span>
          <span class="option-check">✓</span>
        </button>`).join('')}
      </div>
      <p class="sheet-note">A live version could rank nearby restaurants first, then retrieve current nutrition from an approved data provider or a verified restaurant feed.</p>`;
  }

  function filtersSheet() {
    return `${sheetHeader('REFINE MENU', 'Nutrition filters')}
      <form class="filter-form" id="filter-form">
        <label class="filter-field">
          <span>Maximum calories <output id="calorie-output">${state.maxCalories >= 1200 ? 'Any' : state.maxCalories}</output></span>
          <input type="range" name="maxCalories" min="200" max="1200" step="50" value="${state.maxCalories}">
        </label>
        <label class="filter-field">
          <span>Minimum protein <output id="protein-output">${state.minProtein ? `${state.minProtein} g` : 'Any'}</output></span>
          <input type="range" name="minProtein" min="0" max="80" step="5" value="${state.minProtein}">
        </label>
        <label class="filter-field">
          <span>Sort results</span>
          <select name="sort">
            <option value="menu"${state.sort === 'menu' ? ' selected' : ''}>Menu order</option>
            <option value="protein"${state.sort === 'protein' ? ' selected' : ''}>Most protein</option>
            <option value="calories-low"${state.sort === 'calories-low' ? ' selected' : ''}>Lowest calories</option>
            <option value="density"${state.sort === 'density' ? ' selected' : ''}>Best protein per calorie</option>
          </select>
        </label>
        <div class="filter-actions">
          <button class="button-secondary" type="button" data-reset-filters>Reset</button>
          <button class="button-primary" type="submit">Show results</button>
        </div>
      </form>`;
  }

  function itemSheet() {
    const restaurant = currentRestaurant();
    const menuItem = restaurant.items.find((candidate) => candidate.id === state.activeItemId);
    if (!menuItem) return sheetHeader('ITEM DETAILS', 'Item unavailable');
    return `${sheetHeader(escapeHtml(menuItem.section.toUpperCase()), 'Item details')}
      <div class="detail-title"><h2>${escapeHtml(menuItem.name)}</h2><p>${escapeHtml(menuItem.description)} · ${escapeHtml(menuItem.serving)}</p></div>
      <div class="detail-macros">
        <div><strong>${menuItem.calories}</strong><span>CALORIES</span></div>
        <div><strong>${menuItem.protein} g</strong><span>PROTEIN</span></div>
        <div><strong>${menuItem.carbs} g</strong><span>CARBS</span></div>
        <div><strong>${menuItem.fat} g</strong><span>FAT</span></div>
      </div>
      <div class="detail-density"><span>Protein efficiency</span><strong>${density(menuItem)} g per 100 cal</strong></div>
      <div class="meal-picker" aria-label="Choose meal">
        ${['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => `<button type="button" class="${meal === state.meal ? 'is-selected' : ''}" data-meal="${meal}">${meal}</button>`).join('')}
      </div>
      <button class="detail-log button-primary" type="button" data-log-item="${menuItem.id}">Add to ${state.meal}</button>
      <div class="detail-source"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span>Illustrative prototype nutrition only. A production item would show its provider, serving basis and last-verified date here.</span></div>`;
  }

  function logSheet() {
    const totalCalories = state.logged.reduce((sum, entry) => sum + entry.calories, 0);
    const totalProtein = state.logged.reduce((sum, entry) => sum + entry.protein, 0);
    return `${sheetHeader('TODAY\'S FOOD LOG', state.meal)}
      <div class="logged-list">
        ${state.logged.map((entry, index) => `<div class="logged-row"><span><strong>${escapeHtml(entry.name)}</strong><small>${entry.calories} cal · ${entry.protein} g protein</small></span><button type="button" data-remove-logged="${index}" aria-label="Remove ${escapeHtml(entry.name)}">Remove</button></div>`).join('')}
      </div>
      <div class="logged-total"><span>Meal total</span><strong>${totalCalories} cal · ${totalProtein} g protein</strong></div>
      <button class="detail-log button-primary" type="button" data-finish-log>Done</button>`;
  }

  function aboutSheet() {
    return `${sheetHeader('HOW IT COULD WORK', 'Prototype notes')}
      <div class="about-list">
        <div class="about-row"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg><div><strong>Menu-like, not a copied menu</strong><span>Level Up keeps the restaurant's category structure while using its own interface and no restaurant logos or photography.</span></div></div>
        <div class="about-row"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><div><strong>Personal ranking</strong><span>Calories remaining and protein targets can help surface realistic choices for the user's current day.</span></div></div>
        <div class="about-row"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h4"/></svg><div><strong>Verified source required</strong><span>Launch data should come from an approved API, licensed dataset, or restaurant-provided nutrition—not generated estimates.</span></div></div>
      </div>`;
  }

  function resetFilters() {
    state.quick.clear();
    state.maxCalories = 1200;
    state.minProtein = 0;
    state.sort = 'menu';
    render();
  }

  function showToast(message) {
    window.clearTimeout(showToast.timer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    showToast.timer = window.setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-sheet]');
    if (open) openSheet(open.dataset.openSheet);

    if (event.target.closest('[data-close-sheet]')) closeSheet();

    const quick = event.target.closest('[data-quick-filter]');
    if (quick) {
      const key = quick.dataset.quickFilter;
      state.quick.has(key) ? state.quick.delete(key) : state.quick.add(key);
      render();
    }

    const restaurantButton = event.target.closest('[data-restaurant-id]');
    if (restaurantButton) {
      state.restaurantId = restaurantButton.dataset.restaurantId;
      state.search = '';
      els.search.value = '';
      closeSheet();
      render();
      showToast(`${currentRestaurant().name} menu selected`);
    }

    const itemButton = event.target.closest('[data-item-id]');
    if (itemButton) {
      state.activeItemId = itemButton.dataset.itemId;
      openSheet('item');
    }

    const sectionButton = event.target.closest('[data-section-target]');
    if (sectionButton) {
      document.querySelectorAll('[data-section-target]').forEach((button) => button.classList.toggle('is-current', button === sectionButton));
      document.querySelector(`#menu-${sectionButton.dataset.sectionTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const mealButton = event.target.closest('[data-meal]');
    if (mealButton) {
      state.meal = mealButton.dataset.meal;
      els.sheetContent.innerHTML = itemSheet();
    }

    const logButton = event.target.closest('[data-log-item]');
    if (logButton) {
      const menuItem = currentRestaurant().items.find((candidate) => candidate.id === logButton.dataset.logItem);
      state.logged.push(menuItem);
      closeSheet();
      render();
      showToast(`${menuItem.name} added to ${state.meal}`);
    }

    const removeLogged = event.target.closest('[data-remove-logged]');
    if (removeLogged) {
      state.logged.splice(Number(removeLogged.dataset.removeLogged), 1);
      render();
      if (state.logged.length) els.sheetContent.innerHTML = logSheet();
      else closeSheet();
    }

    if (event.target.closest('[data-finish-log]')) closeSheet();

    if (event.target.closest('[data-reset-filters]')) {
      resetFilters();
      closeSheet();
      showToast('Nutrition filters cleared');
    }

    const demo = event.target.closest('[data-demo-toast]');
    if (demo) showToast(demo.dataset.demoToast);
  });

  document.addEventListener('input', (event) => {
    if (event.target === els.search) {
      state.search = event.target.value;
      render();
    }
    if (event.target.name === 'maxCalories') {
      document.querySelector('#calorie-output').textContent = Number(event.target.value) >= 1200 ? 'Any' : event.target.value;
    }
    if (event.target.name === 'minProtein') {
      document.querySelector('#protein-output').textContent = Number(event.target.value) ? `${event.target.value} g` : 'Any';
    }
  });

  document.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.id === 'filter-form') {
      const formData = new FormData(event.target);
      state.maxCalories = Number(formData.get('maxCalories'));
      state.minProtein = Number(formData.get('minProtein'));
      state.sort = String(formData.get('sort'));
      closeSheet();
      render();
    }
  });

  els.clearSearch.addEventListener('click', () => {
    state.search = '';
    els.search.value = '';
    els.search.focus();
    render();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.sheetLayer.hidden) closeSheet();
  });

  render();
})();
