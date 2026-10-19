const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwTTyp_uIbeXk-8-G-C4868GhQFN1h5fluFXwCQqTotKA9Nt968OsfDeHAlJe0liBC/exec';
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('corkboardContainer');
    if (container) {
        loadPosts();
        const bbsForm = document.getElementById('bbsForm');
        if (bbsForm) bbsForm.addEventListener('submit', handleFormSubmit);
    }
});
function openModal() {
    const modal = document.getElementById('formModal');
    if (modal) modal.classList.add('active');
}
function closeModal(event) {
    const modal = document.getElementById('formModal');
    if (!modal) return;
    if (!event || event.target === modal || event.target.classList.contains('close-modal-btn')) {
        modal.classList.remove('active');
    }
}
async function loadPosts() {
    const container = document.getElementById('corkboardContainer');
    if (!container) return;
    try {
        const response = await fetch(GAS_URL);
        const posts = await response.json();
        container.innerHTML = '';
        if (posts.length === 0) {
            container.innerHTML = '<p style="color: white; grid-column: 1/-1; text-align: center;"></p>';
            return;
        }
        posts.forEach(post => {
            const memo = document.createElement('div');
            memo.className = 'memo-pad';
            memo.innerHTML = `<div><div class="memo-to">To: ${escapeHtml(post.to)}</div><div class="memo-content">${escapeHtml(post.message)}</div></div><div><div class="memo-from">From: ${escapeHtml(post.author)}</div><div class="memo-date">${post.date}</div></div>`;
            container.appendChild(memo);
        });
    } catch (error) {
        console.error(error);
    }
}
async function handleFormSubmit(e) {
    e.preventDefault();
    const to = document.getElementById('postTo').value;
    const author = document.getElementById('postAuthor').value;
    const message = document.getElementById('postContent').value;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = '...';
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ to, author, message }) });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('postContent').value = '';
            closeModal();
            await loadPosts();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'ボードに貼る';
    }
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}