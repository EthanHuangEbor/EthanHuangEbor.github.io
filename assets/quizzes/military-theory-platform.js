(function () {
  const BANK = window.MILITARY_THEORY_BANK;
  if (!BANK || !Array.isArray(BANK.questions)) {
    document.getElementById('appRoot').innerHTML = '<section class="empty-card"><strong>题库未加载</strong><p>请检查 military-theory-bank.js 是否存在。</p></section>';
    return;
  }

  const STORAGE_KEY = 'hyb-military-theory-platform-v1';
  const root = document.getElementById('appRoot');
  const toast = document.getElementById('toast');
  const QUESTIONS = BANK.questions;
  const OBJECTIVE = QUESTIONS.filter(q => q.type !== 'essay');
  const CHAPTERS = BANK.chapters.map(ch => ch.name);
  const DIFFICULTIES = BANK.difficulties || ['基础', '易混', '综合'];
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];
  const TYPE_LABEL = { choice: '选择', judge: '判断', essay: '论述' };
  const KNOWLEDGE = parseOutline(BANK.outlineText || '');

  const defaultState = {
    view: 'practice',
    filters: { chapter: 'all', type: 'all', difficulty: 'all', scope: 'all', query: '' },
    strategy: 'sequential',
    count: '20',
    deckIds: [],
    deckSig: '',
    current: 0,
    examMode: false,
    draft: {},
    answers: {},
    starred: {},
    mastered: {},
    reviewQuery: '',
    reviewChapter: 'all',
    errorChapter: 'all',
    history: []
  };

  let state = loadState();
  render();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return mergeState(defaultState, saved);
    } catch (error) {
      return structuredClone(defaultState);
    }
  }

  function mergeState(base, saved) {
    return {
      ...base,
      ...saved,
      filters: { ...base.filters, ...(saved.filters || {}) },
      draft: saved.draft || {},
      answers: saved.answers || {},
      starred: saved.starred || {},
      mastered: saved.mastered || {},
      history: saved.history || []
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '');
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function answerOf(id) {
    return state.answers[id];
  }

  function isAnswered(q) {
    return Boolean(answerOf(q.id)?.checked);
  }

  function isCorrect(q) {
    const ans = answerOf(q.id);
    return Boolean(ans && ans.checked && ans.correct === true);
  }

  function filteredQuestions() {
    const f = state.filters;
    const query = normalize(f.query);
    return QUESTIONS.filter(q => {
      if (f.chapter !== 'all' && q.chapter !== f.chapter) return false;
      if (f.type !== 'all' && q.type !== f.type) return false;
      if (f.difficulty !== 'all' && q.difficulty !== f.difficulty) return false;
      if (f.scope === 'unanswered' && isAnswered(q)) return false;
      if (f.scope === 'wrong' && answerOf(q.id)?.correct !== false) return false;
      if (f.scope === 'starred' && !state.starred[q.id]) return false;
      if (query) {
        const haystack = normalize([q.stem, q.chapter, q.point, q.difficulty, q.explanation, ...(q.tags || [])].join(' '));
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  function deckSignature() {
    return JSON.stringify({ filters: state.filters, strategy: state.strategy, count: state.count, examMode: state.examMode });
  }

  function buildDeck(force) {
    const sig = deckSignature();
    if (!force && state.deckSig === sig && state.deckIds.length) return;
    let deck = filteredQuestions();
    if (state.strategy === 'random') deck = shuffle(deck);
    const limit = state.count === 'all' ? deck.length : Number(state.count || 20);
    state.deckIds = deck.slice(0, limit).map(q => q.id);
    state.current = 0;
    state.deckSig = sig;
    saveState();
  }

  function currentQuestion() {
    buildDeck(false);
    const id = state.deckIds[Math.min(state.current, Math.max(0, state.deckIds.length - 1))];
    return QUESTIONS.find(q => q.id === id) || null;
  }

  function getStats() {
    const answeredObjective = OBJECTIVE.filter(isAnswered);
    const correct = OBJECTIVE.filter(isCorrect);
    const wrong = OBJECTIVE.filter(q => answerOf(q.id)?.correct === false);
    const essaysAnswered = QUESTIONS.filter(q => q.type === 'essay' && isAnswered(q)).length;
    const coverage = OBJECTIVE.length ? Math.round(answeredObjective.length / OBJECTIVE.length * 100) : 0;
    const accuracy = answeredObjective.length ? Math.round(correct.length / answeredObjective.length * 100) : 0;
    const score = Math.round(accuracy * 0.7 + coverage * 0.3);
    return { answeredObjective, correct, wrong, essaysAnswered, coverage, accuracy, score };
  }

  function chapterStats(chapter) {
    const qs = OBJECTIVE.filter(q => q.chapter === chapter);
    const answered = qs.filter(isAnswered);
    const correct = qs.filter(isCorrect);
    const wrong = qs.filter(q => answerOf(q.id)?.correct === false);
    const coverage = qs.length ? answered.length / qs.length : 0;
    const accuracy = answered.length ? correct.length / answered.length : 0;
    const score = Math.round(accuracy * 70 + coverage * 30);
    return { total: qs.length, answered: answered.length, correct: correct.length, wrong: wrong.length, score };
  }

  function render() {
    buildDeck(false);
    root.innerHTML = renderHero() + renderMetrics() + renderTabs() + renderView();
    updateProgressBar();
  }

  function renderHero() {
    const meta = BANK.meta;
    return `
      <section class="hero">
        <div class="hero-main">
          <p class="kicker">Military Theory Review</p>
          <h1>军理刷题平台</h1>
          <p class="hero-copy">${escapeHtml(meta.source)}。题库、章节地图、模拟卷、错题本和复盘导出合在一个静态页面里。</p>
          <div class="hero-actions">
            <button class="button primary" type="button" data-action="start-practice">开始刷题</button>
            <button class="button subtle" type="button" data-action="start-mock">生成模拟卷</button>
            <button class="button" type="button" data-view="errors">查看错题本</button>
          </div>
        </div>
        <aside class="hero-side">
          <div>
            <div class="micro-label">Question Bank</div>
            <div class="source-list">
              <div class="source-item"><strong>${meta.questionCount} 题</strong><span>选择 ${meta.byType.choice || 0} / 判断 ${meta.byType.judge || 0} / 论述 ${meta.byType.essay || 0}</span></div>
              <div class="source-item"><strong>${meta.objectiveCount} 道客观题</strong><span>自动判分，错题自动进入复盘视图。</span></div>
              <div class="source-item"><strong>Vercel Ready</strong><span>静态资源拆分，支持 /military-theory 短路径。</span></div>
            </div>
          </div>
        </aside>
      </section>
    `;
  }

  function renderMetrics() {
    const s = getStats();
    return `
      <section class="metrics" aria-label="学习统计">
        ${metric(String(s.score), '掌握度', `覆盖 ${s.coverage}% / 正确率 ${s.accuracy}%`)}
        ${metric(`${s.correct.length}/${OBJECTIVE.length}`, '客观题得分', `${s.answeredObjective.length} 已作答`)}
        ${metric(String(s.wrong.length), '错题', `${Object.keys(state.starred).filter(id => state.starred[id]).length} 已收藏`)}
        ${metric(String(s.essaysAnswered), '论述题', '答案要点自查')}
      </section>
    `;
  }

  function metric(value, label, note) {
    return `<div class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(note)}</small></div>`;
  }

  function renderTabs() {
    const tabs = [
      ['practice', '刷题', '筛选、答题、即时反馈'],
      ['exam', '模拟卷', '按题型快速组卷'],
      ['review', '复习地图', '按章节过知识点'],
      ['errors', '错题本', '薄弱点与复盘导出']
    ];
    return `<nav class="mode-tabs" aria-label="学习模式">${tabs.map(tab => `
      <button class="mode-tab ${state.view === tab[0] ? 'active' : ''}" type="button" data-view="${tab[0]}">
        <strong>${tab[1]}</strong><span>${tab[2]}</span>
      </button>`).join('')}</nav>`;
  }

  function renderView() {
    if (state.view === 'review') return renderReview();
    if (state.view === 'errors') return renderErrors();
    if (state.view === 'exam') return renderExam();
    return renderPractice();
  }

  function renderPractice() {
    const q = currentQuestion();
    return `
      <section class="workspace">
        ${renderPracticePanel()}
        <div>
          ${q ? renderQuestion(q) : renderEmpty('没有匹配题目', '换一个章节、题型或范围再试。')}
          ${renderDeckStrip()}
        </div>
      </section>
    `;
  }

  function renderPracticePanel() {
    const f = state.filters;
    const deckCount = state.deckIds.length;
    return `
      <aside class="panel sticky">
        <h2>${state.examMode ? '模拟卷设置' : '刷题设置'}</h2>
        <div class="form-grid">
          ${selectField('chapter', '章节', [['all', '全部章节'], ...CHAPTERS.map(ch => [ch, ch])], f.chapter)}
          ${selectField('type', '题型', [['all', '全部题型'], ['choice', '选择题'], ['judge', '判断题'], ['essay', '论述题']], f.type)}
          ${selectField('difficulty', '难度', [['all', '全部难度'], ...DIFFICULTIES.map(d => [d, d])], f.difficulty)}
          ${selectField('scope', '范围', [['all', '全部题目'], ['unanswered', '未答题'], ['wrong', '错题'], ['starred', '收藏题']], f.scope)}
          <div class="field"><label for="queryInput">搜索</label><input id="queryInput" type="search" value="${escapeHtml(f.query)}" placeholder="国防动员 / 信息化战争" data-filter="query" /></div>
          ${selectField('strategy', '顺序', [['sequential', '顺序'], ['random', '随机']], state.strategy, true)}
          ${selectField('count', '本轮数量', [['10', '10 题'], ['20', '20 题'], ['40', '40 题'], ['all', '全部']], state.count, true)}
        </div>
        <div class="row-actions">
          <button class="button primary" type="button" data-action="reset-deck">重排本轮</button>
          <button class="button ghost" type="button" data-action="clear-exam">普通刷题</button>
        </div>
        <div class="progress-box">
          <div class="progress-line"><i id="deckProgress"></i></div>
          <div class="progress-text" id="deckProgressText">本轮 ${deckCount} 题</div>
        </div>
      </aside>
    `;
  }

  function selectField(name, label, options, value, topLevel) {
    const attr = topLevel ? `data-state="${name}"` : `data-filter="${name}"`;
    return `<div class="field"><label for="${name}Select">${label}</label><select id="${name}Select" ${attr}>${options.map(item => `<option value="${escapeHtml(item[0])}" ${item[0] === value ? 'selected' : ''}>${escapeHtml(item[1])}</option>`).join('')}</select></div>`;
  }

  function renderQuestion(q) {
    const ans = answerOf(q.id);
    return `
      <article class="question-card">
        <div class="question-top">
          <div>
            <div class="q-index">${state.current + 1}/${state.deckIds.length}</div>
            <h2 class="question-title">${escapeHtml(q.stem)}</h2>
            <div class="badges">
              <span class="badge strong">${escapeHtml(TYPE_LABEL[q.type])}</span>
              <span class="badge">${escapeHtml(q.difficulty)}</span>
              <span class="badge">${escapeHtml(q.chapter)}</span>
              <span class="badge">${escapeHtml(q.point)}</span>
            </div>
          </div>
          <button class="button ${state.starred[q.id] ? 'warn' : 'ghost'}" type="button" data-action="toggle-star" data-id="${escapeHtml(q.id)}">${state.starred[q.id] ? '已收藏' : '收藏'}</button>
        </div>
        ${q.type === 'essay' ? renderEssay(q, ans) : renderObjective(q, ans)}
        ${renderQuestionActions(q, ans)}
      </article>
    `;
  }

  function renderObjective(q, ans) {
    const selected = state.draft[q.id] ?? ans?.value;
    const options = q.type === 'judge'
      ? [{ label: '对', value: true }, { label: '错', value: false }]
      : q.options.map((label, index) => ({ label, value: index }));
    const checked = Boolean(ans?.checked);
    return `
      <div class="option-list">
        ${options.map((opt, index) => {
          const key = q.type === 'judge' ? opt.label : LETTERS[index];
          const isSelected = String(selected) === String(opt.value);
          const isRight = checked && String(opt.value) === String(q.answer);
          const isWrong = checked && isSelected && !isRight;
          return `<button class="option-card ${isSelected ? 'selected' : ''} ${isRight ? 'correct' : ''} ${isWrong ? 'wrong' : ''}" type="button" data-select="${escapeHtml(q.id)}" data-value="${escapeHtml(String(opt.value))}"><span class="option-key">${escapeHtml(key)}</span><span>${escapeHtml(opt.label)}</span></button>`;
        }).join('')}
      </div>
      ${checked ? renderFeedback(q, ans) : ''}
    `;
  }

  function renderEssay(q, ans) {
    const value = state.draft[q.id] ?? ans?.value ?? '';
    return `
      <textarea class="answer-box" data-essay="${escapeHtml(q.id)}" placeholder="这里写你的答题提纲，提交后对照要点自查。">${escapeHtml(value)}</textarea>
      ${ans?.checked ? renderFeedback(q, ans) : ''}
    `;
  }

  function renderFeedback(q, ans) {
    if (q.type === 'essay') {
      return `<div class="feedback"><strong>答案要点</strong><ol class="point-list">${(q.points || []).map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ol></div>`;
    }
    const ok = ans.correct === true;
    const answerText = q.type === 'judge' ? (q.answer ? '对' : '错') : `${LETTERS[q.answer]} ${q.options[q.answer]}`;
    return `<div class="feedback ${ok ? 'good' : 'bad'}"><strong>${ok ? '回答正确' : '需要回看'}</strong><p>正确答案：${escapeHtml(answerText)}</p><p>${escapeHtml(q.explanation)}</p></div>`;
  }

  function renderQuestionActions(q, ans) {
    return `
      <div class="row-actions">
        <button class="button" type="button" data-action="prev-question" ${state.current <= 0 ? 'disabled' : ''}>上一题</button>
        <button class="button primary" type="button" data-action="check-question">${q.type === 'essay' ? '查看要点' : '提交答案'}</button>
        <button class="button" type="button" data-action="next-question" ${state.current >= state.deckIds.length - 1 ? 'disabled' : ''}>下一题</button>
        ${ans?.checked ? '<button class="button subtle" type="button" data-action="copy-current">导出本题</button>' : ''}
      </div>
    `;
  }

  function renderDeckStrip() {
    if (!state.deckIds.length) return '';
    return `<div class="deck-strip" aria-label="本轮题目导航">${state.deckIds.map((id, index) => {
      const q = QUESTIONS.find(item => item.id === id);
      const ans = answerOf(id);
      const cls = index === state.current ? 'active' : ans?.correct === false ? 'wrong' : ans?.checked ? 'done' : '';
      return `<button class="deck-dot ${cls}" type="button" data-action="jump-question" data-index="${index}" title="${escapeHtml(q?.point || '')}">${index + 1}</button>`;
    }).join('')}</div>`;
  }

  function renderExam() {
    const sample = makeMockDeck(false);
    return `
      <section class="workspace">
        <aside class="panel sticky">
          <h2>模拟卷</h2>
          <p class="muted">当前题库按选择、判断、论述组合，适合做一轮限时自测。</p>
          <div class="source-list">
            <div class="source-item"><strong>${sample.choice} 道选择</strong><span>覆盖五章基础和易混点。</span></div>
            <div class="source-item"><strong>${sample.judge} 道判断</strong><span>快速检查概念边界。</span></div>
            <div class="source-item"><strong>${sample.essay} 道论述</strong><span>按要点自查，不自动判分。</span></div>
          </div>
          <div class="row-actions"><button class="button primary" type="button" data-action="start-mock">生成并开始</button></div>
        </aside>
        <div class="question-card">
          <p class="kicker">Mock Paper</p>
          <h2>考前模拟卷</h2>
          <p class="muted">生成后会进入刷题视图，并锁定一套随机题组。答题记录仍会进入错题本和掌握度分析。</p>
          <div class="analysis-list">${CHAPTERS.filter(ch => !ch.includes('/')).map(ch => {
            const st = chapterStats(ch);
            return `<div class="analysis-row"><div><strong>${escapeHtml(ch)}</strong><span>${st.total} 道客观题可抽取</span></div><span class="score-pill">${st.score}</span></div>`;
          }).join('')}</div>
        </div>
      </section>
    `;
  }

  function renderReview() {
    const query = normalize(state.reviewQuery);
    const chapters = KNOWLEDGE.filter(ch => state.reviewChapter === 'all' || ch.title === state.reviewChapter);
    return `
      <section class="workspace">
        <aside class="panel sticky">
          <h2>复习地图</h2>
          <div class="form-grid">
            <div class="field"><label for="reviewQuery">搜索知识点</label><input id="reviewQuery" type="search" value="${escapeHtml(state.reviewQuery)}" data-review-query placeholder="国防法 / 制信息权" /></div>
            ${selectReviewChapter()}
          </div>
        </aside>
        <div class="review-grid">
          ${chapters.map(ch => renderReviewChapter(ch, query)).join('') || renderEmpty('没有匹配知识点', '换一个关键词或章节。')}
        </div>
      </section>
    `;
  }

  function selectReviewChapter() {
    return `<div class="field"><label for="reviewChapter">章节</label><select id="reviewChapter" data-review-chapter><option value="all">全部章节</option>${KNOWLEDGE.map(ch => `<option value="${escapeHtml(ch.title)}" ${state.reviewChapter === ch.title ? 'selected' : ''}>${escapeHtml(ch.title)}</option>`).join('')}</select></div>`;
  }

  function renderReviewChapter(ch, query) {
    const points = ch.points.filter(point => {
      if (!query) return true;
      return normalize([point.title, point.body, ch.title].join(' ')).includes(query);
    }).slice(0, 12);
    if (!points.length) return '';
    const mastered = points.filter(point => state.mastered[point.key]).length;
    return `
      <article class="review-card">
        <header><div><h3>${escapeHtml(ch.title)}</h3><p class="muted">${mastered}/${points.length} 已标记掌握</p></div><button class="small-button" type="button" data-action="drill-chapter" data-chapter="${escapeHtml(ch.title)}">专项刷题</button></header>
        <div class="review-points">${points.map(point => `
          <div class="point-card ${state.mastered[point.key] ? 'mastered' : ''}">
            <strong>${escapeHtml(point.title)}</strong>
            <p>${escapeHtml(point.body || '提纲条目')}</p>
            <div class="point-actions"><button class="small-button ${state.mastered[point.key] ? 'active' : ''}" type="button" data-action="toggle-mastered" data-key="${escapeHtml(point.key)}">${state.mastered[point.key] ? '已掌握' : '标记掌握'}</button></div>
          </div>`).join('')}</div>
      </article>
    `;
  }

  function renderErrors() {
    const wrong = QUESTIONS.filter(q => answerOf(q.id)?.correct === false || state.starred[q.id]);
    const visible = wrong.filter(q => state.errorChapter === 'all' || q.chapter === state.errorChapter);
    return `
      <section class="workspace">
        <aside class="panel sticky">
          <h2>错题本</h2>
          ${selectErrorChapter()}
          <div class="row-actions"><button class="button primary" type="button" data-action="download-review">导出复盘 Markdown</button><button class="button ghost" type="button" data-action="clear-progress">清空记录</button></div>
        </aside>
        <div>
          <div class="question-card">
            <h2>掌握度分析</h2>
            <div class="analysis-list">${CHAPTERS.filter(ch => !ch.includes('/')).map(ch => {
              const st = chapterStats(ch);
              return `<div class="analysis-row"><div><strong>${escapeHtml(ch)}</strong><span>已答 ${st.answered}/${st.total}，正确 ${st.correct}，错题 ${st.wrong}</span></div><span class="score-pill">${st.score}</span></div>`;
            }).join('')}</div>
          </div>
          <div class="error-list">${visible.length ? visible.map(renderErrorCard).join('') : renderEmpty('错题本是空的', '做完一轮客观题后，这里会自动出现需要复盘的题。')}</div>
        </div>
      </section>
    `;
  }

  function selectErrorChapter() {
    return `<div class="field"><label for="errorChapter">章节</label><select id="errorChapter" data-error-chapter><option value="all">全部章节</option>${CHAPTERS.map(ch => `<option value="${escapeHtml(ch)}" ${state.errorChapter === ch ? 'selected' : ''}>${escapeHtml(ch)}</option>`).join('')}</select></div>`;
  }

  function renderErrorCard(q) {
    const ans = answerOf(q.id);
    const your = q.type === 'judge' ? (ans?.value === true || ans?.value === 'true' ? '对' : '错') : q.options[Number(ans?.value)] || '未记录';
    const right = q.type === 'judge' ? (q.answer ? '对' : '错') : `${LETTERS[q.answer]} ${q.options[q.answer]}`;
    return `<article class="error-card"><h3>${escapeHtml(q.stem)}</h3><p>你的答案：${escapeHtml(your)}；正确答案：${escapeHtml(right)}</p><p>${escapeHtml(q.explanation)}</p><div class="badges"><span class="badge">${escapeHtml(q.chapter)}</span><span class="badge">${escapeHtml(q.point)}</span><span class="badge">${escapeHtml(q.difficulty)}</span></div></article>`;
  }

  function renderEmpty(title, body) {
    return `<section class="empty-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></section>`;
  }

  function updateProgressBar() {
    const bar = document.getElementById('deckProgress');
    const text = document.getElementById('deckProgressText');
    if (!bar || !text) return;
    const done = state.deckIds.filter(id => answerOf(id)?.checked).length;
    const total = state.deckIds.length || 1;
    bar.style.width = `${Math.round(done / total * 100)}%`;
    text.textContent = `本轮 ${state.deckIds.length} 题；已完成 ${done} 题；当前位置 ${Math.min(state.current + 1, state.deckIds.length || 1)}`;
  }

  function checkCurrent() {
    const q = currentQuestion();
    if (!q) return;
    if (q.type === 'essay') {
      const value = state.draft[q.id] || '';
      state.answers[q.id] = { value, checked: true, correct: null, at: new Date().toISOString() };
      pushHistory(q, null);
      saveState();
      render();
      return;
    }
    const raw = state.draft[q.id];
    if (raw === undefined || raw === '') {
      showToast('先选择一个答案');
      return;
    }
    const value = q.type === 'judge' ? raw === 'true' || raw === true : Number(raw);
    const correct = value === q.answer;
    state.answers[q.id] = { value, checked: true, correct, at: new Date().toISOString() };
    if (!correct) state.starred[q.id] = true;
    pushHistory(q, correct);
    saveState();
    render();
  }

  function pushHistory(q, correct) {
    state.history.unshift({ id: q.id, correct, chapter: q.chapter, point: q.point, at: new Date().toISOString() });
    state.history = state.history.slice(0, 160);
  }

  function makeMockDeck(apply) {
    const choices = shuffle(QUESTIONS.filter(q => q.type === 'choice')).slice(0, 24);
    const judges = shuffle(QUESTIONS.filter(q => q.type === 'judge')).slice(0, 10);
    const essays = shuffle(QUESTIONS.filter(q => q.type === 'essay')).slice(0, 3);
    const ids = shuffle([...choices, ...judges, ...essays]).map(q => q.id);
    if (apply) {
      state.view = 'practice';
      state.examMode = true;
      state.deckIds = ids;
      state.current = 0;
      state.deckSig = deckSignature();
      saveState();
      render();
    }
    return { choice: choices.length, judge: judges.length, essay: essays.length, ids };
  }

  function setFilter(name, value) {
    state.filters[name] = value;
    state.examMode = false;
    state.deckSig = '';
    saveState();
    render();
  }

  function parseOutline(text) {
    const lines = String(text || '').replace(/\f/g, '\n').split(/\n+/).map(line => line.trim()).filter(Boolean);
    const chapters = [];
    let current = null;
    let lastPoint = null;
    lines.forEach(line => {
      if (/^第[一二三四五六七八九十]+章/.test(line)) {
        current = { title: line, points: [] };
        chapters.push(current);
        lastPoint = null;
        return;
      }
      if (!current) return;
      if (/^(第[一二三四五六七八九十]+节|[一二三四五六七八九十]+、|\d+\.|·)/.test(line)) {
        const title = line.replace(/^第[一二三四五六七八九十]+节\s*/, '').replace(/^[一二三四五六七八九十]+、/, '').replace(/^\d+\./, '').replace(/^·/, '').trim();
        const key = `${current.title}::${title}`;
        lastPoint = { key, title: title.slice(0, 54), body: line.length > 54 ? line.slice(54) : '' };
        current.points.push(lastPoint);
      } else if (lastPoint) {
        lastPoint.body = `${lastPoint.body} ${line}`.trim().slice(0, 180);
      }
    });
    return chapters.map(ch => ({ ...ch, points: ch.points.slice(0, 18) }));
  }

  function generateReviewMarkdown() {
    const s = getStats();
    const wrong = QUESTIONS.filter(q => answerOf(q.id)?.correct === false);
    const lines = [
      '---',
      'title: 军事理论刷题复盘',
      `date: ${new Date().toISOString().slice(0, 10)}`,
      'domain: 课程',
      'status: draft',
      'summary: 军事理论刷题平台导出的错题与掌握度复盘。',
      'tags: [军事理论, 刷题, 错题复盘]',
      '---',
      '',
      '# 军事理论刷题复盘',
      '',
      `- 掌握度：${s.score}`,
      `- 客观题正确率：${s.accuracy}%`,
      `- 客观题覆盖率：${s.coverage}%`,
      `- 错题数量：${wrong.length}`,
      '',
      '## 薄弱章节',
      ''
    ];
    CHAPTERS.filter(ch => !ch.includes('/')).map(ch => [ch, chapterStats(ch)]).sort((a, b) => a[1].score - b[1].score).forEach(([ch, st]) => {
      lines.push(`- ${ch}：掌握度 ${st.score}，已答 ${st.answered}/${st.total}，错题 ${st.wrong}`);
    });
    lines.push('', '## 错题列表', '');
    wrong.forEach((q, index) => {
      const ans = answerOf(q.id);
      const your = q.type === 'judge' ? (ans.value === true || ans.value === 'true' ? '对' : '错') : q.options[Number(ans.value)] || '未记录';
      const right = q.type === 'judge' ? (q.answer ? '对' : '错') : q.options[q.answer];
      lines.push(`### ${index + 1}. ${q.point}`);
      lines.push(`- 章节：${q.chapter}`);
      lines.push(`- 题干：${q.stem}`);
      lines.push(`- 我的答案：${your}`);
      lines.push(`- 正确答案：${right}`);
      lines.push(`- 解析：${q.explanation}`);
      lines.push('');
    });
    lines.push('相关节点：[[军事理论期末刷题记录]]、[[LLM-Wiki 与个人知识图谱]]');
    return lines.join('\n');
  }

  function downloadMarkdown() {
    const text = generateReviewMarkdown();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `military-theory-review-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('复盘 Markdown 已生成');
  }

  function copyCurrent() {
    const q = currentQuestion();
    if (!q) return;
    const text = [`### ${q.point}`, '', `- 章节：${q.chapter}`, `- 题干：${q.stem}`, `- 解析：${q.explanation}`].join('\n');
    navigator.clipboard?.writeText(text).then(() => showToast('本题复盘已复制')).catch(() => showToast('浏览器未允许复制'));
  }

  document.addEventListener('click', event => {
    const viewBtn = event.target.closest('[data-view]');
    if (viewBtn) {
      state.view = viewBtn.dataset.view;
      saveState();
      render();
      return;
    }
    const optionBtn = event.target.closest('[data-select]');
    if (optionBtn) {
      state.draft[optionBtn.dataset.select] = optionBtn.dataset.value;
      saveState();
      render();
      return;
    }
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;
    if (action === 'start-practice') { state.view = 'practice'; state.examMode = false; state.deckSig = ''; buildDeck(true); render(); }
    if (action === 'reset-deck') { state.examMode = false; buildDeck(true); render(); }
    if (action === 'start-mock') makeMockDeck(true);
    if (action === 'clear-exam') { state.examMode = false; state.deckSig = ''; buildDeck(true); render(); }
    if (action === 'prev-question') { state.current = Math.max(0, state.current - 1); saveState(); render(); }
    if (action === 'next-question') { state.current = Math.min(state.deckIds.length - 1, state.current + 1); saveState(); render(); }
    if (action === 'jump-question') { state.current = Number(actionBtn.dataset.index || 0); saveState(); render(); }
    if (action === 'check-question') checkCurrent();
    if (action === 'toggle-star') { const id = actionBtn.dataset.id; state.starred[id] = !state.starred[id]; saveState(); render(); }
    if (action === 'copy-current') copyCurrent();
    if (action === 'drill-chapter') { state.view = 'practice'; state.filters.chapter = actionBtn.dataset.chapter; state.filters.scope = 'all'; state.examMode = false; state.deckSig = ''; buildDeck(true); render(); }
    if (action === 'toggle-mastered') { const key = actionBtn.dataset.key; state.mastered[key] = !state.mastered[key]; saveState(); render(); }
    if (action === 'download-review') downloadMarkdown();
    if (action === 'clear-progress') { if (confirm('确认清空军理刷题记录？')) { state = structuredClone(defaultState); saveState(); render(); } }
  });

  document.addEventListener('change', event => {
    const filter = event.target.dataset.filter;
    if (filter) setFilter(filter, event.target.value);
    const stateKey = event.target.dataset.state;
    if (stateKey) { state[stateKey] = event.target.value; state.examMode = false; state.deckSig = ''; saveState(); render(); }
    if (event.target.dataset.reviewChapter !== undefined) { state.reviewChapter = event.target.value; saveState(); render(); }
    if (event.target.dataset.errorChapter !== undefined) { state.errorChapter = event.target.value; saveState(); render(); }
  });

  document.addEventListener('input', event => {
    if (event.target.dataset.filter === 'query') {
      state.filters.query = event.target.value;
      state.examMode = false;
      state.deckSig = '';
      saveState();
      render();
    }
    if (event.target.dataset.reviewQuery !== undefined) {
      state.reviewQuery = event.target.value;
      saveState();
      render();
    }
    if (event.target.dataset.essay) {
      state.draft[event.target.dataset.essay] = event.target.value;
      saveState();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea, select')) return;
    const q = currentQuestion();
    if (!q) return;
    if (q.type === 'choice' && /^[1-4]$/.test(event.key)) {
      state.draft[q.id] = String(Number(event.key) - 1);
      saveState();
      render();
    }
    if (q.type === 'judge' && (event.key === '1' || event.key === '2')) {
      state.draft[q.id] = event.key === '1' ? 'true' : 'false';
      saveState();
      render();
    }
    if (event.key === 'Enter') checkCurrent();
    if (event.key === 'ArrowRight') { state.current = Math.min(state.deckIds.length - 1, state.current + 1); saveState(); render(); }
    if (event.key === 'ArrowLeft') { state.current = Math.max(0, state.current - 1); saveState(); render(); }
  });
})();
