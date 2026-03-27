/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  profile.js — Módulo de Perfil do Usuário                   ║
 * ║                                                              ║
 * ║  Responsável por:                                            ║
 * ║    • Ler e exibir os dados do perfil (nome, bio, avatar)     ║
 * ║    • Gerenciar uploads de foto de perfil e banner            ║
 * ║    • Controlar o formulário de edição de nome/bio            ║
 * ║    • Sincronizar o perfil com todos os elementos de UI       ║
 * ║                                                              ║
 * ║  Dependências: storage.js (deve ser carregado antes)         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * @module Profile
 * @exports {Object} Profile — API pública
 */

const Profile = (() => {

  // ═══════════════════════════════════════════
  // HELPERS INTERNOS
  // ═══════════════════════════════════════════

  /**
   * Gera as iniciais de um nome para uso como fallback do avatar.
   * Pega a primeira letra do primeiro nome e a primeira do último.
   *
   * @param  {string} name  Nome completo
   * @returns {string}      Ex: "João da Silva" → "JS" | "Ana" → "A"
   */
  function getInitials(name) {
    const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Define o conteúdo de um avatar:
   *   • Se há uma imageUrl: insere <img> dentro do elemento
   *   • Caso contrário: exibe as iniciais como texto
   *
   * @param {HTMLElement}   el        Elemento do avatar (.post-ava, .compose-ava…)
   * @param {string}        name      Nome do usuário (para iniciais)
   * @param {string|null}   imageUrl  Data URL da foto ou null
   */
  function setAvatarContent(el, name, imageUrl) {
    if (!el) return;
    el.innerHTML = ''; // limpa conteúdo anterior

    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `Foto de ${name}`;
      el.appendChild(img);
    } else {
      el.textContent = getInitials(name);
    }
  }

  /**
   * Lê um arquivo de imagem e retorna uma Promise com a Data URL (Base64).
   * Usado para converter arquivos selecionados em strings armazenáveis.
   *
   * @param  {File}    file  Arquivo de imagem
   * @returns {Promise<string>} Data URL (ex: "data:image/jpeg;base64,...")
   */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
      reader.readAsDataURL(file); // converte para Base64
    });
  }


  // ═══════════════════════════════════════════
  // SINCRONIZAÇÃO DE UI
  // ═══════════════════════════════════════════

  /**
   * Sincroniza TODOS os elementos de UI com os dados atuais do perfil.
   * Deve ser chamado após qualquer alteração no perfil.
   * Atualiza: avatar do compose, avatar grande, nome, bio, banner.
   */
  function syncUI() {
    const p = Storage.getProfile();
    const { name, bio, avatarUrl, bannerUrl } = p;

    // ── Avatar pequeno (compose box) ──────────────────
    const composeAva = document.getElementById('composeAva');
    setAvatarContent(composeAva, name, avatarUrl);

    // ── Avatar grande (aba de perfil) ─────────────────
    const profileAvaBig = document.getElementById('profileAvaBig');
    setAvatarContent(profileAvaBig, name, avatarUrl);

    // ── Nome ──────────────────────────────────────────
    const pNameEl = document.getElementById('pName');
    if (pNameEl) pNameEl.textContent = name;

    // ── Bio ───────────────────────────────────────────
    const pBioEl = document.getElementById('pBio');
    if (pBioEl) pBioEl.textContent = bio || '';

    // ── Banner ────────────────────────────────────────
    const bannerImg = document.getElementById('bannerImg');
    if (bannerImg) {
      if (bannerUrl) {
        bannerImg.src = bannerUrl;
        bannerImg.classList.remove('hidden');
      } else {
        bannerImg.src = '';
        bannerImg.classList.add('hidden');
      }
    }
  }


  // ═══════════════════════════════════════════
  // FORMULÁRIO DE EDIÇÃO
  // ═══════════════════════════════════════════

  /**
   * Abre o formulário de edição, preenchido com os dados atuais.
   * Oculta o botão "Editar perfil" enquanto o form está aberto.
   */
  function openEditForm() {
    const p = Storage.getProfile();

    // Preenche os campos com os valores atuais
    const nameInput = document.getElementById('eName');
    const bioInput  = document.getElementById('eBio');
    if (nameInput) nameInput.value = p.name;
    if (bioInput)  bioInput.value  = p.bio || '';

    // Exibe o form e oculta o botão
    document.getElementById('editForm').classList.remove('hidden');
    document.getElementById('btnEditP').style.display = 'none';

    // Foca no campo de nome para UX mais fluida
    if (nameInput) nameInput.focus();
  }

  /**
   * Fecha o formulário de edição sem salvar.
   * Restaura a visibilidade do botão "Editar perfil".
   */
  function closeEditForm() {
    document.getElementById('editForm').classList.add('hidden');
    document.getElementById('btnEditP').style.display = '';
  }

  /**
   * Valida e salva as alterações de nome e bio.
   * Sincroniza a UI e re-renderiza o feed para atualizar o nome nos posts.
   *
   * @returns {boolean} true se salvou com sucesso
   */
  function saveEditForm() {
    const nameVal = document.getElementById('eName').value.trim();
    const bioVal  = document.getElementById('eBio').value.trim();

    if (!nameVal) {
      UI.showToast('O nome não pode estar vazio.', 'err');
      document.getElementById('eName').focus();
      return false;
    }

    // Atualiza apenas nome e bio (preserva avatarUrl e bannerUrl)
    Storage.patchProfile({ name: nameVal, bio: bioVal });

    syncUI();
    closeEditForm();

    // Re-renderiza posts para refletir o novo nome do autor
    Posts.renderFeed();
    Posts.renderProfilePosts();

    UI.showToast('Perfil atualizado!', 'ok');
    return true;
  }


  // ═══════════════════════════════════════════
  // UPLOAD DE IMAGENS
  // ═══════════════════════════════════════════

  /**
   * Processa um arquivo de imagem e o salva como avatar ou banner.
   * Exibe feedback visual durante e após o processo.
   *
   * @param {File}   file   Arquivo de imagem selecionado
   * @param {'avatar'|'banner'} type  Tipo de imagem a atualizar
   */
  async function handleImageUpload(file, type) {
    if (!file) return;

    // Valida o tipo de arquivo (apenas imagens)
    if (!file.type.startsWith('image/')) {
      UI.showToast('Por favor, selecione apenas imagens.', 'err');
      return;
    }

    // Feedback de processamento
    UI.showToast('Carregando imagem…');

    try {
      // Converte o arquivo para Base64
      const dataUrl = await fileToDataUrl(file);

      if (type === 'avatar') {
        // Salva apenas o campo avatarUrl
        Storage.patchProfile({ avatarUrl: dataUrl });
        UI.showToast('Foto de perfil atualizada! 📸', 'ok');

      } else if (type === 'banner') {
        // Salva apenas o campo bannerUrl
        Storage.patchProfile({ bannerUrl: dataUrl });
        UI.showToast('Banner atualizado! 🖼️', 'ok');
      }

      // Sincroniza toda a UI com o novo dado
      syncUI();

    } catch (err) {
      // Pode ser quota exceeded ou erro de leitura
      console.error('[Profile] Erro ao fazer upload:', err);
      UI.showToast(err.message || 'Erro ao carregar imagem.', 'err');
    }
  }


  // ═══════════════════════════════════════════
  // GETTERS PÚBLICOS
  // ═══════════════════════════════════════════

  /** Retorna o perfil atual do storage. */
  function get() {
    return Storage.getProfile();
  }

  /** Retorna as iniciais do nome atual. */
  function getInitialsFromCurrent() {
    return getInitials(Storage.getProfile().name);
  }


  // ─────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────
  return {
    get,
    getInitials,
    getInitialsFromCurrent,
    setAvatarContent,
    fileToDataUrl,
    syncUI,
    openEditForm,
    closeEditForm,
    saveEditForm,
    handleImageUpload,
  };

})();
