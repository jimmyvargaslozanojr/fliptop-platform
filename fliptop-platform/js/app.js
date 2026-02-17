// FlipTop Community Platform - Vanilla JS Frontend
const API_BASE = 'http://localhost:8080';

let currentView = 'emcees';
let currentStatsTab = 'by-year';
let emceesData = [];
let videosData = [];
let currentSearch = '';
let currentDivision = '';
let currentStatsTab = 'by-year';
let currentStatsYear = '';
let currentStatsDivision = '';
let currentStatsEmcee = '';

// Format numbers with commas
function formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Fetch API data
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error('API error');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// Load stats
async function loadStats() {
    const stats = await fetchAPI('/api/stats');
    if (stats) {
        document.getElementById('totalEmcees').textContent = formatNumber(stats.total_emcees);
        document.getElementById('totalVideos').textContent = formatNumber(stats.total_videos);
        document.getElementById('totalViews').textContent = formatNumber(stats.total_views);
    }
}

// Load divisions for filter
async function loadDivisions() {
    const data = await fetchAPI('/api/divisions');
    if (data && data.divisions) {
        const select = document.getElementById('divisionFilter');
        data.divisions.forEach(div => {
            const option = document.createElement('option');
            option.value = div;
            option.textContent = div;
            select.appendChild(option);
        });
    }
}

// Load emcees
async function loadEmcees() {
    const grid = document.getElementById('emceesGrid');
    grid.innerHTML = '<div class="loading">Loading emcees...</div>';

    let endpoint = `/api/emcees?limit=100`;
    if (currentSearch) endpoint += `&search=${encodeURIComponent(currentSearch)}`;
    if (currentDivision) endpoint += `&division=${encodeURIComponent(currentDivision)}`;

    const data = await fetchAPI(endpoint);
    if (data && data.emcees) {
        emceesData = data.emcees;
        renderEmcees(emceesData);
    } else {
        grid.innerHTML = '<div class="loading">Error loading emcees. Make sure API is running.</div>';
    }
}

// Render emcee cards
function renderEmcees(emcees) {
    const grid = document.getElementById('emceesGrid');
    if (!emcees.length) {
        grid.innerHTML = '<div class="loading">No emcees found</div>';
        return;
    }

    grid.innerHTML = emcees.map(emcee => `
        <div class="emcee-card" onclick="openEmceeModal(${emcee.id})">
            <img src="${emcee.profile_picture || 'https://via.placeholder.com/200x200?text=No+Image'}"
                 alt="${emcee.name}"
                 onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
            <div class="emcee-info">
                <h3>${emcee.name}</h3>
                <p class="hometown">${emcee.hometown || 'Unknown'}</p>
                ${emcee.division ? `<span class="division">${emcee.division}</span>` : ''}
                <p class="year">Joined ${emcee.year_joined || 'N/A'}</p>
            </div>
        </div>
    `).join('');
}

// Load videos
async function loadVideos() {
    const grid = document.getElementById('videosGrid');
    grid.innerHTML = '<div class="loading">Loading videos...</div>';

    let endpoint = `/api/videos?limit=50&sort=views`;
    if (currentSearch) endpoint += `&search=${encodeURIComponent(currentSearch)}`;

    const data = await fetchAPI(endpoint);
    if (data && data.videos) {
        videosData = data.videos;
        renderVideos(videosData);
    } else {
        grid.innerHTML = '<div class="loading">Error loading videos. Make sure API is running.</div>';
    }
}

