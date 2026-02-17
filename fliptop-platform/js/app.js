// FlipTop Community Platform - Vanilla JS Frontend
const API_BASE = '/';

let currentView = 'emcees';
let currentStatsTab = 'by-year';
let emceesData = [];
let videosData = [];
let currentSearch = '';
let currentDivision = '';

// Format numbers
function formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Fetch API data
async function fetchAPI(endpoint) {
    try {
        const resp = await fetch(API_BASE + 'api/' + endpoint);
        return await resp.json();
    } catch(e) {
        console.error('API Error:', e);
        return null;
    }
}

// Load stats
async function loadStats() {
    const stats = await fetchAPI('stats');
    if (stats) {
        document.getElementById('totalEmcees').textContent = formatNumber(stats.total_emcees);
        document.getElementById('totalVideos').textContent = formatNumber(stats.total_videos);
        document.getElementById('totalViews').textContent = formatNumber(stats.total_views);
    }
}

// Load divisions
async function loadDivisions() {
    const data = await fetchAPI('divisions');
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

    let endpoint = 'emcees?limit=100';
    if (currentSearch) endpoint += '&search=' + encodeURIComponent(currentSearch);
    if (currentDivision) endpoint += '&division=' + encodeURIComponent(currentDivision);

    const data = await fetchAPI(endpoint);
    if (data && data.emcees) {
        emceesData = data.emcees;
        renderEmcees(emceesData);
    } else {
        grid.innerHTML = '<div class="loading">Error loading emcees</div>';
    }
}

