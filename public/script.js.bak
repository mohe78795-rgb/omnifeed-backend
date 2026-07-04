const API = window.location.origin;
let state = {
    categories: [], prods: [], cart: [], games: [],
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null
};

let videoPlayer;

// --- 1. الفيديو ---
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            const vidUrl = ads[0].videoUrl;
            const vidId = vidUrl.includes('embed/') ? vidUrl.split('embed/')[1].split('?')[0] : vidUrl.split('v=')[1];
            if (!videoPlayer) {
                videoPlayer = new Plyr('#player', { controls: [], autoplay: true, muted: true, loop: { active: true } });
            }
            videoPlayer.source = { type: 'video', sources: [{ src: vidId, provider: 'youtube' }] };
            container.classList.remove('hidden');
        }
    } catch(e) { console.log("Ad Error"); }
}

function toggleMute() {
    if (videoPlayer) {
        videoPlayer.muted = !videoPlayer.muted;
        document.getElementById('mute-icon').className = videoPlayer.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
}

// --- 2. الألعاب ---
async function fetchGames() {
    try {
        const res = await fetch(`${API}/api/games`);
        const data = await res.json();
        if(data.success) {
            state.games = data.game_list;
            document.getElementById('games-list').innerHTML = state.games.map(g => `
                <div onclick="selectGame('${g.game_code}')" class="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center mb-3">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-gamepad text-emerald-500"></i>
                        <h4 class="font-bold">${g.game_name}</h4>
                    </div>
                    <i class="fas fa-chevron-left text-xs opacity-30"></i>
                </div>
            `).join('');
        }
    } catch(e) {}
}

function selectGame(code) {
    const g = state.games.find(x => x.game_code === code);
    document.getElementById('selected-game-title').innerText = g.game_name;
    document.getElementById('game-denoms-list').innerHTML = g.denominations.map(d => `
        <div class="p-3 bg-white/5 rounded-xl text-center border border-white/5">
            <p class="text-xs">${d.name}</p>
            <p class="text-emerald-400 font-bold">${d.price} YER</p>
        </div>
    `).join('');
    document.getElementById('game-topup-panel').classList.remove('hidden');
}

// --- 3. الحساب والفواتير ---
function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    document.getElementById('acc-avatar-large').innerText = state.user.name.charAt(0);
    document.getElementById('acc-name').innerText = state.user.name;
    document.getElementById('acc-phone').innerText = state.user.phone;
    document.getElementById('acc-date').innerText = state.user.joinDate || "2024";
}

async function loadOrders() {
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const orders = await res.json();
        document.getElementById('orders-list').innerHTML = orders.length ? orders.map(o => `
            <div class="p-4 bg-white/5 rounded-2xl border border-white/5 mb-3">
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-emerald-400 font-bold">${o.id}</span>
                    <span class="opacity-50">${o.status}</span>
                </div>
                <div class="text-[10px] opacity-40">${o.date}</div>
                <div class="mt-2 font-bold">${o.total.toLocaleString()} YER</div>
            </div>
        `).join('') : '<div class="text-center py-10 opacity-30">لا توجد فواتير</div>';
    } catch(e) {}
}

// --- 4. تشغيل التطبيق ---
async function unlockApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    ui(); fetchAds(); fetchGames(); initProducts(); fetchMessages();
}

async function initProducts() {
    state.categories = await (await fetch(`${API}/api/categories`)).json();
    state.prods = await (await fetch(`${API}/api/products`)).json();
    document.getElementById('categories-list').innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="card-glass p-4 bg-white/5 rounded-3xl border border-white/5 text-center">
            <img src="${c.img}" class="w-full h-24 object-cover rounded-2xl mb-2">
            <h3 class="text-[11px] font-black">${c.name}</h3>
        </div>`).join('');
}

async function handleAuth() {
    const isS = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value, phone = document.getElementById('auth-phone').value, pass = document.getElementById('auth-pass').value;
    const res = await fetch(`${API}/api/auth/${isS?'signup':'login'}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, phone, pass })
    });
    const d = await res.json();
    if(d.success) { state.user = d.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); unlockApp(); }
    else alert(d.message);
}

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');
    if(v === 'orders') loadOrders();
}

function logout() { localStorage.clear(); location.reload(); }
window.onload = () => { if(state.user) unlockApp(); else { document.getElementById('splash').classList.add('hidden'); document.getElementById('auth-screen').classList.remove('hidden'); } };
