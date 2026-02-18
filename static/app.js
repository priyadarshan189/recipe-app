const API_BASE = '/api';
const PAGE_SIZE = 12;

let currentPage = 1;
let currentFilters = {};
let isSearchMode = false;
let recipesData = []; // Store current page recipes for easy access
let currentRecipe = null; // For drawer context

// New State
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let shoppingList = JSON.parse(localStorage.getItem('shoppingList')) || [];
let cookingStepIndex = 0;
let cookingSteps = [];

// DOM Elements
const recipeGrid = document.getElementById('recipeGrid');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const cuisineFilter = document.getElementById('cuisineFilter');
const ratingFilter = document.getElementById('ratingFilter');
const caloriesFilter = document.getElementById('caloriesFilter');
const resetBtn = document.getElementById('resetBtn');

// Modals & Panels
const drawerOverlay = document.getElementById('drawerOverlay');
const detailDrawer = document.getElementById('detailDrawer');
const closeDrawerBtn = document.getElementById('closeDrawer');
const drawerContent = document.getElementById('drawerContent');
const themeToggle = document.getElementById('themeToggle');

// New DOM Elements
const myCookbookBtn = document.getElementById('myCookbookBtn');
const shoppingListBtn = document.getElementById('shoppingListBtn');
const favoritesModal = document.getElementById('favoritesModal');
const favoritesGrid = document.getElementById('favoritesGrid');
const shoppingListModal = document.getElementById('shoppingListModal');
const shoppingListItems = document.getElementById('shoppingListItems');
const clearShoppingListBtn = document.getElementById('clearShoppingList');
const copyShoppingListBtn = document.getElementById('copyShoppingList');
const cookingModeModal = document.getElementById('cookingModeModal');
const closeCookingModeBtn = document.getElementById('closeCookingMode');
const cookingStepsContainer = document.getElementById('cookingStepsContainer');
const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const stepIndicator = document.getElementById('stepIndicator');

// Initialize
async function init() {
    initTheme();
    updateFavoritesIcon();
    await fetchCuisines();
    await fetchRecipes();
    setupEventListeners();
}

// --- Theme Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// --- Data Fetching ---
async function fetchCuisines() {
    try {
        const response = await fetch(`${API_BASE}/cuisines`);
        const cuisines = await response.json();
        cuisines.forEach(cuisine => {
            const option = document.createElement('option');
            option.value = cuisine;
            option.textContent = cuisine;
            cuisineFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching cuisines:', error);
    }
}

async function fetchRecipes(page = 1) {
    let url = `${API_BASE}/recipes`;
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', PAGE_SIZE);

    if (isSearchMode || currentFilters.query) {
        url = `${API_BASE}/recipes/search`;
        if (currentFilters.query) params.append('title', currentFilters.query);
        if (currentFilters.cuisine) params.append('cuisine', currentFilters.cuisine);
        if (currentFilters.rating) params.append('rating', `>=${currentFilters.rating}`);
        if (currentFilters.calories) params.append('calories', currentFilters.calories);
    }

    try {
        const response = await fetch(`${url}?${params.toString()}`);
        const data = await response.json();
        recipesData = data.data; // Store for access
        renderRecipes(recipesData, recipeGrid);
        renderPagination(data.page, data.pages);
        currentPage = data.page;
        recipeGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Error fetching recipes:', error);
        recipeGrid.innerHTML = '<p class="error">Error loading recipes. Please try again.</p>';
    }
}

// --- Rendering ---
function renderRecipes(recipes, container) {
    container.innerHTML = '';
    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<p class="no-results">No recipes found.</p>';
        return;
    }

    recipes.forEach((recipe, index) => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        const isFav = favorites.some(f => f.id === recipe.id || f.title === recipe.title); // Fallback to title if no ID consistency

        const hue = (recipe.title.length * 137) % 360;
        const placeholderColor = `hsl(${hue}, 70%, 85%)`;

        card.innerHTML = `
            <div class="card-heart ${isFav ? 'liked' : ''}" data-id="${index}">♥</div>
            <div class="card-image" style="background-color: ${placeholderColor}">
                <span class="card-badge">${recipe.cuisine || 'Global'}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${recipe.title}</h3>
                <div class="card-meta">
                    <span class="rating">★ ${recipe.rating ? recipe.rating.toFixed(1) : '-'}</span>
                    <span>${formatTime(recipe.total_time)}</span>
                    <span>${recipe.calories ? Math.round(recipe.calories) + ' kcal' : '-'}</span>
                </div>
            </div>
        `;

        // Click on card opens drawer (except heart)
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('card-heart')) {
                showDrawer(recipe);
            }
        });

        // Click on heart toggles favorite
        card.querySelector('.card-heart').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(recipe);
            e.target.classList.toggle('liked');
            if (container === favoritesGrid) renderFavorites(); // Refresh if in favorites view
        });

        container.appendChild(card);
        setTimeout(() => card.classList.add('animate-in'), index * 100);
    });
}

