/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  app.js — Ponto de Entrada v3.0                             ║
 * ║                                                              ║
 * ║  NOVIDADES nesta versão:                                     ║
 * ║    + Seção 10: Campo de busca inline no feed                ║
 * ║    + Seção 11: Aba de busca (search tab)                    ║
 * ║    + Chips de sugestão de busca                             ║
 * ║    + Botões ✕ para limpar busca                             ║
 * ║    + Atualiza UI do campo de busca (has-value)              ║
 * ║                                                              ║
 * ║  Ordem de carregamento obrigatória:                          ║
 * ║    storage → profile → posts → ui → search → app           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════
  // 1. INICIALIZAÇÃO
  // ═══════════════════════════════════════════
  Profile.syncUI();
  Posts.renderFeed();
  Posts.updateStats();


  // ═══════════════════════════════════════════
  // 2. NAVEGAÇÃO ENTRE ABAS
  // ═══════════════════════════════════════════
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.activateTab(btn.dataset.tab);
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        UI.activateTab(btn.dataset.tab);
      }
    });
  });

  document.getElementById('composeAva').addEventListener('click', () => {
    UI.activateTab('profile');
  });


  // ═══════════════════════════════════════════
  // 3. COMPOSE BOX — CRIAR POST
  // ═══════════════════════════════════════════
  const postInput = document.getElementById('postInput');
  const btnPost   = document.getElementById('btnPost');

  postInput.addEventListener('input', () => {
    Posts.updateCharCounter('charCount', postInput, 500);
    btnPost.disabled = postInput.value.trim().length === 0;
  });

  postInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!btnPost.disabled) Posts.handlePublish();
    }
  });

  btnPost.addEventListener('click', () => Posts.handlePublish());


  // ═══════════════════════════════════════════
  // 4. UPLOAD DE IMAGEM NO COMPOSE
  // ═══════════════════════════════════════════
  document.getElementById('imgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) Posts.handleComposeImage(file);
  });

  document.getElementById('removeImgBtn').addEventListener('click', () => {
    Posts.clearPendingImage();
  });


  // ═══════════════════════════════════════════
  // 5. MODAL DE EDIÇÃO DE POST
  // ═══════════════════════════════════════════
  const editTa = document.getElementById('editTa');

  editTa.addEventListener('input', () => {
    Posts.updateCharCounter('editCount', editTa, 500);
  });

  editTa.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      Posts.handleSaveEdit();
    }
  });

  document.getElementById('modalSaveBtn').addEventListener('click',   () => Posts.handleSaveEdit());
  document.getElementById('modalCancelBtn').addEventListener('click', () => UI.closeModal());
  document.getElementById('modalCloseBtn').addEventListener('click',  () => UI.closeModal());

  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) UI.closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      UI.closeModal();
      UI.closeLightbox();
    }
  });


  // ═══════════════════════════════════════════
  // 6. LIGHTBOX DE IMAGEM
  // ═══════════════════════════════════════════
  document.getElementById('lightboxClose').addEventListener('click', () => UI.closeLightbox());

  document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox')) UI.closeLightbox();
  });


  // ═══════════════════════════════════════════
  // 7. PERFIL — FORMULÁRIO DE EDIÇÃO
  // ═══════════════════════════════════════════
  document.getElementById('btnEditP').addEventListener('click',     () => Profile.openEditForm());
  document.getElementById('btnCancelEdit').addEventListener('click', () => Profile.closeEditForm());
  document.getElementById('btnSaveEdit').addEventListener('click',   () => Profile.saveEditForm());

  document.getElementById('eName').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); Profile.saveEditForm(); }
  });


  // ═══════════════════════════════════════════
  // 8. PERFIL — UPLOAD DE AVATAR
  // ═══════════════════════════════════════════
  document.getElementById('profileAvaBig').addEventListener('click', () => {
    document.getElementById('avatarInput').click();
  });

  document.getElementById('profileAvaBig').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('avatarInput').click();
    }
  });

  document.getElementById('avatarInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) Profile.handleImageUpload(file, 'avatar');
    e.target.value = '';
  });


  // ═══════════════════════════════════════════
  // 9. PERFIL — UPLOAD DE BANNER + DRAG & DROP
  // ═══════════════════════════════════════════
  document.getElementById('bannerZone').addEventListener('click', e => {
    if (e.target.tagName !== 'INPUT') document.getElementById('bannerInput').click();
  });

  document.getElementById('bannerZone').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('bannerInput').click();
    }
  });

  document.getElementById('bannerInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) Profile.handleImageUpload(file, 'banner');
    e.target.value = '';
  });

  const bannerZone = document.getElementById('bannerZone');
  bannerZone.addEventListener('dragover',  e => { e.preventDefault(); bannerZone.classList.add('drag-over'); });
  bannerZone.addEventListener('dragleave', ()  => bannerZone.classList.remove('drag-over'));
  bannerZone.addEventListener('drop', e => {
    e.preventDefault();
    bannerZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) Profile.handleImageUpload(file, 'banner');
    else if (file) UI.showToast('Por favor, solte apenas imagens.', 'err');
  });


  // ═══════════════════════════════════════════
  // 10. BUSCA INLINE NO FEED
  //
  // CONCEITO: filtro em tempo real
  // ─────────────────────────────────────────
  // O campo de busca do feed usa o módulo Search para filtrar
  // posts. O resultado é exibido no próprio feedList, substituindo
  // temporariamente o feed normal.
  //
  // Quando a busca está ativa:
  //   • O compose é OCULTADO (você não quer criar posts enquanto busca)
  //   • O feedList mostra só os posts filtrados
  //   • O contador mostra quantos foram encontrados
  //
  // Quando a busca é limpa:
  //   • O compose é RESTAURADO
  //   • O feedList volta a mostrar todos os posts
  // ═══════════════════════════════════════════

  const feedSearchInput = document.getElementById('feedSearchInput');
  const feedSearchBox   = document.getElementById('feedSearchBox');
  const feedSearchClear = document.getElementById('feedSearchClear');

  /**
   * Atualiza o estado visual do campo de busca do feed.
   * A classe .has-value controla a visibilidade do botão ✕.
   *
   * @param {boolean} hasValue  true se o campo tem texto
   */
  function updateFeedSearchUI(hasValue) {
    feedSearchBox.classList.toggle('has-value', hasValue);
  }

  feedSearchInput.addEventListener('input', () => {
    const query = feedSearchInput.value;
    updateFeedSearchUI(query.length > 0);

    if (query.trim()) {
      // ── Busca ativa: oculta compose, filtra posts ──
      document.getElementById('compose').classList.add('hidden');

      // Usa debounce interno do Search para não buscar a cada tecla
      Search.handleSearchInput(query);

      // Renderiza resultados filtrados no feedList
      renderFeedSearchResults(query);

    } else {
      // ── Busca vazia: restaura o feed normal ────────
      document.getElementById('compose').classList.remove('hidden');
      document.getElementById('feedSearchCount').classList.add('hidden');
      Posts.renderFeed();   // restaura todos os posts
    }
  });

  /**
   * Renderiza no feedList apenas os posts que batem com a query.
   * Reutiliza createPostElement de posts.js — nada de código duplicado.
   *
   * Este é o ponto onde você vê na prática o poder da separação:
   * - Search.searchPosts() faz a busca (lógica)
   * - Posts.renderFeed() renderiza (apresentação)
   * Aqui apenas orquestramos os dois.
   *
   * @param {string} query  Texto buscado
   */
  function renderFeedSearchResults(query) {
    // Aguarda o debounce do Search terminar (~300ms)
    // Aqui usamos um timeout que espera o mesmo delay
    setTimeout(() => {
      const results   = Search.searchPosts(query);
      const feedEl    = document.getElementById('feedList');
      const emptyEl   = document.getElementById('feedEmpty');
      const countEl   = document.getElementById('feedSearchCount');

      feedEl.innerHTML = '';

      // Atualiza contador
      countEl.textContent = results.length === 0
        ? 'Nenhum post encontrado'
        : `${results.length} post${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`;
      countEl.classList.remove('hidden');

      if (results.length === 0) {
        emptyEl.classList.remove('hidden');
        emptyEl.querySelector('h3').textContent = 'Nenhum resultado';
        emptyEl.querySelector('p').textContent  = `Nenhum post contém "${query}".`;
        return;
      }

      emptyEl.classList.add('hidden');

      // Cria os cards normalmente — a função vem de posts.js
      // Isso evita duplicar código de renderização
      results.forEach(({ post }) => {
        // Cria o elemento via DOM (sem acesso direto à função interna)
        // Para ter highlight no feed, precisaríamos expor createPostElement —
        // por simplicidade, renderizamos sem highlight aqui.
        const tempFeed = document.createDocumentFragment();
        const fakeList = document.createElement('div');
        fakeList.className = 'feed-list';
        document.body.appendChild(fakeList);

        // Re-renderiza somente os posts filtrados
        const allPostEls = document.querySelectorAll(`[data-id]`);
        allPostEls.forEach(el => el.remove());

        // Usa Posts.renderFeed internamente com filtro via patch temporário
        // A solução mais limpa: expor um Posts.renderSubset(ids) no futuro
        fakeList.remove();
      });

      // Abordagem simples e funcional: re-renderiza todos e remove os que não batem
      Posts.renderFeed();
      const matchIds = new Set(results.map(r => r.post.id));
      document.querySelectorAll('#feedList [data-id]').forEach(el => {
        if (!matchIds.has(el.dataset.id)) el.remove();
      });

    }, 320); // 320ms > 300ms debounce = garante que a busca já terminou
  }

  /** Botão ✕ limpa a busca do feed */
  feedSearchClear.addEventListener('click', () => {
    feedSearchInput.value = '';
    updateFeedSearchUI(false);
    document.getElementById('compose').classList.remove('hidden');
    document.getElementById('feedSearchCount').classList.add('hidden');
    Posts.renderFeed();
    feedSearchInput.focus();
  });


  // ═══════════════════════════════════════════
  // 11. ABA DE BUSCA — campo principal
  //
  // CONCEITO: busca dedicada com resultados enriquecidos
  // ─────────────────────────────────────────
  // O campo da aba de busca mostra perfis E posts
  // com cards específicos para cada tipo.
  // É mais completo que o filtro inline do feed.
  // ═══════════════════════════════════════════

  const searchMainInput = document.getElementById('searchMainInput');
  const searchMainBox   = document.getElementById('searchMainBox');
  const searchMainClear = document.getElementById('searchMainClear');

  /**
   * Atualiza o estado visual do campo principal de busca.
   * @param {boolean} hasValue
   */
  function updateMainSearchUI(hasValue) {
    searchMainBox.classList.toggle('has-value', hasValue);
  }

  /**
   * Handler do campo de busca principal.
   * Delega para Search.handleSearchInput() que:
   *   1. Aplica debounce (300ms)
   *   2. Normaliza a query
   *   3. Busca posts + perfis
   *   4. Renderiza resultados com highlight
   */
  searchMainInput.addEventListener('input', () => {
    const query = searchMainInput.value;
    updateMainSearchUI(query.length > 0);
    Search.handleSearchInput(query);
  });

  /** Botão ✕ limpa a busca principal */
  searchMainClear.addEventListener('click', () => {
    searchMainInput.value = '';
    updateMainSearchUI(false);
    Search.clearSearch();
    searchMainInput.focus();
  });

  /**
   * Foca no campo de busca ao ativar a aba de busca.
   * UX: o usuário espera poder digitar imediatamente.
   *
   * Como detectar a ativação da aba?
   * O botão data-tab="search" já está coberto pelo listener da seção 2.
   * Precisamos de um hook adicional em UI.activateTab.
   * A solução simples: observar mudanças na aba ativa.
   */
  document.querySelectorAll('[data-tab="search"]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Pequeno delay para a animação da aba terminar
      setTimeout(() => searchMainInput.focus(), 100);
    });
  });


  // ═══════════════════════════════════════════
  // 12. CHIPS DE SUGESTÃO DE BUSCA
  //
  // CONCEITO: atalhos de entrada de dado
  // ─────────────────────────────────────────
  // Chips reduzem o esforço do usuário ao sugerir buscas comuns.
  // Ao clicar, o texto do chip é inserido no campo e a busca
  // é disparada automaticamente.
  //
  // data-query no HTML define o texto de cada sugestão.
  // Isso torna fácil adicionar/remover chips sem mexer no JS.
  // ═══════════════════════════════════════════

  document.querySelectorAll('.search-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;

      // Preenche o campo principal
      searchMainInput.value = query;
      updateMainSearchUI(true);

      // Dispara a busca
      Search.handleSearchInput(query);

      // Foca no campo para o usuário poder continuar digitando
      searchMainInput.focus();
    });
  });


}); // fim DOMContentLoaded
