/**
 * ui.js — Controle de Interface (Modal, Tabs, Toast)
 * Gerencia estados de UI que não pertencem a nenhum domínio específico.
 */

const UI = (() => {

  // =============================================
  // Modal de Edição de Post
  // =============================================

  function openModal() {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // impede scroll do fundo
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.body.style.overflow = '';
  }

  // =============================================
  // Sistema de Abas (Feed ↔ Perfil)
  // =============================================

  /**
   * Ativa a aba pelo nome ('feed' ou 'profile').
   * Sincroniza tanto a sidebar quanto a topbar mobile.
   */
  function activateTab(tabName) {
    // Painéis
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    // Botões sidebar
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Botões topbar mobile
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Renderiza o conteúdo da aba ao ativar
    if (tabName === 'profile') {
      Posts.renderProfilePosts();
      Posts.updateStats();
    }
  }

  // =============================================
  // Toast Notifications
  // =============================================

  let _toastTimer = null;

  /**
   * Exibe uma notificação de toast temporária.
   * @param {string} message  — texto a exibir
   * @param {'success'|'error'|''} type — estilo do toast
   */
  function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className   = `toast show ${type}`;

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  return { openModal, closeModal, activateTab, showToast };
})();
