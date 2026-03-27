/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ui.js — Módulo de Interface (UI)                           ║
 * ║                                                              ║
 * ║  Responsável por controle de estados de UI que não           ║
 * ║  pertencem a um domínio específico:                          ║
 * ║    • Sistema de abas (feed ↔ perfil)                        ║
 * ║    • Modal de edição de post (abrir/fechar)                  ║
 * ║    • Toast de notificação temporária                         ║
 * ║    • Lightbox de imagem em tela cheia                        ║
 * ║                                                              ║
 * ║  Dependências: nenhuma (não importa outros módulos)          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * @module UI
 * @exports {Object} UI — API pública
 */

const UI = (() => {

  // ═══════════════════════════════════════════
  // SISTEMA DE ABAS
  // ═══════════════════════════════════════════

  /**
   * Ativa uma aba pelo nome ('feed' ou 'profile').
   * Atualiza:
   *   1. Os painéis .tab-panel (adiciona/remove .active)
   *   2. Os botões da rail lateral (.rail-btn)
   *   3. Os botões da bottom-bar mobile (.bottom-btn)
   *   4. O atributo aria-current para acessibilidade
   * Ao ativar o perfil, re-renderiza posts e estatísticas.
   *
   * @param {'feed'|'profile'} tabName  Nome da aba a ativar
   */
  function activateTab(tabName) {
    // ── Painéis ──────────────────────────────────
    document.querySelectorAll('.tab-panel').forEach(panel => {
      const isTarget = panel.id === `tab-${tabName}`;
      panel.classList.toggle('active', isTarget);
    });

    // ── Botões de navegação (rail + bottom-bar) ───
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const isTarget = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isTarget);
      // Acessibilidade: indica a aba atual para leitores de tela
      btn.setAttribute('aria-current', isTarget ? 'page' : 'false');
    });

    // ── Ações específicas por aba ─────────────────
    if (tabName === 'profile') {
      // Renderiza posts e atualiza stats ao entrar no perfil
      Posts.renderProfilePosts();
      Posts.updateStats();
    }
  }


  // ═══════════════════════════════════════════
  // MODAL DE EDIÇÃO DE POST
  // ═══════════════════════════════════════════

  /**
   * Abre o modal de edição.
   * Bloqueia o scroll da página (body) para evitar scroll duplo.
   * Foca no textarea após a animação de abertura.
   */
  function openModal() {
    const backdrop = document.getElementById('modalBackdrop');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';   // bloqueia scroll da página

    // Foca no textarea após a animação (250ms = duração do slideUp)
    setTimeout(() => {
      document.getElementById('editTa').focus();
    }, 260);
  }

  /**
   * Fecha o modal de edição.
   * Restaura o scroll da página.
   */
  function closeModal() {
    const backdrop = document.getElementById('modalBackdrop');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';   // libera scroll da página
  }


  // ═══════════════════════════════════════════
  // TOAST DE NOTIFICAÇÃO
  // ═══════════════════════════════════════════

  /**
   * Timer do toast atual (para resetar se um novo toast for chamado
   * antes do anterior terminar).
   * @type {number|null}
   */
  let _toastTimer = null;

  /**
   * Exibe uma notificação de toast temporária na parte inferior da tela.
   * Se já houver um toast visível, ele é substituído imediatamente.
   *
   * @param {string}              message  Texto a exibir
   * @param {''|'ok'|'err'}       type     Estilo: '' (neutro), 'ok' (verde), 'err' (vermelho)
   * @param {number}              duration Duração em ms (padrão: 2800)
   */
  function showToast(message, type = '', duration = 2800) {
    const toast = document.getElementById('toast');

    // Reseta timer anterior, se houver
    if (_toastTimer) {
      clearTimeout(_toastTimer);
      _toastTimer = null;
    }

    // Define conteúdo e tipo
    toast.textContent = message;
    toast.className   = `toast show ${type}`.trim();

    // Agenda o desaparecimento
    _toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      _toastTimer = null;
    }, duration);
  }


  // ═══════════════════════════════════════════
  // LIGHTBOX DE IMAGEM
  // ═══════════════════════════════════════════

  /**
   * Abre o lightbox exibindo a imagem em tela cheia.
   * Bloqueia o scroll da página durante a exibição.
   *
   * @param {string} imageSrc  URL ou Data URL da imagem
   */
  function openLightbox(imageSrc) {
    const lightbox = document.getElementById('lightbox');
    const lbImg    = document.getElementById('lightboxImg');

    lbImg.src = imageSrc;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Foca no botão de fechar (acessibilidade / ESC)
    document.getElementById('lightboxClose').focus();
  }

  /**
   * Fecha o lightbox e limpa a imagem.
   * Libera o scroll da página.
   */
  function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('hidden');
    document.getElementById('lightboxImg').src = '';
    document.body.style.overflow = '';
  }


  // ─────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────
  return {
    activateTab,
    openModal,
    closeModal,
    showToast,
    openLightbox,
    closeLightbox,
  };

})();
