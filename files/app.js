/**
 * app.js — Ponto de Entrada da Aplicação
 * Inicializa todos os módulos e registra os event listeners.
 * Este arquivo é o "maestro" que conecta UI, Posts e Profile.
 */

document.addEventListener('DOMContentLoaded', () => {

  // =============================================
  // Inicialização
  // =============================================

  Profile.syncUI();    // Carrega dados do perfil nos elementos de UI
  Posts.renderFeed();  // Renderiza posts no feed
  Posts.updateStats(); // Atualiza contadores de estatísticas

  // =============================================
  // Navegação entre Abas
  // =============================================

  // Sidebar (desktop)
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => UI.activateTab(btn.dataset.tab));
  });

  // Topbar (mobile)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => UI.activateTab(btn.dataset.tab));
  });

  // =============================================
  // Compose Box — Criar Post
  // =============================================

  const postInput  = document.getElementById('postInput');
  const btnPublish = document.getElementById('btnPublish');

  // Atualiza contador ao digitar
  postInput.addEventListener('input', () => {
    Posts.updateCharCounter('charCounter', 'postInput', 500);
    btnPublish.disabled = postInput.value.trim().length === 0;
  });

  // Publicar com o botão
  btnPublish.addEventListener('click', () => Posts.handlePublish());

  // Publicar com Ctrl+Enter / Cmd+Enter
  postInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (postInput.value.trim()) Posts.handlePublish();
    }
  });

  // Estado inicial do botão
  btnPublish.disabled = true;

  // =============================================
  // Modal de Edição de Post
  // =============================================

  const editInput = document.getElementById('editPostInput');

  // Atualiza contador no modal
  editInput.addEventListener('input', () => {
    Posts.updateCharCounter('editCharCounter', 'editPostInput', 500);
  });

  // Salvar edição
  document.getElementById('btnSaveEdit').addEventListener('click', () => Posts.handleSaveEdit());

  // Cancelar / fechar modal
  document.getElementById('btnCancelModal').addEventListener('click', () => UI.closeModal());
  document.getElementById('modalClose').addEventListener('click',     () => UI.closeModal());

  // Fechar modal clicando no overlay
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) UI.closeModal();
  });

  // Fechar modal com ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') UI.closeModal();
  });

  // =============================================
  // Perfil — Edição
  // =============================================

  document.getElementById('btnEditProfile').addEventListener('click', () => Profile.openEditForm());
  document.getElementById('btnCancelEdit').addEventListener('click',  () => Profile.closeEditForm());
  document.getElementById('btnSaveProfile').addEventListener('click', () => Profile.save());

});
