/**
 * storage.js — Camada de Persistência com localStorage
 * Abstrai todas as operações de leitura e escrita no localStorage,
 * facilitando a troca por uma API real no futuro.
 */

const Storage = (() => {
  const KEYS = {
    POSTS:   'dailystudy_posts',
    PROFILE: 'dailystudy_profile',
  };

  // ---------- Posts ----------

  /** Retorna todos os posts (array), mais recentes primeiro */
  function getPosts() {
    try {
      const raw = localStorage.getItem(KEYS.POSTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Salva o array completo de posts */
  function savePosts(posts) {
    localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  }

  /** Adiciona um novo post e retorna o post criado */
  function addPost(text) {
    const posts = getPosts();
    const post = {
      id:        crypto.randomUUID(),
      text:      text.trim(),
      createdAt: new Date().toISOString(),
      editedAt:  null,
    };
    posts.unshift(post); // insere no início (ordem cronológica desc)
    savePosts(posts);
    return post;
  }

  /** Edita o texto de um post pelo id */
  function editPost(id, newText) {
    const posts = getPosts();
    const idx   = posts.findIndex(p => p.id === id);
    if (idx === -1) return null;
    posts[idx].text     = newText.trim();
    posts[idx].editedAt = new Date().toISOString();
    savePosts(posts);
    return posts[idx];
  }

  /** Remove um post pelo id */
  function deletePost(id) {
    const posts    = getPosts();
    const filtered = posts.filter(p => p.id !== id);
    savePosts(filtered);
  }

  // ---------- Profile ----------

  const DEFAULT_PROFILE = {
    name: 'João da Silva',
    bio:  'Apaixonado por aprender. Sempre estudando algo novo todos os dias.',
  };

  /** Retorna o perfil do usuário */
  function getProfile() {
    try {
      const raw = localStorage.getItem(KEYS.PROFILE);
      return raw ? JSON.parse(raw) : { ...DEFAULT_PROFILE };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  /** Salva/atualiza o perfil do usuário */
  function saveProfile(profile) {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  }

  // Expõe a API pública
  return { getPosts, addPost, editPost, deletePost, getProfile, saveProfile };
})();
