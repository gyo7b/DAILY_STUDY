/**
 * posts.js — Lógica e Renderização dos Posts
 * Responsável por criar, editar, excluir e renderizar postagens no feed.
 */

const Posts = (() => {
  // ID do post sendo editado no momento
  let _editingPostId = null;

  // =============================================
  // Helpers de formatação
  // =============================================

  /**
   * Formata uma data ISO para exibição amigável.
   * Ex: "Hoje às 14:32" ou "15 de jan. às 09:00"
   */
  function formatDate(isoString) {
    const date  = new Date(isoString);
    const now   = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time  = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoje às ${time}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Ontem às ${time}`;

    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) + ` às ${time}`;
  }

  /**
   * Gera as iniciais do nome do usuário para o avatar.
   * Ex: "João da Silva" → "JS"
   */
  function getInitials(name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // =============================================
  // Renderização
  // =============================================

  /**
   * Cria o elemento HTML de um único post.
   * @param {Object} post   — objeto do post
   * @param {string} initials — iniciais do autor
   */
  function createPostElement(post, initials) {
    const article = document.createElement('article');
    article.className = 'post-card';
    article.dataset.id = post.id;

    article.innerHTML = `
      <div class="post-card__header">
        <div class="post-avatar">${initials}</div>
        <div class="post-meta">
          <div class="post-author" data-author></div>
          <div class="post-date">${formatDate(post.createdAt)}</div>
        </div>
        <div class="post-actions">
          <button class="post-action-btn edit"   data-action="edit"   aria-label="Editar post">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="post-action-btn delete" data-action="delete" aria-label="Excluir post">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="post-card__body">${escapeHTML(post.text)}</div>
      ${post.editedAt ? `<p class="post-edited-tag">editado ${formatDate(post.editedAt)}</p>` : ''}
    `;

    // Preenche o nome do autor dinamicamente (pega do perfil)
    const authorEl = article.querySelector('[data-author]');
    authorEl.textContent = Profile.get().name;

    // Delegação de eventos nos botões
    article.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'edit')   openEditModal(post.id, post.text);
      if (action === 'delete') handleDelete(post.id);
    });

    return article;
  }

  /**
   * Escapa HTML para evitar XSS ao exibir texto do usuário.
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Renderiza todos os posts no feed principal.
   */
  function renderFeed() {
    const feedEl      = document.getElementById('postsFeed');
    const emptyEl     = document.getElementById('emptyState');
    const countEl     = document.getElementById('postCount');
    const posts       = Storage.getPosts();
    const { name }    = Profile.get();
    const initials    = getInitials(name);

    feedEl.innerHTML = '';

    if (posts.length === 0) {
      emptyEl.classList.remove('hidden');
      countEl.textContent = '0 postagens';
      return;
    }

    emptyEl.classList.add('hidden');
    countEl.textContent = `${posts.length} postage${posts.length > 1 ? 'ns' : 'm'}`;

    posts.forEach(post => {
      feedEl.appendChild(createPostElement(post, initials));
    });
  }

  /**
   * Renderiza os posts do usuário na aba de perfil.
   */
  function renderProfilePosts() {
    const container = document.getElementById('profilePostsFeed');
    const emptyEl   = document.getElementById('profileEmptyState');
    const posts     = Storage.getPosts();
    const { name }  = Profile.get();
    const initials  = getInitials(name);

    container.innerHTML = '';

    if (posts.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    posts.forEach(post => {
      container.appendChild(createPostElement(post, initials));
    });
  }

  // =============================================
  // Handlers de Ações
  // =============================================

  /** Publica um novo post */
  function handlePublish() {
    const input = document.getElementById('postInput');
    const text  = input.value.trim();
    if (!text) return;

    Storage.addPost(text);
    input.value = '';
    updateCharCounter('charCounter', 'postInput', 500);

    renderFeed();
    updateStats();
    UI.showToast('Postagem publicada! 🎉', 'success');

    // Scroll suave para o topo do feed
    document.getElementById('postsFeed').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Abre o modal de edição */
  function openEditModal(postId, currentText) {
    _editingPostId = postId;
    const input = document.getElementById('editPostInput');
    input.value = currentText;
    updateCharCounter('editCharCounter', 'editPostInput', 500);
    UI.openModal();
    input.focus();
  }

  /** Salva a edição do post */
  function handleSaveEdit() {
    if (!_editingPostId) return;
    const input   = document.getElementById('editPostInput');
    const newText = input.value.trim();
    if (!newText) return;

    Storage.editPost(_editingPostId, newText);
    _editingPostId = null;
    UI.closeModal();
    renderFeed();
    renderProfilePosts();
    UI.showToast('Postagem atualizada!', 'success');
  }

  /** Exclui um post com confirmação */
  function handleDelete(postId) {
    if (!confirm('Tem certeza que deseja excluir esta postagem?')) return;
    Storage.deletePost(postId);
    renderFeed();
    renderProfilePosts();
    updateStats();
    UI.showToast('Postagem excluída.', 'error');
  }

  // =============================================
  // Char Counter
  // =============================================

  /**
   * Atualiza o contador de caracteres de um textarea.
   * @param {string} counterId  — id do elemento do contador
   * @param {string} inputId    — id do textarea
   * @param {number} maxLength  — máximo de caracteres
   */
  function updateCharCounter(counterId, inputId, maxLength) {
    const counter = document.getElementById(counterId);
    const input   = document.getElementById(inputId);
    const remaining = maxLength - input.value.length;

    counter.textContent = `${remaining} caractere${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`;
    counter.className   = 'char-counter';

    if (remaining <= 50)  counter.classList.add('warning');
    if (remaining <= 20)  counter.classList.add('danger');
  }

  /** Atualiza os contadores de estatísticas do perfil */
  function updateStats() {
    const posts = Storage.getPosts();
    document.getElementById('statPosts').textContent = posts.length;

    // Dias únicos com postagem
    const days = new Set(posts.map(p => new Date(p.createdAt).toDateString()));
    document.getElementById('statDays').textContent = days.size;
  }

  // API pública do módulo
  return {
    renderFeed,
    renderProfilePosts,
    handlePublish,
    handleSaveEdit,
    openEditModal,
    updateCharCounter,
    updateStats,
    getInitials,
  };
})();
