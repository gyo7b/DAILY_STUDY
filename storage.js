/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  storage.js — Camada de Persistência (localStorage)         ║
 * ║                                                              ║
 * ║  Toda leitura e escrita no localStorage fica centralizada   ║
 * ║  aqui. Os outros módulos NUNCA acessam localStorage         ║
 * ║  diretamente — usam sempre este módulo.                      ║
 * ║                                                              ║
 * ║  Isso facilita trocar por uma API real no futuro:            ║
 * ║  basta alterar apenas este arquivo.                          ║
 * ║                                                              ║
 * ║  ATENÇÃO SOBRE IMAGENS:                                      ║
 * ║  Imagens são salvas como Data URLs (Base64).                 ║
 * ║  Isso funciona para imagens pequenas/médias,                 ║
 * ║  mas o localStorage tem limite de ~5MB por origem.           ║
 * ║  Para produção, use um servidor ou IndexedDB.                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * @module Storage
 * @exports {Object} Storage — API pública com métodos para posts e perfil
 */

const Storage = (() => {

  // ─────────────────────────────────────────────
  // CHAVES DO localStorage
  // Centralizar aqui evita erros de typo
  // ─────────────────────────────────────────────
  const KEYS = {
    POSTS:   'ds_posts',    // Array de objetos de post
    PROFILE: 'ds_profile',  // Objeto com dados do perfil
  };


  // ═══════════════════════════════════════════
  // MÉTODOS DE POSTS
  // ═══════════════════════════════════════════

  /**
   * Retorna todos os posts salvos, ordenados do mais novo para o mais antigo.
   * (A ordem cronológica decrescente é mantida pois cada novo post é inserido
   *  no início do array com unshift.)
   *
   * @returns {Array<PostObject>} Array de posts (pode ser vazio)
   *
   * @typedef  {Object}  PostObject
   * @property {string}  id         UUID único do post
   * @property {string}  text       Texto do post
   * @property {string|null} image  Data URL da imagem ou null
   * @property {string}  createdAt  ISO 8601 da criação
   * @property {string|null} editedAt ISO 8601 da última edição ou null
   */
  function getPosts() {
    try {
      const raw = localStorage.getItem(KEYS.POSTS);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      // Se o JSON estiver corrompido, retorna array vazio
      console.error('[Storage] Erro ao ler posts:', err);
      return [];
    }
  }

  /**
   * Substitui o array inteiro de posts no localStorage.
   * Uso interno — os consumidores usam addPost / editPost / deletePost.
   *
   * @param {Array<PostObject>} posts
   */
  function savePosts(posts) {
    try {
      localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
    } catch (err) {
      // Pode acontecer se localStorage estiver cheio (quota exceeded)
      console.error('[Storage] Erro ao salvar posts:', err);
      throw new Error('Armazenamento cheio. Exclua alguns posts com imagens.');
    }
  }

  /**
   * Cria um novo post, insere no início do array (ordem desc)
   * e salva no localStorage.
   *
   * @param {string}      text           Texto da postagem (obrigatório)
   * @param {string|null} imageDataUrl   Data URL da imagem ou null
   * @returns {PostObject} O post recém-criado
   */
  function addPost(text, imageDataUrl = null) {
    const posts = getPosts();

    const post = {
      id:        crypto.randomUUID(),  // ID único nativo do browser
      text:      text.trim(),
      image:     imageDataUrl,         // Base64 ou null
      createdAt: new Date().toISOString(),
      editedAt:  null,
    };

    // unshift() insere no início → mais novo fica primeiro
    posts.unshift(post);
    savePosts(posts);

    return post;
  }

  /**
   * Atualiza o texto de um post existente pelo seu ID.
   * Registra a data/hora da edição em editedAt.
   *
   * @param {string} id       ID do post a editar
   * @param {string} newText  Novo texto
   * @returns {PostObject|null} Post atualizado ou null se não encontrado
   */
  function editPost(id, newText) {
    const posts = getPosts();
    const index = posts.findIndex(p => p.id === id);

    if (index === -1) {
      console.warn('[Storage] editPost: post não encontrado:', id);
      return null;
    }

    posts[index].text     = newText.trim();
    posts[index].editedAt = new Date().toISOString();

    savePosts(posts);
    return posts[index];
  }

  /**
   * Remove um post pelo ID.
   *
   * @param {string} id  ID do post a excluir
   */
  function deletePost(id) {
    const posts    = getPosts();
    const filtered = posts.filter(p => p.id !== id);
    savePosts(filtered);
  }


  // ═══════════════════════════════════════════
  // MÉTODOS DE PERFIL
  // ═══════════════════════════════════════════

  /**
   * Perfil padrão exibido na primeira execução.
   * @type {ProfileObject}
   */
  const DEFAULT_PROFILE = {
    name:        'João da Silva',
    bio:         'Apaixonado por aprender. Sempre estudando algo novo a cada dia.',
    avatarUrl:   null,   // Data URL da foto de perfil
    bannerUrl:   null,   // Data URL do banner
  };

  /**
   * Retorna o perfil do usuário salvo.
   * Se não houver perfil salvo, retorna o perfil padrão.
   *
   * @returns {ProfileObject}
   *
   * @typedef  {Object}      ProfileObject
   * @property {string}      name       Nome do usuário
   * @property {string}      bio        Biografia
   * @property {string|null} avatarUrl  Data URL do avatar ou null
   * @property {string|null} bannerUrl  Data URL do banner ou null
   */
  function getProfile() {
    try {
      const raw = localStorage.getItem(KEYS.PROFILE);
      // Mescla com DEFAULT_PROFILE para garantir que novas propriedades
      // adicionadas no futuro tenham valor padrão em perfis antigos
      return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
    } catch (err) {
      console.error('[Storage] Erro ao ler perfil:', err);
      return { ...DEFAULT_PROFILE };
    }
  }

  /**
   * Salva (substitui) o perfil do usuário.
   *
   * @param {ProfileObject} profile  Objeto com os dados do perfil
   */
  function saveProfile(profile) {
    try {
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    } catch (err) {
      console.error('[Storage] Erro ao salvar perfil:', err);
      throw new Error('Armazenamento cheio. A imagem pode ser muito grande.');
    }
  }

  /**
   * Atualiza parcialmente o perfil (merge com o existente).
   * Útil para atualizar apenas o avatar sem mexer no nome/bio, etc.
   *
   * @param {Partial<ProfileObject>} partial  Campos a atualizar
   * @returns {ProfileObject} Perfil completo após atualização
   */
  function patchProfile(partial) {
    const current = getProfile();
    const updated = { ...current, ...partial };
    saveProfile(updated);
    return updated;
  }


  // ─────────────────────────────────────────────
  // API PÚBLICA DO MÓDULO
  // ─────────────────────────────────────────────
  return {
    // Posts
    getPosts,
    addPost,
    editPost,
    deletePost,

    // Perfil
    getProfile,
    saveProfile,
    patchProfile,
  };

})();