// Render emcees
function renderEmcees(emcees) {
    const grid = document.getElementById('emceesGrid');
    if (!emcees.length) {
        grid.innerHTML = '<div class="loading">No emcees found</div>';
        return;
    }

    grid.innerHTML = emcees.map(emcee => `
        <div class="emcee-card" onclick="openEmceeModal(${emcee.id})">
            <img src="${emcee.profile_picture || 'https://via.placeholder.com/200x200?text=No+Image'}" alt="${emcee.name}" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
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

    let endpoint = 'videos?limit=50&sort=views';
    if (currentSearch) endpoint += '&search=' + encodeURIComponent(currentSearch);

    const data = await fetchAPI(endpoint);
    if (data && data.videos) {
        videosData = data.videos;
        renderVideos(videosData);
    } else {
        grid.innerHTML = '<div class="loading">Error loading videos</div>';
    }
}

// Render videos
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
    const data = await fetchAPI('emcees/' + id);
    if (!data || data.error) return;

    document.getElementById('modalProfileImg').src = data.profile_picture || 'https://via.placeholder.com/400x250?text=No+Image';
    document.getElementById('modalName').textContent = data.name;
    document.getElementById('modalHometown').textContent = data.hometown || '';

    const tagsContainer = document.getElementById('modalTags');
    tagsContainer.innerHTML = '';
    if (data.division) tagsContainer.innerHTML += `<span class="tag">${data.division}</span>`;
    if (data.year_joined) tagsContainer.innerHTML += `<span class="tag">Since ${data.year_joined}</span>`;
    if (data.reppin) tagsContainer.innerHTML += `<span class="tag">${data.reppin}</span>`;

    document.getElementById('modalDescription').textContent = data.description || 'No description available.';

    const accContainer = document.getElementById('modalAccomplishments');
    accContainer.innerHTML = data.accomplishments ? `<h4>🏆 Accomplishments</h4><p>${data.accomplishments}</p>` : '';

    const socialContainer = document.getElementById('modalSocial');
    socialContainer.innerHTML = '';
    if (data.facebook) socialContainer.innerHTML += `<a href="${data.facebook}" target="_blank">📘 Facebook</a>`;
    if (data.twitter) socialContainer.innerHTML += `<a href="${data.twitter}" target="_blank">𝕏 Twitter</a>`;
    if (data.instagram) socialContainer.innerHTML += `<a href="${data.instagram}" target="_blank">📸 Instagram</a>`;
    if (data.youtube) socialContainer.innerHTML += `<a href="${data.youtube}" target="_blank">▶️ YouTube</a>`;

    const battlesContainer = document.getElementById('modalBattles');
    if (data.latest_battles && data.latest_battles.length) {
        battlesContainer.innerHTML = data.latest_battles.map(b => `<div class="battle-item">${b.title}</div>`).join('');
    } else {
        battlesContainer.innerHTML = '<div class="battle-item">No recent battles</div>';
    }

    document.getElementById('emceeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

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

// Stats view
async function loadStatsView() {
    // Load years
    const yearsData = await fetchAPI('stats/by-year?limit=1');
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
    const divisionsData = await fetchAPI('divisions');
    if (divisionsData && divisionsData.divisions) {
        const divSelect = document.getElementById('divisionStatsFilter');
        divSelect.innerHTML = '<option value="">All Divisions</option>';
        divisionsData.divisions.forEach(div => {
            const option = document.createElement('option');
            option.value = div;
            option.textContent = div;
            divSelect.appendChild(option);
        });
    }

    // Load emcees
    const emceesData = await fetchAPI('emcees?limit=200');
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
        endpoint = 'stats/by-year?limit=20' + (year ? '&year=' + year : '');
    } else if (currentStatsTab === 'by-division') {
        const division = document.getElementById('divisionStatsFilter').value;
        const year = document.getElementById('yearFilter').value;
        endpoint = 'stats/by-division?limit=20' + (division ? '&division=' + encodeURIComponent(division) : '') + (year ? '&year=' + year : '');
    } else if (currentStatsTab === 'by-emcee') {
        const emcee = document.getElementById('emceeStatsFilter').value;
        const year = document.getElementById('yearFilter').value;
        endpoint = 'stats/by-emcee?limit=20' + (emcee ? '&emcee=' + encodeURIComponent(emcee) : '') + (year ? '&year=' + year : '');
    }

    const data = await fetchAPI(endpoint);
    if (!data) {
        grid.innerHTML = '<div class="loading">Error loading stats</div>';
        return;
    }

    if (data.emcees) {
        // Emcee rankings
        grid.innerHTML = data.emcees.map((emcee, idx) => `
            <div class="emcee-card" style="cursor: default;">
                <div class="emcee-info" style="text-align: center;">
                    <h3>#${idx + 1} ${emcee.name}</h3>
                    <p class="hometown">Total Views: ${formatNumber(emcee.total_views)}</p>
                </div>
            </div>
        `).join('');
    } else if (data.videos) {
        renderStatsVideos(data.videos);
    } else {
        grid.innerHTML = '<div class="loading">No data found</div>';
    }
}

function renderStatsVideos(videos) {
    const grid = document.getElementById('statsVideosGrid');
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
                </div>
            </div>
        </div>
    `).join('');
}

// Debounce
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Start app
async function init() {
    await loadStats();
    await loadDivisions();
    await loadEmcees();

    document.querySelectorAll('nav button').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    document.getElementById('searchInput').addEventListener('input', debounce((e) => {
        currentSearch = e.target.value;
        if (currentView === 'emcees') loadEmcees();
        else loadVideos();
    }, 500));

    document.getElementById('divisionFilter').addEventListener('change', (e) => {
        currentDivision = e.target.value;
        loadEmcees();
    });

    document.getElementById('emceeModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Stats tabs
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatsTab = tab.dataset.tab;
            loadStatsData();
        });
    });

    document.getElementById('yearFilter').addEventListener('change', loadStatsData);
    document.getElementById('divisionStatsFilter').addEventListener('change', loadStatsData);
    document.getElementById('emceeStatsFilter').addEventListener('change', loadStatsData);\n    document.getElementById('divisionStatsFilter').addEventListener('change', loadStatsData);
}

init();
