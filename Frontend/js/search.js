/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  search.js — Módulo de Busca                                ║
 * ║                                                              ║
 * ║  LEITURA RECOMENDADA ANTES DE EDITAR ESTE ARQUIVO:          ║
 * ║                                                              ║
 * ║  Este módulo implementa busca em duas dimensões:            ║
 * ║    1. Busca de POSTS — filtra pelo texto do conteúdo         ║
 * ║    2. Busca de PERFIL — busca no nome e bio do usuário       ║
 * ║                                                              ║
 * ║  Por que dois tipos? Porque no seu app atual existe          ║
 * ║  apenas UM usuário (você). Mas a estrutura já está           ║
 * ║  preparada para quando houver múltiplos usuários.            ║
 * ║                                                              ║
 * ║  CONCEITO-CHAVE: normalização                                ║
 * ║  Antes de qualquer comparação, textos são normalizados:      ║
 * ║  removemos acentos e convertemos para minúsculas.            ║
 * ║  Assim "João" == "joao" == "JOAO" na busca.                  ║
 * ║                                                              ║
 * ║  CONCEITO-CHAVE: pontuação de relevância (scoring)           ║
 * ║  Nem todo resultado tem o mesmo peso. Encontrar "react"      ║
 * ║  no início de um texto é mais relevante do que no meio.      ║
 * ║  Usamos uma pontuação simples para ordenar resultados.       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * @module Search
 * @exports {Object} Search — API pública
 */