function renderPagination(page, totalPages) {
    pageInfo.textContent = `Page ${page} of ${totalPages || 1}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= (totalPages || 1);
}

// --- Drawer & Details ---
function showDrawer(recipe) {
    currentRecipe = recipe; // Set context
    const isFav = favorites.some(f => f.title === recipe.title);

    // Ingredients List
    let ingredientsHtml = '<ul class="ingredients-list" id="drawerIngredients">';
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    ingredients.forEach(i => ingredientsHtml += `<li>${i}</li>`);
    ingredientsHtml += '</ul>';

    // Instructions
    let instructionsHtml = '<ol class="instructions-list">';
    const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
    instructions.forEach(i => instructionsHtml += `<li>${i}</li>`);
    instructionsHtml += '</ol>';

    // Nutrition Chart (Simple CSS Bar Chart)
    let nutritionHtml = '';
    if (recipe.nutrients) {
        nutritionHtml = '<div class="nutrition-bar-container">';
        // Normalize and pick top stats
        const relevant = ['calories', 'protein', 'carbohydrate', 'fat'];
        let maxVal = 0;
        const stats = [];

        for (const [key, val] of Object.entries(recipe.nutrients)) {
            const lowerKey = key.toLowerCase();
            const hit = relevant.find(r => lowerKey.includes(r));
            if (hit) {
                const num = parseFloat(val); // Extract number
                if (!isNaN(num)) {
                    if (num > maxVal && hit !== 'calories') maxVal = num; // Exclude calories from scale usually
                    stats.push({ name: hit, val: val, num: num });
                }
            }
        }
        // If maxVal is 0 or low, set a default
        if (maxVal < 50) maxVal = 50;

        stats.forEach(stat => {
            const isCal = stat.name === 'calories';
            // Scale height. Calories handled differently (visual cap)
            let height = 0;
            if (isCal) height = Math.min((stat.num / 800) * 100, 100);
            else height = (stat.num / maxVal) * 80; // Max 80% height

            nutritionHtml += `
                <div class="nutrition-bar" style="height: ${height}%; background-color: ${getColorForNutrient(stat.name)}">
                    <span class="nutrition-val">${Math.round(stat.num)}</span>
                    <span>${capitalize(stat.name)}</span>
                </div>
            `;
        });
        nutritionHtml += '</div>';
    }

    const urlHtml = recipe.url ?
        `<a href="${recipe.url}" target="_blank" class="view-recipe-btn">View Full Recipe &rarr;</a>` : '';

    drawerContent.innerHTML = `
        <h2 class="drawer-title">${recipe.title}</h2>
        <div class="drawer-header-meta">
            <span class="tag">${recipe.cuisine}</span>
            <button class="primary-btn" id="drawerFavoriteBtn">${isFav ? '❤️ Unfavorite' : '🤍 Favorite'}</button>
        </div>
        
        <p class="drawer-desc">${recipe.description || 'No description available.'}</p>
        
        <div class="drawer-section">
            <div class="time-stats">
               <div><strong>Total:</strong> ${formatTime(recipe.total_time)}</div>
               <div><strong>Serves:</strong> <span id="servingsVal">${recipe.serves || 4}</span></div>
            </div>
            <div style="margin-top: 15px;">
                <label>Adjust Portion:</label>
                <input type="range" id="portionSlider" min="1" max="12" value="${recipe.serves || 4}" style="width:100%">
            </div>
        </div>

        <div class="action-buttons" style="margin-bottom: 20px;">
            <button id="addToListBtn" class="secondary">🛒 Add Ingredients to List</button>
            <button id="startCookingBtn" class="primary-btn">👨‍🍳 Start Cooking Mode</button>
            ${urlHtml}
        </div>

        <div class="drawer-section">
            <h3>Ingredients</h3>
            ${ingredientsHtml}
        </div>

        <div class="drawer-section">
            <h3>Instructions</h3>
            ${instructionsHtml}
        </div>
        
        <div class="drawer-section">
            <h3>Nutrition</h3>
            ${nutritionHtml || '<p>No nutrition info.</p>'}
        </div>
    `;

    // Event Listeners for Drawer Actions
    document.getElementById('drawerFavoriteBtn').addEventListener('click', () => {
        toggleFavorite(recipe);
        showDrawer(recipe); // Re-render to update text
    });

    document.getElementById('addToListBtn').addEventListener('click', () => {
        addToShoppingList(ingredients);
        alert('Items added to Shopping List!');
    });

    document.getElementById('startCookingBtn').addEventListener('click', () => {
        startCookingMode(recipe);
    });

    const portionSlider = document.getElementById('portionSlider');
    portionSlider.addEventListener('input', (e) => {
        updatePortion(recipe, e.target.value);
    });

    detailDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function updatePortion(recipe, newServings) {
    document.getElementById('servingsVal').textContent = newServings;
    const originalServes = recipe.serves || 4;
    const ratio = newServings / originalServes;

    // Really simple regex ingredient scaler (matches starting numbers)
    const list = document.getElementById('drawerIngredients');
    list.innerHTML = '';
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

    ingredients.forEach(line => {
        // Try to find number at start
        const newLine = line.replace(/^([\d./]+)/, (match) => {
            // Convert fraction to decimal logic omitted for brevity, just handling simple numbers
            const num = parseFloat(match);
            if (!isNaN(num)) return Math.round(num * ratio * 10) / 10;
            return match;
        });
        list.innerHTML += `<li>${newLine}</li>`;
    });
}

// --- Features Logic ---

// Favorites
function toggleFavorite(recipe) {
    const index = favorites.findIndex(f => f.title === recipe.title);
    if (index === -1) {
        favorites.push(recipe);
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesIcon();
    // Update grid hearts if visible
    const cards = document.querySelectorAll('.recipe-card');
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent;
        if (title === recipe.title) {
            const heart = card.querySelector('.card-heart');
            heart.classList.toggle('liked');
        }
    });
}

function updateFavoritesIcon() {
    myCookbookBtn.textContent = `❤️ My Cookbook (${favorites.length})`;
}

function renderFavorites() {
    renderRecipes(favorites, favoritesGrid);
}

// Shopping List
function addToShoppingList(items) {
    items.forEach(item => {
        if (!shoppingList.includes(item)) {
            shoppingList.push(item);
        }
    });
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    updateShoppingListCount();
}

function updateShoppingListCount() {
    shoppingListBtn.textContent = `🛒 Shopping List (${shoppingList.length})`;
}

function renderShoppingList() {
    shoppingListItems.innerHTML = '';
    if (shoppingList.length === 0) {
        shoppingListItems.innerHTML = '<p>Your shopping list is empty.</p>';
        return;
    }
    shoppingList.forEach((item, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.padding = '8px 0';
        li.style.borderBottom = '1px solid #eee';
        li.innerHTML = `
            <span>${item}</span>
            <button class="danger-btn" style="padding: 2px 8px; font-size:0.8rem;" onclick="removeItemFromList(${index})">×</button>
        `;
        shoppingListItems.appendChild(li);
    });
}

// Defined globally so HTML onclick works
window.removeItemFromList = function (index) {
    shoppingList.splice(index, 1);
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    renderShoppingList();
    updateShoppingListCount();
};

// Cooking Mode
function startCookingMode(recipe) {
    cookingSteps = Array.isArray(recipe.instructions) ? recipe.instructions : ['No instructions.'];
    cookingStepIndex = 0;
    updateCookingStep();
    cookingModeModal.classList.remove('hidden');
    cookingModeModal.classList.add('open');
}

function updateCookingStep() {
    cookingStepsContainer.innerHTML = `<p>${cookingSteps[cookingStepIndex]}</p>`;
    stepIndicator.textContent = `Step ${cookingStepIndex + 1} of ${cookingSteps.length}`;
    prevStepBtn.disabled = cookingStepIndex === 0;
    nextStepBtn.textContent = cookingStepIndex === cookingSteps.length - 1 ? 'Finish' : 'Next';
}

// --- Event Listeners ---
function setupEventListeners() {
    // Search & Filter
    searchBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilters(); });
    cuisineFilter.addEventListener('change', applyFilters);
    ratingFilter.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', resetFilters);

    // Pagination
    prevBtn.addEventListener('click', () => { if (currentPage > 1) fetchRecipes(currentPage - 1); });
    nextBtn.addEventListener('click', () => fetchRecipes(currentPage + 1));

    // Drawer
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    themeToggle.addEventListener('click', toggleTheme);

    // Modals
    // Favorites
    myCookbookBtn.addEventListener('click', () => {
        renderFavorites();
        favoritesModal.classList.remove('hidden');
        favoritesModal.classList.add('open');
    });

    // Shopping List
    shoppingListBtn.addEventListener('click', () => {
        renderShoppingList();
        shoppingListModal.classList.remove('hidden');
        shoppingListModal.classList.add('open');
    });

    // Close Modals (Generic)
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('open');
            setTimeout(() => e.target.closest('.modal').classList.add('hidden'), 300);
        });
    });

    // Shopping List Actions
    clearShoppingListBtn.addEventListener('click', () => {
        shoppingList = [];
        localStorage.setItem('shoppingList', []);
        renderShoppingList();
        updateShoppingListCount();
    });

    copyShoppingListBtn.addEventListener('click', () => {
        const text = shoppingList.join('\n');
        navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
    });

    // Cooking Mode
    prevStepBtn.addEventListener('click', () => {
        if (cookingStepIndex > 0) {
            cookingStepIndex--;
            updateCookingStep();
        }
    });

    nextStepBtn.addEventListener('click', () => {
        if (cookingStepIndex < cookingSteps.length - 1) {
            cookingStepIndex++;
            updateCookingStep();
        } else {
            // Finish
            cookingModeModal.classList.remove('open');
            cookingModeModal.classList.add('hidden');
        }
    });
}

// Helper Functions
function applyFilters() {
    currentFilters = {
        query: searchInput.value,
        cuisine: cuisineFilter.value,
        rating: ratingFilter.value,
        calories: caloriesFilter.value
    };
    isSearchMode = true;
    currentPage = 1;
    fetchRecipes(1);
}

function resetFilters() {
    searchInput.value = '';
    cuisineFilter.value = '';
    ratingFilter.value = '';
    caloriesFilter.value = '';
    currentFilters = {};
    isSearchMode = false;
    currentPage = 1;
    fetchRecipes(1);
}

function closeDrawer() {
    detailDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

function formatTime(minutes) {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getColorForNutrient(name) {
    if (name === 'protein') return '#4ECDC4';
    if (name === 'carbohydrate') return '#FF6B6B';
    if (name === 'fat') return '#f1c40f';
    return '#95a5a6';
}

init();
