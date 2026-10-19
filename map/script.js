const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZzeCpaIBjvJ3mxpIOM6fy1DbU8QrjJh9RvvVfmK54IlQZJxTIGUpjFZr3354uDI1t24DP7GKqg5AQ/pub?gid=0&single=true&output=csv';

let listData = [], filteredData = [], selectedIndex = null, plottedPoints = [];
let scale = 0.5, offsetX = 0, offsetY = 0, isDragging = false, startX, startY;
const canvas = document.getElementById('mapCanvas'), ctx = canvas.getContext('2d');

async function loadSpreadsheetData() {
    try {
        const res = await fetch(spreadsheetUrl), text = await res.text();
        listData = text.split('\n').slice(1).map((row, i) => {
            const col = row.split(','); if (col.length < 4) return null;
            
            const fullMemo = col.slice(3).join('、'); 

            return { 
                id: i, 
                category: col[0] ? col[0].trim() : '', 
                name: col[1] ? col[1].trim() : '', 
                coords: col[2] ? col[2].trim() : '', 
                memo: fullMemo ? fullMemo.trim() : ''
            };
        }).filter(item => item && item.name);
        filterAndRender();
    } catch (e) { document.getElementById('listContainer').innerHTML = '<li>読み込み失敗。URLを確認してください。</li>'; }
}

function parseCoordinates(str) {
    if (!str) return { x: null, z: null };
    const numbers = str.match(/-?\d+/g);
    if (numbers && numbers.length >= 2) {
        if (numbers.length >= 3) return { x: parseInt(numbers[0], 10), z: parseInt(numbers[2], 10) };
        return { x: parseInt(numbers[0], 10), z: parseInt(numbers[1], 10) };
    }
    return { x: null, z: null };
}

function drawMap() {
    const w = canvas.width, h = canvas.height, cx = w / 2 + offsetX, cy = h / 2 + offsetY;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.strokeStyle = '#ff4444'; ctx.beginPath(); ctx.moveTo(cx-5, cy-5); ctx.lineTo(cx+5, cy+5); ctx.moveTo(cx+5, cy-5); ctx.lineTo(cx-5, cy+5); ctx.stroke();

    plottedPoints = [];
    filteredData.forEach(item => {
        const pos = parseCoordinates(item.coords); if (pos.x === null || pos.z === null) return;
        
        const px = cx + ((pos.x / 5000) * (w / 2)) * scale, py = cy + ((pos.z / 5000) * (h / 2)) * scale;
        const sel = (selectedIndex === item.id); plottedPoints.push({ id: item.id, x: px, y: py });
        if (px < 0 || px > w || py < 0 || py > h) return;

        if (item.category === '拠点' || item.category.includes('拠点')) ctx.fillStyle = '#ea4335'; 
        else if (item.category === '構造物') ctx.fillStyle = '#1a73e8'; 
        else if (item.category === 'バイオーム') ctx.fillStyle = '#34a853'; 
        else ctx.fillStyle = '#888888'; 

        ctx.beginPath(); ctx.arc(px, py, sel ? 9 : 5, 0, Math.PI * 2); ctx.fill();
        
        if (sel) { 
            ctx.strokeStyle = '#ffbe0b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.stroke(); 
            ctx.fillStyle = '#ffbe0b'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(item.name, px + 14, py + 3);
        } else if (scale > 2.0) {

            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.font = '9px sans-serif'; ctx.fillText(item.name, px + 8, py + 3);
        }
    });

    ctx.fillStyle = '#888'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('N (-Z)', w / 2, 15); ctx.fillText('S (+Z)', w / 2, h - 8);
    ctx.textAlign = 'left'; ctx.fillText('W (-X)', 8, h / 2 - 4);
    ctx.textAlign = 'right'; ctx.fillText('E (+X)', w - 8, h / 2 - 4); ctx.textAlign = 'left';
}


function updatePopup(item) {
    const el = document.getElementById('infoPopup'); if (!item) { el.style.display = 'none'; return; }
    el.innerHTML = `<strong>📍 ${item.name}</strong> (${item.category})<br>座標: ${item.coords}<br>メモ: ${item.memo || 'なし'}`;
    el.style.display = 'block';
}

function renderList() {
    const con = document.getElementById('listContainer'); con.innerHTML = '';
    filteredData.forEach(item => {
        const li = document.createElement('li'), c = item.category;
        li.className = `location-item ${selectedIndex === item.id ? 'selected' : ''}`;
        
        let bgClass = 'base';
        if (c.includes('構造物')) bgClass = 'structure';
        else if (c.includes('バイオーム')) bgClass = 'biome';
        else if (c.includes('拠点')) bgClass = 'base';
        
        li.innerHTML = `<span class="badge ${bgClass}">${c}</span><span class="name">${item.name}</span><span class="coords">${item.coords}</span>`;
        li.addEventListener('click', () => { 
            selectedIndex = (selectedIndex === item.id) ? null : item.id; 
            updatePopup(selectedIndex ? item : null); 
            if(selectedIndex) window.scrollTo({top:0, behavior:'smooth'}); 
            renderList(); drawMap(); 
        });
        con.appendChild(li);
    });
}


function filterAndRender() {
    const txt = document.getElementById('searchInput').value.toLowerCase(), cat = document.getElementById('categoryFilter').value;
    filteredData = listData.filter(item => (item.name.toLowerCase().includes(txt) || item.memo.toLowerCase().includes(txt)) && (cat === 'all' || item.category === cat));
    renderList(); drawMap();
}

canvas.addEventListener('mousedown', e => { isDragging = true; startX = e.offsetX - offsetX; startY = e.offsetY - offsetY; });
canvas.addEventListener('mousemove', e => { if (!isDragging) return; offsetX = e.offsetX - startX; offsetY = e.offsetY - startY; drawMap(); });
window.addEventListener('mouseup', () => isDragging = false);

canvas.addEventListener('click', e => {
    const pt = plottedPoints.find(p => Math.sqrt((e.offsetX - p.x)**2 + (e.offsetY - p.y)**2) < 12);
    selectedIndex = pt ? (selectedIndex === pt.id ? null : pt.id) : null;
    updatePopup(selectedIndex ? listData.find(i => i.id === selectedIndex) : null); renderList(); drawMap();
});

canvas.addEventListener('wheel', e => { e.preventDefault(); scale = Math.max(0.01, Math.min(e.deltaY < 0 ? scale * 1.1 : scale / 1.1, 50)); drawMap(); }, { passive: false });
document.getElementById('searchInput').addEventListener('input', () => { selectedIndex = null; updatePopup(null); filterAndRender(); });
document.getElementById('categoryFilter').addEventListener('change', () => { selectedIndex = null; updatePopup(null); filterAndRender(); });

loadSpreadsheetData();