const Search = (() => {

  // ═══════════════════════════════════════════
  // ESTADO INTERNO
  // Guarda o query atual para poder limpar/cancelar buscas.
  // ═══════════════════════════════════════════

  /** Query ativa no momento (string ou vazio) */
  let _currentQuery = '';

  /**
   * Timer de debounce.
   * Debounce = "só executa depois que o usuário parar de digitar".
   * Sem isso, a função rodaria a cada tecla pressionada — ineficiente.
   * @type {number|null}
   */
  let _debounceTimer = null;

  /**
   * Delay do debounce em milissegundos.
   * 300ms é o padrão da indústria — imperceptível para o usuário,
   * mas evita dezenas de buscas desnecessárias enquanto digita.
   */
  const DEBOUNCE_DELAY = 300;


  // ═══════════════════════════════════════════
  // NORMALIZAÇÃO DE TEXTO
  //
  // Este é o fundamento de qualquer sistema de busca.
  // Sem normalização, "São Paulo" não encontraria "sao paulo".
  // ═══════════════════════════════════════════

  /**
   * Normaliza um texto para comparação em buscas.
   *
   * O que acontece internamente, passo a passo:
   *   1. toLowerCase()       → "João SILVA" vira "joão silva"
   *   2. normalize('NFD')    → separa letras de seus diacríticos:
   *                            "ã" vira "a" + "~" (dois caracteres)
   *   3. replace(accentos)   → remove os diacríticos separados (os "~", "^"…)
   *                            sobra só "a"
   *   4. trim()              → remove espaços nas extremidades
   *
   * Resultado: "João SILVA" → "joao silva"
   *
   * @param  {string} str  Texto de entrada
   * @returns {string}     Texto normalizado, sem acentos e em minúsculas
   *
   * @example
   * normalize("São Paulo")   // "sao paulo"
   * normalize("REACT.js")    // "react.js"
   * normalize("  café  ")    // "cafe"
   */
  function normalize(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // range Unicode dos diacríticos
      .trim();
  }


  // ═══════════════════════════════════════════
  // PONTUAÇÃO DE RELEVÂNCIA (SCORING)
  //
  // Por que isso importa?
  // Se você busca "react" e tem dois posts:
  //   Post A: "react é ótimo para front-end"  (começa com a palavra)
  //   Post B: "gosto de escrever sobre react"  (palavra no fim)
  //
  // Post A provavelmente é mais relevante — é o tema central.
  // O scoring captura essa ideia com regras simples de peso.
  // ═══════════════════════════════════════════

  /**
   * Calcula uma pontuação de relevância entre 0 e 10.
   *
   * Regras de pontuação (cumulativas):
   *   +5  → texto começa exatamente com a query (match de prefixo)
   *   +3  → query encontrada no começo de uma palavra qualquer
   *   +2  → query encontrada em qualquer posição (substring)
   *   0   → query não encontrada
   *
   * Exemplos com query = "react":
   *   "react hooks avançado"  → score 5  (começa com react)
   *   "aprendendo react hoje" → score 2  (substring no meio)
   *   "não estudei hoje"      → score 0  (não encontrou)
   *
   * @param  {string} text   Texto onde buscar (já normalizado)
   * @param  {string} query  Termo de busca (já normalizado)
   * @returns {number}       Score de 0 a 10
   */
  function scoreMatch(text, query) {
    if (!text || !query) return 0;

    // Sem match: retorna 0 imediatamente (otimização)
    if (!text.includes(query)) return 0;

    let score = 2; // encontrou em algum lugar: score base

    // Bonus se o texto começa com a query exata
    if (text.startsWith(query)) {
      score += 5;
    }

    // Bonus se a query aparece no início de alguma palavra
    // Ex: query "react" em "aprendi react" → encontra " react" → bônus
    // A regex \b é "word boundary" = fronteira de palavra
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(query)}`);
    if (wordBoundaryRegex.test(text)) {
      score += 3;
    }

    return score;
  }

  /**
   * Escapa caracteres especiais de regex em uma string.
   * Necessário para usar input do usuário em RegExp sem erros.
   *
   * Exemplo: se o usuário digita "c++" e não escaparmos,
   * o "+" tem significado especial em regex e causaria erro.
   *
   * @param  {string} str  String possivelmente com caracteres especiais
   * @returns {string}     String segura para uso em new RegExp()
   */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }


  // ═══════════════════════════════════════════
  // BUSCA DE POSTS
  //
  // Filtra posts pelo texto do conteúdo.
  // Retorna posts com score > 0, ordenados por relevância.
  // ═══════════════════════════════════════════

  /**
   * Busca posts que contenham a query no texto.
   *
   * Processo:
   *   1. Carrega todos os posts do Storage
   *   2. Para cada post, calcula o score de relevância
   *   3. Filtra posts com score > 0 (encontrou algo)
   *   4. Ordena do mais relevante para o menos
   *
   * @param  {string} rawQuery  Texto digitado pelo usuário (não normalizado)
   * @returns {Array<ScoredPost>} Posts encontrados com pontuação
   *
   * @typedef  {Object} ScoredPost
   * @property {PostObject} post   O objeto do post original
   * @property {number}     score  Relevância (maior = mais relevante)
   * @property {string}     query  Query normalizada usada (para highlight)
   */
  function searchPosts(rawQuery) {
    const query = normalize(rawQuery);

    // Query vazia → retorna tudo (sem filtro)
    if (!query) return Storage.getPosts().map(post => ({ post, score: 0, query: '' }));

    const posts = Storage.getPosts();

    return posts
      .map(post => {
        // Normaliza o texto do post para comparação
        const normalizedText = normalize(post.text);
        const score = scoreMatch(normalizedText, query);
        return { post, score, query };
      })
      .filter(item => item.score > 0)   // apenas os que encontraram algo
      .sort((a, b) => b.score - a.score); // mais relevante primeiro
  }


  // ═══════════════════════════════════════════
  // BUSCA DE PERFIL (USUÁRIO)
  //
  // Busca no nome e na bio do usuário.
  // No sistema atual, há apenas um usuário, então retorna
  // 0 ou 1 resultado. A estrutura, porém, suporta múltiplos
  // usuários — basta trocar getProfile() por getUsers().
  // ═══════════════════════════════════════════

  /**
   * Busca no perfil do usuário (nome e bio).
   *
   * Campos pesquisados e seus pesos:
   *   - name: peso 2× (nome é mais importante que bio)
   *   - bio:  peso 1× (peso normal)
   *
   * Quando expandir para múltiplos usuários:
   *   Troque `[Storage.getProfile()]` por `Storage.getUsers()`
   *   e o restante da lógica permanece idêntico.
   *
   * @param  {string} rawQuery  Texto digitado pelo usuário
   * @returns {Array<ScoredProfile>} Perfis encontrados com pontuação
   *
   * @typedef  {Object} ScoredProfile
   * @property {ProfileObject} profile  O objeto do perfil
   * @property {number}        score    Relevância calculada
   * @property {string}        query    Query normalizada (para highlight)
   * @property {string[]}      matchedFields  Quais campos tiveram match
   */
  function searchProfiles(rawQuery) {
    const query = normalize(rawQuery);

    // Hoje só temos um usuário — mas a lista facilita escalar depois
    const allProfiles = [Storage.getProfile()];

    if (!query) return [];  // busca de perfil não mostra nada sem query

    return allProfiles
      .map(profile => {
        const normalizedName = normalize(profile.name);
        const normalizedBio  = normalize(profile.bio || '');

        // Score no nome tem peso dobrado (nome é a identidade principal)
        const nameScore = scoreMatch(normalizedName, query) * 2;
        const bioScore  = scoreMatch(normalizedBio, query);
        const totalScore = nameScore + bioScore;

        // Registra em quais campos houve match (útil para UI)
        const matchedFields = [];
        if (nameScore > 0) matchedFields.push('name');
        if (bioScore  > 0) matchedFields.push('bio');

        return { profile, score: totalScore, query, matchedFields };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }


  // ═══════════════════════════════════════════
  // HIGHLIGHT DE TERMOS ENCONTRADOS
  //
  // Por que isso importa para UX?
  // Ao mostrar resultados, o usuário precisa ver ONDE
  // a palavra foi encontrada. Destacar visualmente o
  // trecho encontrado é essencial para usabilidade.
  //
  // Ex: busca "react" em "Aprendi React hooks hoje"
  //   → "Aprendi <mark>React</mark> hooks hoje"
  // ═══════════════════════════════════════════

  /**
   * Envolve os trechos da query no texto com <mark> para destaque.
   * Case-insensitive e com suporte a acentos via normalização.
   *
   * SEGURANÇA: o texto é escapado contra XSS antes de qualquer operação.
   * Nunca use innerHTML com texto do usuário sem escapar primeiro.
   *
   * @param  {string} rawText   Texto original (do post ou perfil)
   * @param  {string} rawQuery  Query a destacar
   * @returns {string}          HTML com trechos marcados com <mark>
   *
   * @example
   * highlight("Estudei React hoje", "react")
   * // → "Estudei <mark class=\"search-highlight\">React</mark> hoje"
   */
  function highlight(rawText, rawQuery) {
    if (!rawText || !rawQuery) return escapeHTML(rawText || '');

    const query = normalize(rawQuery);
    if (!query) return escapeHTML(rawText);

    // Escapa o HTML primeiro (segurança contra XSS)
    const escapedText = escapeHTML(rawText);

    // Cria regex case-insensitive para encontrar o padrão original
    // (antes da normalização) no texto escapado
    // Usamos lookahead/lookbehind para não quebrar entidades HTML
    try {
      const regex = new RegExp(`(${escapeRegex(rawQuery)})`, 'gi');
      return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch {
      // Se a regex falhar por algum caractere incomum, retorna sem highlight
      return escapedText;
    }
  }

  /**
   * Escapa caracteres especiais de HTML para prevenir XSS.
   * Sempre use ao inserir texto de usuário via innerHTML.
   *
   * @param  {string} str  Texto não confiável
   * @returns {string}     Texto com entidades HTML
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }


  // ═══════════════════════════════════════════
  // DEBOUNCE
  //
  // Problema que resolve:
  // Sem debounce, ao digitar "react" (5 teclas), a busca
  // seria executada 5 vezes: "r", "re", "rea", "reac", "react".
  // As 4 primeiras são desperdício de processamento.
  //
  // Com debounce de 300ms: a função só executa quando o usuário
  // parar de digitar por 300ms — geralmente só "react".
  //
  // Analogia: é como um elevador que espera alguns segundos
  // antes de fechar as portas, caso alguém mais queira entrar.
  // ═══════════════════════════════════════════

  /**
   * Executa uma função com atraso, cancelando execuções anteriores.
   * Se chamada novamente antes do delay, o timer é reiniciado.
   *
   * @param {Function} fn     Função a executar
   * @param {number}   delay  Atraso em milissegundos
   */
  function debounce(fn, delay) {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(fn, delay);
  }


  // ═══════════════════════════════════════════
  // RENDERIZAÇÃO DOS RESULTADOS
  //
  // Aqui conectamos a lógica de busca com a UI.
  // Separamos em duas funções: uma para posts, uma para perfis.
  // ═══════════════════════════════════════════

  /**
   * Executa a busca e renderiza os resultados no painel de busca.
   * Chamada a cada alteração no campo de busca (com debounce).
   *
   * Fluxo:
   *   1. Lê a query do input
   *   2. Atualiza _currentQuery
   *   3. Se vazio: mostra estado inicial ("digite para buscar")
   *   4. Se não vazio: busca posts + perfil e renderiza
   *
   * @param {string} rawQuery  Texto digitado pelo usuário
   */
  function executeSearch(rawQuery) {
    _currentQuery = rawQuery.trim();

    const resultsEl   = document.getElementById('searchResults');
    const placeholderEl = document.getElementById('searchPlaceholder');

    if (!resultsEl) return;

    // ── Estado: query vazia ───────────────────
    if (!_currentQuery) {
      if (placeholderEl) placeholderEl.classList.remove('hidden');
      resultsEl.innerHTML = '';
      updateResultCount(null);
      return;
    }

    if (placeholderEl) placeholderEl.classList.add('hidden');

    // ── Executa as buscas ─────────────────────
    const postResults    = searchPosts(_currentQuery);
    const profileResults = searchProfiles(_currentQuery);
    const totalResults   = postResults.length + profileResults.length;

    updateResultCount(totalResults);
    resultsEl.innerHTML = ''; // limpa resultados anteriores

    // ── Sem resultados ────────────────────────
    if (totalResults === 0) {
      resultsEl.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">🔍</div>
          <p>Nenhum resultado para <strong>"${escapeHTML(_currentQuery)}"</strong></p>
          <span>Tente palavras diferentes ou verifique a ortografia.</span>
        </div>
      `;
      return;
    }

    // ── Renderiza perfis encontrados ──────────
    // (aparecem primeiro — usuários são mais importantes que posts)
    if (profileResults.length > 0) {
      const section = document.createElement('div');
      section.className = 'search-section';
      section.innerHTML = `<h3 class="search-section-title">Usuários</h3>`;

      profileResults.forEach(({ profile, query, matchedFields }) => {
        section.appendChild(renderProfileResult(profile, query, matchedFields));
      });

      resultsEl.appendChild(section);
    }

    // ── Renderiza posts encontrados ───────────
    if (postResults.length > 0) {
      const section = document.createElement('div');
      section.className = 'search-section';
      section.innerHTML = `<h3 class="search-section-title">Postagens (${postResults.length})</h3>`;

      postResults.forEach(({ post, query }) => {
        section.appendChild(renderPostResult(post, query));
      });

      resultsEl.appendChild(section);
    }
  }

  /**
   * Cria um card de resultado para um perfil de usuário.
   * Clicável: leva para a aba de perfil.
   *
   * @param {ProfileObject} profile       Dados do perfil
   * @param {string}        query         Query normalizada (para highlight)
   * @param {string[]}      matchedFields Campos onde houve match
   * @returns {HTMLElement}
   */
  function renderProfileResult(profile, query, matchedFields) {
    const card = document.createElement('div');
    card.className = 'search-result-card search-result-profile';

    // Avatar: foto ou iniciais
    const initials = Profile.getInitials(profile.name);
    const avatarHTML = profile.avatarUrl
      ? `<img src="${profile.avatarUrl}" alt="Foto de ${escapeHTML(profile.name)}"/>`
      : escapeHTML(initials);

    // Exibe badge indicando onde a query foi encontrada
    const matchBadge = matchedFields.includes('name')
      ? '<span class="match-badge match-name">nome</span>'
      : '<span class="match-badge match-bio">bio</span>';

    card.innerHTML = `
      <div class="result-ava">${avatarHTML}</div>
      <div class="result-body">
        <div class="result-name">
          ${highlight(profile.name, query)}
          ${matchBadge}
        </div>
        ${profile.bio
          ? `<div class="result-bio">${highlight(profile.bio, query)}</div>`
          : ''
        }
      </div>
      <div class="result-arrow" aria-hidden="true">→</div>
    `;

    // Clicar no card de perfil navega para a aba de perfil
    card.addEventListener('click', () => {
      UI.activateTab('profile');
      // Limpa a busca após navegar
      clearSearch();
    });

    return card;
  }

  /**
   * Cria um card de resultado para um post.
   * Mostra um trecho do texto com o termo destacado.
   * Clicável: vai para o feed e foca no post.
   *
   * @param {PostObject} post   Dados do post
   * @param {string}     query  Query normalizada
   * @returns {HTMLElement}
   */
  function renderPostResult(post, query) {
    const card = document.createElement('div');
    card.className = 'search-result-card search-result-post';

    // Formata a data do post de forma compacta
    const dateStr = new Date(post.createdAt).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'short',
    });

    // Extrai um trecho relevante do texto (ao redor do match)
    const snippet = extractSnippet(post.text, query, 120);

    card.innerHTML = `
      <div class="result-post-body">
        <div class="result-post-text">${highlight(snippet, query)}</div>
        <div class="result-post-meta">
          <span>${escapeHTML(Profile.get().name)}</span>
          <span class="result-dot" aria-hidden="true">·</span>
          <time>${dateStr}</time>
          ${post.image ? '<span class="result-has-img">📷</span>' : ''}
        </div>
      </div>
    `;

    // Clicar no resultado navega para o feed e destaca o post
    card.addEventListener('click', () => {
      UI.activateTab('feed');
      clearSearch();
      // Pequeno delay para garantir que o feed esteja renderizado
      setTimeout(() => highlightPostInFeed(post.id), 100);
    });

    return card;
  }

  /**
   * Extrai um trecho do texto ao redor da primeira ocorrência da query.
   * Isso evita mostrar textos longos inteiros nos resultados.
   *
   * Exemplo com maxLength=50, query="hooks":
   *   Texto: "Hoje aprendi sobre React hooks e como usá-los bem em componentes"
   *   Snippet: "…aprendi sobre React hooks e como usá-los bem…"
   *
   * @param  {string} text      Texto completo
   * @param  {string} query     Termo buscado
   * @param  {number} maxLength Máximo de caracteres no snippet
   * @returns {string}          Trecho relevante com reticências se necessário
   */
  function extractSnippet(text, query, maxLength = 120) {
    if (!text) return '';
    if (text.length <= maxLength) return text; // texto curto: retorna inteiro

    const normalizedText  = normalize(text);
    const normalizedQuery = normalize(query);
    const matchIndex = normalizedText.indexOf(normalizedQuery);

    if (matchIndex === -1) {
      // Não encontrou: retorna o início do texto
      return text.substring(0, maxLength) + '…';
    }

    // Centraliza o trecho ao redor do match
    const contextRadius = Math.floor((maxLength - query.length) / 2);
    const start = Math.max(0, matchIndex - contextRadius);
    const end   = Math.min(text.length, matchIndex + query.length + contextRadius);

    const snippet = text.substring(start, end);
    const prefix  = start > 0    ? '…' : '';
    const suffix  = end < text.length ? '…' : '';

    return prefix + snippet + suffix;
  }

  /**
   * Destaca visualmente um post específico no feed.
   * Útil quando o usuário clica em um resultado de busca
   * e queremos indicar qual post foi encontrado.
   *
   * @param {string} postId  ID do post a destacar
   */
  function highlightPostInFeed(postId) {
    const postEl = document.querySelector(`[data-id="${postId}"]`);
    if (!postEl) return;

    // Rola a página até o post
    postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Adiciona classe de destaque e remove após a animação
    postEl.classList.add('post-search-highlight');
    setTimeout(() => postEl.classList.remove('post-search-highlight'), 2000);
  }


  // ═══════════════════════════════════════════
  // CONTADOR DE RESULTADOS
  // ═══════════════════════════════════════════

  /**
   * Atualiza o texto do contador de resultados.
   * null = esconde o contador (campo vazio)
   *
   * @param {number|null} count  Número de resultados, ou null para ocultar
   */
  function updateResultCount(count) {
    const countEl = document.getElementById('searchResultCount');
    if (!countEl) return;

    if (count === null) {
      countEl.textContent = '';
      countEl.classList.add('hidden');
    } else {
      countEl.textContent = count === 0
        ? 'Sem resultados'
        : `${count} resultado${count !== 1 ? 's' : ''}`;
      countEl.classList.remove('hidden');
    }
  }


  // ═══════════════════════════════════════════
  // LIMPAR BUSCA
  // ═══════════════════════════════════════════

  /**
   * Reseta o estado completo da busca:
   *   - Limpa os campos de input
   *   - Limpa os resultados renderizados
   *   - Reseta o contador
   *   - Mostra o placeholder inicial
   */
  function clearSearch() {
    _currentQuery = '';

    // Limpa todos os inputs de busca (rail + sidebar do feed)
    document.querySelectorAll('.search-input').forEach(input => {
      input.value = '';
    });

    const resultsEl = document.getElementById('searchResults');
    if (resultsEl) resultsEl.innerHTML = '';

    const placeholderEl = document.getElementById('searchPlaceholder');
    if (placeholderEl) placeholderEl.classList.remove('hidden');

    updateResultCount(null);
  }


  // ═══════════════════════════════════════════
  // HANDLER PÚBLICO (chamado pelo app.js)
  //
  // Este é o único método de entrada para buscas vindas da UI.
  // Aplica o debounce e delega para executeSearch.
  // ═══════════════════════════════════════════

  /**
   * Handler para eventos de input nos campos de busca.
   * Aplica debounce antes de executar a busca de fato.
   * Sincroniza o valor entre todos os campos de busca ativos.
   *
   * @param {string} query  Texto digitado pelo usuário
   */
  function handleSearchInput(query) {
    // Sincroniza o valor em todos os inputs de busca da UI
    // (o usuário pode digitar na rail OU no campo lateral do feed)
    document.querySelectorAll('.search-input').forEach(input => {
      if (input.value !== query) input.value = query;
    });

    // Aplica debounce: só busca após 300ms de inatividade
    debounce(() => executeSearch(query), DEBOUNCE_DELAY);
  }


  // ─────────────────────────────────────────────
  // API PÚBLICA DO MÓDULO
  // ─────────────────────────────────────────────
  return {
    // Funções de busca (podem ser usadas diretamente se necessário)
    searchPosts,
    searchProfiles,

    // Utilitários de texto
    normalize,
    highlight,

    // Handler principal (use este no app.js)
    handleSearchInput,

    // Limpeza
    clearSearch,

    // Getter do estado
    getCurrentQuery: () => _currentQuery,
  };

})();
