/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  posts.js — Módulo de Postagens                             ║
 * ║                                                              ║
 * ║  Responsável por:                                            ║
 * ║    • Renderizar o feed principal e o feed do perfil          ║
 * ║    • Criar novos posts (texto + imagem opcional)             ║
 * ║    • Abrir o modal de edição de texto                        ║
 * ║    • Confirmar e executar a exclusão de posts                ║
 * ║    • Atualizar contadores e estatísticas                     ║
 * ║    • Gerenciar o contador de caracteres da textarea          ║
 * ║                                                              ║
 * ║  Dependências (devem ser carregados antes):                  ║
 * ║    storage.js, profile.js                                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * @module Posts
 * @exports {Object} Posts — API pública
 */

const Posts = (() => {

  /**
   * ID do post atualmente aberto no modal de edição.
   * null quando o modal está fechado.
   * @type {string|null}
   */
  let _editingPostId = null;

  /**
   * Data URL da imagem selecionada no compose box.
   * null quando nenhuma imagem foi selecionada.
   * @type {string|null}
   */
  let _pendingImageUrl = null;


  // ═══════════════════════════════════════════
  // HELPERS DE FORMATAÇÃO
  // ═══════════════════════════════════════════

  /**
   * Formata uma string ISO 8601 para exibição amigável em português.
   * Regras:
   *   - Hoje:     "Hoje às 14:32"
   *   - Ontem:    "Ontem às 09:05"
   *   - Demais:   "15 de jan. às 09:00"
   *
   * @param  {string} isoString  Data no formato ISO (ex: "2024-01-15T14:32:00Z")
   * @returns {string}           Data formatada
   */
  function formatDate(isoString) {
    const date = new Date(isoString);
    const now  = new Date();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Compara apenas as datas (sem hora) convertendo para string
    const dateStr      = date.toDateString();
    const todayStr     = now.toDateString();
    const yesterday    = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (dateStr === todayStr)     return `Hoje às ${time}`;
    if (dateStr === yesterdayStr) return `Ontem às ${time}`;

    // Datas mais antigas: "15 de jan. às 09:00"
    return date.toLocaleDateString('pt-BR', {
      day:   'numeric',
      month: 'short',
    }) + ` às ${time}`;
  }

  /**
   * Previne XSS escapando caracteres especiais de HTML.
   * Sempre usar ao inserir texto do usuário no DOM via innerHTML.
   *
   * @param  {string} str  Texto não confiável
   * @returns {string}     Texto com entidades HTML escapadas
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }


  // ═══════════════════════════════════════════
  // RENDERIZAÇÃO DE CARDS
  // ═══════════════════════════════════════════

  /**
   * Cria e retorna o elemento HTML (<article>) de um único post.
   * Estrutura:
   *   article.post-card
   *     ├ .post-head (avatar + meta + botões de ação)
   *     ├ .post-text (texto escapado)
   *     ├ .post-image (se houver imagem)
   *     ├ .post-edited-tag (se editado)
   *     └ .post-footer (timestamp)
   *
   * Os event listeners de editar/excluir são adicionados aqui.
   *
   * @param  {PostObject} post  Objeto do post (ver storage.js para typedef)
   * @returns {HTMLElement}     Elemento <article> pronto para inserção
   */
  function createPostElement(post) {
    const profile  = Profile.get();
    const initials = Profile.getInitials(profile.name);

    const article = document.createElement('article');
    article.className   = 'post-card';
    article.dataset.id  = post.id;   // facilita seleções por ID

    // ── Cabeçalho ─────────────────────────────────
    const headHTML = `
      <div class="post-head">

        <!-- Avatar do autor -->
        <div class="post-ava" data-action="profile" title="Ver perfil">
          ${profile.avatarUrl
            ? `<img src="${profile.avatarUrl}" alt="Foto de ${escapeHTML(profile.name)}"/>`
            : escapeHTML(initials)
          }
        </div>

        <!-- Meta: nome + data -->
        <div class="post-meta">
          <div class="post-author">${escapeHTML(profile.name)}</div>
          <div class="post-date">${formatDate(post.createdAt)}</div>
        </div>

        <!-- Botões de ação (visíveis no hover via CSS) -->
        <div class="post-actions" role="group" aria-label="Ações do post">

          <!-- Editar: abre o modal de edição de texto -->
          <button
            class="pa-btn"
            data-action="edit"
            title="Editar postagem"
            aria-label="Editar postagem"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>

          <!-- Excluir: pede confirmação antes de apagar -->
          <button
            class="pa-btn del"
            data-action="delete"
            title="Excluir postagem"
            aria-label="Excluir postagem"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>

        </div><!-- /post-actions -->
      </div><!-- /post-head -->
    `;

    // ── Texto ──────────────────────────────────────
    // escapeHTML previne XSS; white-space:pre-wrap preserva quebras
    const textHTML = `<p class="post-text">${escapeHTML(post.text)}</p>`;

    // ── Imagem (opcional) ──────────────────────────
    // A imagem é clicável para abrir o lightbox
    const imageHTML = post.image
      ? `<div class="post-image">
           <img
             src="${post.image}"
             alt="Imagem da postagem"
             data-action="lightbox"
             title="Clique para ampliar"
             loading="lazy"
           />
         </div>`
      : '';

    // ── Tag de editado (opcional) ──────────────────
    const editedHTML = post.editedAt
      ? `<p class="post-edited-tag">editado ${formatDate(post.editedAt)}</p>`
      : '';

    // ── Rodapé com timestamp ───────────────────────
    const footerHTML = `
      <div class="post-footer">
        <time class="post-ts" datetime="${post.createdAt}">
          ${new Date(post.createdAt).toLocaleString('pt-BR', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </time>
      </div>
    `;

    // Monta o HTML completo do card
    article.innerHTML = headHTML + textHTML + imageHTML + editedHTML + footerHTML;

    // ── Event listeners via delegação ─────────────
    // Um único listener no card captura cliques em todos os filhos.
    // Identifica a ação pelo atributo data-action do elemento clicado.
    article.addEventListener('click', e => {
      const btn    = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;

      switch (action) {
        case 'edit':
          // Abre o modal com o texto atual do post
          openEditModal(post.id, post.text);
          break;

        case 'delete':
          // Pede confirmação antes de apagar (não há desfazer)
          handleDelete(post.id);
          break;

        case 'lightbox':
          // Abre a imagem em tela cheia
          UI.openLightbox(post.image);
          break;

        case 'profile':
          // Navega para a aba de perfil
          UI.activateTab('profile');
          break;
      }
    });

    return article;
  }


  // ═══════════════════════════════════════════
  // RENDERIZAÇÃO DE FEEDS
  // ═══════════════════════════════════════════

  /**
   * Renderiza (ou re-renderiza) o feed principal.
   * Limpa o container e reinserido todos os posts.
   * Também atualiza o badge de contagem.
   *
   * Chamada em: inicialização, após publicar, editar ou excluir.
   */
  function renderFeed() {
    const feedEl   = document.getElementById('feedList');
    const emptyEl  = document.getElementById('feedEmpty');
    const badgeEl  = document.getElementById('postBadge');
    const posts    = Storage.getPosts();

    // Limpa o feed atual
    feedEl.innerHTML = '';

    if (posts.length === 0) {
      // Exibe estado vazio
      emptyEl.classList.remove('hidden');
      badgeEl.textContent = '0 posts';
      return;
    }

    emptyEl.classList.add('hidden');
    badgeEl.textContent = `${posts.length} post${posts.length !== 1 ? 's' : ''}`;

    // Insere os cards; CSS anima a entrada com stagger
    posts.forEach(post => {
      feedEl.appendChild(createPostElement(post));
    });
  }

  /**
   * Renderiza (ou re-renderiza) a lista de posts na aba de perfil.
   * Funciona exatamente como renderFeed, mas num container diferente.
   *
   * Chamada em: ativação da aba de perfil, após publicar/editar/excluir.
   */
  function renderProfilePosts() {
    const container = document.getElementById('profileFeed');
    const emptyEl   = document.getElementById('profileEmpty');
    const posts     = Storage.getPosts();

    container.innerHTML = '';

    if (posts.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    posts.forEach(post => {
      container.appendChild(createPostElement(post));
    });
  }

  /**
   * Atualiza os dois cards de estatísticas na aba de perfil.
   * - statPosts: total de posts
   * - statDays:  número de dias únicos com pelo menos um post
   */
  function updateStats() {
    const posts = Storage.getPosts();

    // Total de posts
    const statPostsEl = document.getElementById('statPosts');
    if (statPostsEl) statPostsEl.textContent = posts.length;

    // Dias únicos (converte createdAt para string de data e usa Set para deduplicar)
    const uniqueDays = new Set(
      posts.map(p => new Date(p.createdAt).toDateString())
    );
    const statDaysEl = document.getElementById('statDays');
    if (statDaysEl) statDaysEl.textContent = uniqueDays.size;
  }


  // ═══════════════════════════════════════════
  // AÇÕES DE POST
  // ═══════════════════════════════════════════

  /**
   * Publica um novo post.
   * Lê o texto da textarea e a imagem pendente (_pendingImageUrl).
   * Valida, salva, re-renderiza e limpa o compose.
   * Atalho: Ctrl+Enter / Cmd+Enter.
   */
  function handlePublish() {
    const input = document.getElementById('postInput');
    const text  = input.value.trim();

    if (!text) return;  // botão deveria estar disabled, mas verificamos mesmo assim

    try {
      // Salva no localStorage (imagem pode ser null)
      Storage.addPost(text, _pendingImageUrl);

      // Limpa o compose box
      input.value = '';
      clearPendingImage();
      updateCharCounter('charCount', input, 500);
      document.getElementById('btnPost').disabled = true;

      // Atualiza a UI
      renderFeed();
      updateStats();

      UI.showToast('Postagem publicada! 🎉', 'ok');

      // Scroll suave para o início do feed para ver o novo post
      document.getElementById('feedList').scrollIntoView({
        behavior: 'smooth',
        block:    'start',
      });

    } catch (err) {
      // Pode ser quota exceeded (imagem muito grande)
      UI.showToast(err.message, 'err');
    }
  }

  /**
   * Abre o modal de edição preenchido com o texto atual do post.
   * Armazena o ID do post em _editingPostId para uso no save.
   *
   * @param {string} postId      ID do post
   * @param {string} currentText Texto atual do post
   */
  function openEditModal(postId, currentText) {
    _editingPostId = postId;
    const ta = document.getElementById('editTa');
    ta.value = currentText;
    updateCharCounter('editCount', ta, 500);
    UI.openModal();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length); // cursor no fim
  }

  /**
   * Salva a edição do post aberto no modal.
   * Valida, atualiza no storage, fecha o modal e re-renderiza.
   */
  function handleSaveEdit() {
    if (!_editingPostId) return;

    const ta      = document.getElementById('editTa');
    const newText = ta.value.trim();

    if (!newText) {
      UI.showToast('O texto não pode estar vazio.', 'err');
      ta.focus();
      return;
    }

    Storage.editPost(_editingPostId, newText);
    _editingPostId = null;

    UI.closeModal();
    renderFeed();
    renderProfilePosts();

    UI.showToast('Postagem atualizada!', 'ok');
  }

  /**
   * Exibe confirmação e, se aceita, exclui o post.
   * Após excluir, re-renderiza o feed e as estatísticas.
   *
   * @param {string} postId  ID do post a excluir
   */
  function handleDelete(postId) {
    // Confirmação nativa (simples, sem depender de UI extra)
    if (!window.confirm('Deseja excluir esta postagem? Esta ação não pode ser desfeita.')) {
      return;
    }

    Storage.deletePost(postId);
    renderFeed();
    renderProfilePosts();
    updateStats();

    UI.showToast('Postagem excluída.', 'err');
  }


  // ═══════════════════════════════════════════
  // GESTÃO DE IMAGEM NO COMPOSE
  // ═══════════════════════════════════════════

  /**
   * Processa a imagem selecionada no <input id="imgInput">.
   * Converte para Base64, armazena em _pendingImageUrl
   * e exibe a prévia abaixo da textarea.
   *
   * @param {File} file  Arquivo de imagem selecionado
   */
  async function handleComposeImage(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      UI.showToast('Por favor, selecione apenas imagens.', 'err');
      return;
    }

    try {
      UI.showToast('Carregando imagem…');

      // Converte para Base64
      const dataUrl = await Profile.fileToDataUrl(file);
      _pendingImageUrl = dataUrl;

      // Mostra a prévia
      const previewEl = document.getElementById('composeImgPreview');
      const previewImg = document.getElementById('composePreviewImg');
      previewImg.src = dataUrl;
      previewEl.classList.remove('hidden');

      // Marca o botão de imagem como ativo
      document.querySelector('.img-tool-btn').classList.add('has-image');

      UI.showToast('Imagem pronta para publicar!', 'ok');

    } catch (err) {
      console.error('[Posts] Erro ao carregar imagem:', err);
      UI.showToast('Erro ao carregar a imagem.', 'err');
    }
  }

  /**
   * Remove a imagem pendente do compose box.
   * Limpa a prévia, reseta o input file e a variável interna.
   */
  function clearPendingImage() {
    _pendingImageUrl = null;

    // Esconde a prévia
    const previewEl = document.getElementById('composeImgPreview');
    if (previewEl) previewEl.classList.add('hidden');

    const previewImg = document.getElementById('composePreviewImg');
    if (previewImg) previewImg.src = '';

    // Reseta o input file (permite selecionar o mesmo arquivo de novo)
    const imgInput = document.getElementById('imgInput');
    if (imgInput) imgInput.value = '';

    // Remove o estado ativo do botão de imagem
    const imgToolBtn = document.querySelector('.img-tool-btn');
    if (imgToolBtn) imgToolBtn.classList.remove('has-image');
  }


  // ═══════════════════════════════════════════
  // CONTADOR DE CARACTERES
  // ═══════════════════════════════════════════

  /**
   * Atualiza o elemento de contador de caracteres para um textarea.
   * Adiciona classes CSS de aviso (.warn e .danger) conforme o limite.
   *
   * @param {string}      counterId  ID do elemento span do contador
   * @param {HTMLElement} inputEl    Elemento textarea
   * @param {number}      maxLength  Limite máximo de caracteres
   */
  function updateCharCounter(counterId, inputEl, maxLength) {
    const counterEl = document.getElementById(counterId);
    if (!counterEl || !inputEl) return;

    const remaining = maxLength - inputEl.value.length;
    counterEl.textContent = remaining;

    // Remove classes anteriores para recalcular
    counterEl.classList.remove('warn', 'danger');

    if (remaining <= 20)  counterEl.classList.add('danger');
    else if (remaining <= 80) counterEl.classList.add('warn');
  }


  // ─────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────
  return {
    renderFeed,
    renderProfilePosts,
    updateStats,
    handlePublish,
    openEditModal,
    handleSaveEdit,
    handleDelete,
    handleComposeImage,
    clearPendingImage,
    updateCharCounter,
  };

})();
