/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  app.js — Ponto de Entrada da Aplicação                     ║
 * ║                                                              ║
 * ║  Este é o "maestro" da aplicação.                            ║
 * ║  Responsável por:                                            ║
 * ║    1. Inicializar todos os módulos ao carregar a página      ║
 * ║    2. Registrar TODOS os event listeners                     ║
 * ║    3. Conectar os módulos entre si (storage ↔ ui ↔ posts)   ║
 * ║                                                              ║
 * ║  REGRA: app.js NÃO contém lógica de negócio.                ║
 * ║  Ele apenas chama métodos dos outros módulos.                ║
 * ║                                                              ║
 * ║  Ordem de carregamento obrigatória:                          ║
 * ║    storage.js → profile.js → posts.js → ui.js → app.js      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

/**
 * Aguarda o DOM estar completamente carregado antes de inicializar.
 * Garante que todos os elementos existam quando tentamos acessá-los.
 */
document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════
  // 1. INICIALIZAÇÃO
  //    Carrega dados do localStorage e renderiza
  //    o estado inicial da aplicação.
  // ═══════════════════════════════════════════

  // Carrega perfil (nome, bio, avatar, banner) e sincroniza a UI
  Profile.syncUI();

  // Renderiza os posts salvos no feed
  Posts.renderFeed();

  // Calcula e exibe as estatísticas iniciais
  Posts.updateStats();


  // ═══════════════════════════════════════════
  // 2. NAVEGAÇÃO ENTRE ABAS
  //    Ouve cliques em TODOS os elementos com data-tab,
  //    tanto na rail lateral quanto na bottom-bar mobile.
  // ═══════════════════════════════════════════

  /**
   * Delegação de eventos para navegação.
   * Qualquer clique em um elemento com [data-tab] ativa aquela aba.
   * Cobre: .rail-btn (desktop) e .bottom-btn (mobile).
   */
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.activateTab(btn.dataset.tab);
    });

    // Suporte a teclado: Enter e Espaço ativam o botão
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        UI.activateTab(btn.dataset.tab);
      }
    });
  });

  // O avatar do compose também navega para a aba de perfil
  document.getElementById('composeAva').addEventListener('click', () => {
    UI.activateTab('profile');
  });


  // ═══════════════════════════════════════════
  // 3. COMPOSE BOX — CRIAR POST
  // ═══════════════════════════════════════════

  const postInput  = document.getElementById('postInput');
  const btnPost    = document.getElementById('btnPost');

  /**
   * Ao digitar na textarea:
   *   - Atualiza o contador de caracteres
   *   - Habilita/desabilita o botão "Publicar"
   *     (só habilitado quando há texto não-vazio)
   */
  postInput.addEventListener('input', () => {
    Posts.updateCharCounter('charCount', postInput, 500);
    btnPost.disabled = postInput.value.trim().length === 0;
  });

  /**
   * Atalho de teclado: Ctrl+Enter ou Cmd+Enter publica o post.
   * Mais fluido do que ter que usar o mouse.
   */
  postInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!btnPost.disabled) {
        Posts.handlePublish();
      }
    }
  });

  /** Clique no botão "Publicar" */
  btnPost.addEventListener('click', () => {
    Posts.handlePublish();
  });


  // ═══════════════════════════════════════════
  // 4. UPLOAD DE IMAGEM NO COMPOSE
  // ═══════════════════════════════════════════

  /**
   * Quando o usuário seleciona um arquivo via <input id="imgInput">,
   * passa o arquivo para Posts.handleComposeImage() que o converte
   * para Base64 e exibe a prévia.
   */
  document.getElementById('imgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) Posts.handleComposeImage(file);
  });

  /**
   * Botão ✕ remove a imagem selecionada do compose.
   * Limpa a prévia e a variável interna _pendingImageUrl.
   */
  document.getElementById('removeImgBtn').addEventListener('click', () => {
    Posts.clearPendingImage();
  });


  // ═══════════════════════════════════════════
  // 5. MODAL DE EDIÇÃO DE POST
  // ═══════════════════════════════════════════

  const editTa = document.getElementById('editTa');

  /**
   * Atualiza o contador de caracteres do textarea do modal
   * enquanto o usuário edita o texto.
   */
  editTa.addEventListener('input', () => {
    Posts.updateCharCounter('editCount', editTa, 500);
  });

  /** Botão "Salvar" do modal: salva a edição */
  document.getElementById('modalSaveBtn').addEventListener('click', () => {
    Posts.handleSaveEdit();
  });

  /**
   * Atalho Ctrl+Enter / Cmd+Enter também salva no modal
   * (mesma UX do compose box).
   */
  editTa.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      Posts.handleSaveEdit();
    }
  });

  /** Botão "Cancelar" do modal */
  document.getElementById('modalCancelBtn').addEventListener('click', () => {
    UI.closeModal();
  });

  /** Botão ✕ (fechar) do modal */
  document.getElementById('modalCloseBtn').addEventListener('click', () => {
    UI.closeModal();
  });

  /**
   * Clique no backdrop (fundo escuro) fecha o modal.
   * Verifica se o clique foi no próprio backdrop
   * (não em um filho, como o card do modal).
   */
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) {
      UI.closeModal();
    }
  });

  /**
   * Tecla ESC fecha o modal (padrão de UX para modais).
   * Também fecha o lightbox se estiver aberto.
   */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      UI.closeModal();
      UI.closeLightbox();
    }
  });


  // ═══════════════════════════════════════════
  // 6. LIGHTBOX DE IMAGEM
  // ═══════════════════════════════════════════

  /** Botão ✕ do lightbox */
  document.getElementById('lightboxClose').addEventListener('click', () => {
    UI.closeLightbox();
  });

  /**
   * Clique no fundo do lightbox (fora da imagem) também fecha.
   * Verifica se o clique foi no container, não na imagem.
   */
  document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox')) {
      UI.closeLightbox();
    }
  });


  // ═══════════════════════════════════════════
  // 7. PERFIL — FORMULÁRIO DE EDIÇÃO
  // ═══════════════════════════════════════════

  /** Botão "Editar perfil": abre o formulário */
  document.getElementById('btnEditP').addEventListener('click', () => {
    Profile.openEditForm();
  });

  /** Botão "Cancelar" do formulário de edição */
  document.getElementById('btnCancelEdit').addEventListener('click', () => {
    Profile.closeEditForm();
  });

  /** Botão "Salvar" do formulário de edição */
  document.getElementById('btnSaveEdit').addEventListener('click', () => {
    Profile.saveEditForm();
  });

  /**
   * Enter no campo de nome salva o formulário (UX de formulário padrão).
   * Tab passa para o próximo campo normalmente.
   */
  document.getElementById('eName').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      Profile.saveEditForm();
    }
  });


  // ═══════════════════════════════════════════
  // 8. PERFIL — UPLOAD DE AVATAR
  // ═══════════════════════════════════════════

  /**
   * Clique na foto de perfil grande abre o seletor de arquivo do avatar.
   * O input file real está dentro do .avatar-wrap (oculto via CSS).
   */
  document.getElementById('profileAvaBig').addEventListener('click', () => {
    document.getElementById('avatarInput').click();
  });

  /** Tecla Enter/Espaço no avatar também abre o seletor (acessibilidade) */
  document.getElementById('profileAvaBig').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('avatarInput').click();
    }
  });

  /**
   * Quando o usuário seleciona um arquivo para avatar,
   * Profile.handleImageUpload converte para Base64 e salva.
   */
  document.getElementById('avatarInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) Profile.handleImageUpload(file, 'avatar');
    e.target.value = ''; // reseta para permitir selecionar o mesmo arquivo
  });


  // ═══════════════════════════════════════════
  // 9. PERFIL — UPLOAD DE BANNER
  // ═══════════════════════════════════════════

  /**
   * Clique na zona do banner abre o seletor de arquivo do banner.
   * A zona inclui tanto a imagem quanto o overlay de hint.
   */
  document.getElementById('bannerZone').addEventListener('click', e => {
    // Evita abrir o seletor se o clique foi diretamente no input
    if (e.target.tagName !== 'INPUT') {
      document.getElementById('bannerInput').click();
    }
  });

  /** Tecla Enter/Espaço no banner abre o seletor (acessibilidade) */
  document.getElementById('bannerZone').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('bannerInput').click();
    }
  });

  /**
   * Quando o usuário seleciona um arquivo para banner,
   * Profile.handleImageUpload converte para Base64 e salva.
   */
  document.getElementById('bannerInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) Profile.handleImageUpload(file, 'banner');
    e.target.value = ''; // reseta para reusar
  });

  /**
   * BÔNUS: Drag & Drop no banner.
   * Permite arrastar uma imagem direto para a zona do banner.
   */
  const bannerZone = document.getElementById('bannerZone');

  bannerZone.addEventListener('dragover', e => {
    e.preventDefault(); // necessário para ativar o drop
    bannerZone.classList.add('drag-over');
  });

  bannerZone.addEventListener('dragleave', () => {
    bannerZone.classList.remove('drag-over');
  });

  bannerZone.addEventListener('drop', e => {
    e.preventDefault();
    bannerZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      Profile.handleImageUpload(file, 'banner');
    } else if (file) {
      UI.showToast('Por favor, solte apenas imagens.', 'err');
    }
  });


}); // fim do DOMContentLoaded