// Render video cards
function renderVideos(videos) {
    const grid = document.getElementById('videosGrid');
    if (!videos.length) {
        grid.innerHTML = '<div class="loading">No videos found</div>';
        return;
    }

    grid.innerHTML = videos.map(video => `
        <div class="video-card">
            <div class="thumbnail" onclick="window.open('${video.url}', '_blank')">
                <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/300x170?text=No+Thumbnail'">
                <div class="play-btn">▶</div>
            </div>
            <div class="video-info">
                <h4>${video.title}</h4>
                <div class="video-stats">
                    <span>👁 ${formatNumber(video.views)}</span>
                    <span>👍 ${formatNumber(video.likes)}</span>
                    <span>💬 ${formatNumber(video.comments)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Open emcee modal
async function openEmceeModal(id) {
    const data = await fetchAPI(`/api/emcees/${id}`);
    if (!data || data.error) return;

    document.getElementById('modalProfileImg').src = data.profile_picture || 'https://via.placeholder.com/400x250?text=No+Image';
    document.getElementById('modalName').textContent = data.name;
    document.getElementById('modalHometown').textContent = data.hometown || '';

    // Tags
    const tagsContainer = document.getElementById('modalTags');
    tagsContainer.innerHTML = '';
    if (data.division) {
        tagsContainer.innerHTML += `<span class="tag">${data.division}</span>`;
    }
    if (data.year_joined) {
        tagsContainer.innerHTML += `<span class="tag">Since ${data.year_joined}</span>`;
    }
    if (data.reppin) {
        tagsContainer.innerHTML += `<span class="tag">${data.reppin}</span>`;
    }

    document.getElementById('modalDescription').textContent = data.description || 'No description available.';

    // Accomplishments
    const accContainer = document.getElementById('modalAccomplishments');
    if (data.accomplishments) {
        accContainer.innerHTML = `<h4>🏆 Accomplishments</h4><p>${data.accomplishments}</p>`;
    } else {
        accContainer.innerHTML = '';
    }

    // Social links
    const socialContainer = document.getElementById('modalSocial');
    socialContainer.innerHTML = '';
    if (data.facebook) socialContainer.innerHTML += `<a href="${data.facebook}" target="_blank">📘 Facebook</a>`;
    if (data.twitter) socialContainer.innerHTML += `<a href="${data.twitter}" target="_blank">𝕏 Twitter</a>`;
    if (data.instagram) socialContainer.innerHTML += `<a href="${data.instagram}" target="_blank">📸 Instagram</a>`;
    if (data.youtube) socialContainer.innerHTML += `<a href="${data.youtube}" target="_blank">▶️ YouTube</a>`;

    // Battles
    const battlesContainer = document.getElementById('modalBattles');
    if (data.latest_battles && data.latest_battles.length) {
        battlesContainer.innerHTML = data.latest_battles.map(battle =>
            `<div class="battle-item">${battle.title}</div>`
        ).join('');
    } else {
        battlesContainer.innerHTML = '<div class="battle-item">No recent battles</div>';
    }

    document.getElementById('emceeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    document.getElementById('emceeModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Switch views
function switchView(view) {
    currentView = view;

    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    document.getElementById('emceesView').style.display = view === 'emcees' ? 'block' : 'none';
    document.getElementById('videosView').style.display = view === 'videos' ? 'block' : 'none';
    document.getElementById('statsView').style.display = view === 'stats' ? 'block' : 'none';
    document.getElementById('toolbar').style.display = (view === 'emcees' || view === 'videos') ? 'flex' : 'none';

    if (view === 'emcees') {
        loadEmcees();
    } else if (view === 'videos') {
        loadVideos();
    } else if (view === 'stats') {
        loadStatsView();
    }
}

// Stats View Functions
async function loadStatsView() {
    // Load years
    const yearsData = await fetchAPI('/api/stats/by-year?limit=1');
    if (yearsData && yearsData.years) {
        const yearSelect = document.getElementById('yearFilter');
        yearSelect.innerHTML = '<option value="">All Years</option>';
        yearsData.years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    // Load divisions
    const divData = await fetchAPI('/api/divisions');
    if (divData && divData.divisions) {
        const divSelect = document.getElementById('divisionStatsFilter');
        divSelect.innerHTML = '<option value="">All Divisions</option>';
        divData.divisions.forEach(div => {
            const option = document.createElement('option');
            option.value = div;
            option.textContent = div;
            divSelect.appendChild(option);
        });
    }

    // Load emcees for dropdown
    const emceesData = await fetchAPI('/api/emcees?limit=200');
    if (emceesData && emceesData.emcees) {
        const emceeSelect = document.getElementById('emceeStatsFilter');
        emceeSelect.innerHTML = '<option value="">Select Emcee</option>';
        emceesData.emcees.forEach(emcee => {
            const option = document.createElement('option');
            option.value = emcee.name;
            option.textContent = emcee.name;
            emceeSelect.appendChild(option);
        });
    }

    loadStatsData();
}

async function loadStatsData() {
    const grid = document.getElementById('statsVideosGrid');
    grid.innerHTML = '<div class="loading">Loading stats...</div>';

    let endpoint = '';
    if (currentStatsTab === 'by-year') {
        const year = document.getElementById('yearFilter').value;
        endpoint = `/api/stats/by-year?limit=20${year ? '&year=' + year : ''}`;
    } else if (currentStatsTab === 'by-division') {
        const division = document.getElementById('divisionStatsFilter').value;
        endpoint = `/api/stats/by-division?limit=20${division ? '&division=' + encodeURIComponent(division) : ''}`;
    } else if (currentStatsTab === 'by-emcee') {
        const emcee = document.getElementById('emceeStatsFilter').value;
        if (emcee) {
            endpoint = `/api/stats/by-emcee?emcee=${encodeURIComponent(emcee)}&limit=20`;
        } else {
            endpoint = '/api/stats/by-emcee?limit=20';
        }
    }

    const data = await fetchAPI(endpoint);
    if (!data) {
        grid.innerHTML = '<div class="loading">Error loading stats</div>';
        return;
    }

    // Handle emcee rankings (by-emcee tab without specific emcee selected)
    if (data.emcees && currentStatsTab === 'by-emcee' && !document.getElementById('emceeStatsFilter').value) {
        grid.innerHTML = data.emcees.map((emcee, idx) => `
            <div class="emcee-card" style="cursor: default;">
                <div class="emcee-info" style="text-align: center;">
                    <h3>#${idx + 1} ${emcee.name}</h3>
                    <p class="hometown">Total Views: ${formatNumber(emcee.total_views)}</p>
                </div>
            </div>
        `).join('');
        return;
    }

    // Handle videos
    const videos = data.videos || [];
    if (!videos.length) {
        grid.innerHTML = '<div class="loading">No data found</div>';
        return;
    }

    renderVideos(videos, 'statsVideosGrid');
}

// Reusable render function
function renderVideos(videos, gridId) {
    const grid = document.getElementById(gridId);
    if (!videos.length) {
        grid.innerHTML = '<div class="loading">No videos found</div>';
        return;
    }

    grid.innerHTML = videos.map(video => `
        <div class="video-card">
            <div class="thumbnail" onclick="window.open('${video.url}', '_blank')">
                <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/300x170?text=No+Thumbnail'">
                <div class="play-btn">▶</div>
            </div>
            <div class="video-info">
                <h4>${video.title}</h4>
                <div class="video-stats">
                    <span>👁 ${formatNumber(video.views)}</span>
                    <span>👍 ${formatNumber(video.likes)}</span>
                    <span>💬 ${formatNumber(video.comments)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Debounce search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize
async function init() {
    await loadStats();
    await loadDivisions();
    await loadEmcees();

    // Event listeners
    document.querySelectorAll('nav button').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    document.getElementById('searchInput').addEventListener('input', debounce((e) => {
        currentSearch = e.target.value;
        if (currentView === 'emcees') {
            loadEmcees();
        } else {
            loadVideos();
        }
    }, 500));

    document.getElementById('divisionFilter').addEventListener('change', (e) => {
        currentDivision = e.target.value;
        loadEmcees();
    });

    // Close modal on outside click
    document.getElementById('emceeModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });

    // Close modal on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Stats tab event listeners
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatsTab = tab.dataset.tab;

            // Show/hide appropriate filters
            document.getElementById('yearFilter').parentElement.style.display = currentStatsTab === 'by-year' ? 'block' : 'none';
            document.getElementById('divisionStatsFilter').parentElement.style.display = currentStatsTab === 'by-division' ? 'block' : 'none';
            document.getElementById('emceeStatsFilter').parentElement.style.display = currentStatsTab === 'by-emcee' ? 'block' : 'none';

            loadStatsData();
        });
    });

    // Stats filter listeners
    document.getElementById('yearFilter').addEventListener('change', loadStatsData);
    document.getElementById('divisionStatsFilter').addEventListener('change', loadStatsData);
    document.getElementById('emceeStatsFilter').addEventListener('change', loadStatsData);
}

// Start app
init();
