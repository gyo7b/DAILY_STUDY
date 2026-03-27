/**
 * profile.js — Lógica de Perfil do Usuário
 * Gerencia leitura, edição e atualização visual do perfil.
 */

const Profile = (() => {

  /** Retorna o perfil atual do localStorage */
  function get() {
    return Storage.getProfile();
  }

  /**
   * Atualiza os elementos de UI com os dados do perfil atual.
   * Deve ser chamado sempre que o perfil for alterado.
   */
  function syncUI() {
    const profile  = get();
    const initials = getInitials(profile.name);

    // Sidebar
    setTextContent('sidebarName',   profile.name);
    setTextContent('sidebarAvatar', initials);

    // Compose box
    setTextContent('composeAvatar', initials);

    // Aba de perfil
    setTextContent('profileName',   profile.name);
    setTextContent('profileBio',    profile.bio);
    setTextContent('profileAvatar', initials);
  }

  /** Abre o formulário de edição preenchido com dados atuais */
  function openEditForm() {
    const profile = get();
    document.getElementById('editName').value = profile.name;
    document.getElementById('editBio').value  = profile.bio;
    document.getElementById('editProfileForm').classList.remove('hidden');
    document.getElementById('btnEditProfile').style.display = 'none';
    document.getElementById('editName').focus();
  }

  /** Fecha o formulário de edição sem salvar */
  function closeEditForm() {
    document.getElementById('editProfileForm').classList.add('hidden');
    document.getElementById('btnEditProfile').style.display = '';
  }

  /** Salva as alterações do perfil */
  function save() {
    const name = document.getElementById('editName').value.trim();
    const bio  = document.getElementById('editBio').value.trim();

    if (!name) {
      UI.showToast('O nome não pode estar vazio.', 'error');
      return;
    }

    Storage.saveProfile({ name, bio });
    syncUI();
    closeEditForm();

    // Re-renderiza os posts para refletir o novo nome
    Posts.renderFeed();
    Posts.renderProfilePosts();

    UI.showToast('Perfil atualizado!', 'success');
  }

  // --- Helpers ---

  function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function getInitials(name) {
    const parts = (name || 'U').trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return { get, syncUI, openEditForm, closeEditForm, save };
})();
