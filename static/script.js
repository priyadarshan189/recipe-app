const API_BASE = '/api/recipes';
let currentPage = 1;
let currentLimit = 15;
let currentFilters = {};

// DOM Elements
const tableBody = document.getElementById('recipeTableBody');
const searchInput = document.getElementById('searchInput');
const cuisineFilter = document.getElementById('cuisineFilter');
const caloriesFilter = document.getElementById('caloriesFilter');
const ratingFilter = document.getElementById('ratingFilter');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageIndicator = document.getElementById('pageIndicator');
const drawer = document.getElementById('detailDrawer');
const overlay = document.getElementById('drawerOverlay');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const drawerContent = document.getElementById('drawerContent');
const loadingState = document.getElementById('loadingState');
const noResults = document.getElementById('noResults');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchRecipes();
    setupEventListeners();
});

function setupEventListeners() {
    // Search Debounce
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilters.title = e.target.value;
            currentPage = 1;
            fetchRecipes();
        }, 500);
    });

    // Filters
    caloriesFilter.addEventListener('change', () => { // Or 'input' with debounce
        const val = caloriesFilter.value;
        if (val) currentFilters.calories = `<=${val}`;
        else delete currentFilters.calories;
        currentPage = 1;
        fetchRecipes();
    });

    ratingFilter.addEventListener('change', () => {
        const val = ratingFilter.value;
        if (val) currentFilters.rating = `>=${val}`;
        else delete currentFilters.rating;
        currentPage = 1;
        fetchRecipes();
    });
    
    // Pagination
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchRecipes();
        }
    });

    nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchRecipes();
    });

    // Drawer
    closeDrawerBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
}

async function fetchRecipes() {
    // Show Loading
    tableBody.innerHTML = '';
    loadingState.classList.remove('hidden');
    noResults.classList.add('hidden');

    const params = new URLSearchParams({
        page: currentPage,
        limit: currentLimit,
        ...currentFilters
    });

    // Switch endpoint based on filters presence logic? 
    // Requirement says "Search API" for filtering. "Get All" for paginated.
    // Our 'search' endpoint handles filters. 'get' endpoint handles default listing.
    // Actually, let's use search endpoint if filters exist, or just use search endpoint for everything if it handles empty filters gracefully?
    // My api.py search endpoint handles empty filters gracefully but might be slower if not optimized?
    // Let's use /search if specific search params exist, else /recipes.
    // Actually simpler to use /search for everything if logic aligns, but let's stick to spec.
    // Spec: "Endpoint 1: Get All Recipes", "Endpoint 2: Search Recipes".
    
    let url = `${API_BASE}`;
    if (currentFilters.title || currentFilters.calories || currentFilters.rating || currentFilters.cuisine) {
        url = `${API_BASE}/search`;
    }
    
    try {
        const res = await fetch(`${url}?${params}`);
        const data = await res.json();
        renderTable(data);
    } catch (err) {
        console.error('Error fetching recipes:', err);
        loadingState.classList.add('hidden');
        noResults.textContent = "Error loading data.";
        noResults.classList.remove('hidden');
    }
}

function renderTable(response) {
    loadingState.classList.add('hidden');
    const recipes = response.data;
    const total = response.total;
    const totalPages = response.pages;

    // Update Pagination Info
    document.getElementById('paginationInfo').textContent = `Showing ${(currentPage-1)*currentLimit + 1}-${Math.min(currentPage*currentLimit, total)} of ${total}`;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || total === 0;

    if (recipes.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }

    recipes.forEach(recipe => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${truncate(recipe.title, 30)}</td>
            <td><span class="badge">${recipe.cuisine || 'Unknown'}</span></td>
            <td>${renderStars(recipe.rating)}</td>
            <td>${formatTime(recipe.total_time)}</td>
            <td>${recipe.serves || '-'}</td>
        `;
        tr.addEventListener('click', () => openDrawer(recipe));
        tableBody.appendChild(tr);
    });
}

function openDrawer(recipe) {
    // Populate Drawer
    const nutrients = recipe.nutrients || {};
    
    drawerContent.innerHTML = `
        <div class="drawer-header">
            <h2>${recipe.title}</h2>
            <span class="badge">${recipe.cuisine || 'Global'}</span>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <span>Rating</span>
                <span>${renderStars(recipe.rating)} (${recipe.rating})</span>
            </div>
            <div class="info-item" onclick="this.classList.toggle('expanded')">
                <span>Total Time <i class="fas fa-chevron-down"></i></span>
                <span>${formatTime(recipe.total_time)}</span>
                <!-- Hidden details could go here -->
            </div>
             <div class="info-item">
                <span>Description</span>
                <p style="font-size:0.9rem; color:#666;">${recipe.description || 'No description available.'}</p>
            </div>
        </div>

        <h3>Nutrition</h3>
        <table class="nutrition-table">
            <tr><td>Calories</td><td>${nutrients.calories || '-'}</td></tr>
            <tr><td>Carbs</td><td>${nutrients.carbohydrateContent || '-'}</td></tr>
            <tr><td>Protein</td><td>${nutrients.proteinContent || '-'}</td></tr>
            <tr><td>Fat</td><td>${nutrients.fatContent || '-'}</td></tr>
        </table>
        
        <h3 style="margin-top:1rem;">Ingredients</h3>
        <ul style="padding-left:1.5rem; margin-bottom:1rem;">
           ${(recipe.ingredients || []).map(i => `<li>${i}</li>`).join('')} 
        </ul>
    `;

    drawer.classList.add('active');
    overlay.classList.add('active');
}

function closeDrawer() {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
}

// Helpers
function truncate(str, n) {
    return (str && str.length > n) ? str.substr(0, n-1) + '&hellip;' : str;
}

function renderStars(rating) {
    if (!rating) return 'No Rating';
    const stars = Math.round(rating);
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += `<i class="fas fa-star" style="color: ${i < stars ? '#f1c40f' : '#ddd'}"></i>`;
    }
    return html;
}

function formatTime(mins) {
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
