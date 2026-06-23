const state = {
  site: null,
  knowledge: null,
  life: null,
  graph: null,
  articleCache: new Map()
};

const routes = {
  home: { label: '首页' },
  cv: { label: '科研经历' },
  'student-work': { label: '学工经历' },
  awards: { label: '所获奖项' },
  knowledge: { label: '知识图谱' },
  life: { label: '生活' },
  guestbook: { label: '留言' },
  play: { label: '见天地' },
  people: { label: '见众生' },
  diary: { label: '见自己' },
  eat: { label: '好吃的' },
  drink: { label: '好喝的' },
  workshop: { label: 'Future Lab' },
  about: { label: 'About' }
};

const categoryInfo = {
  eat: {
    title: '好吃的',
    eyebrow: '致谢',
    description: '感谢那些确实让人恢复能量的饭、店、菜和当时的心情。',
    empty: '还没有吃的记录。向 content/life/eat/ 添加 Markdown 即可。'
  },
  drink: {
    title: '好喝的',
    eyebrow: '致谢',
    description: '感谢咖啡、酒、茶和其他饮品在具体时刻提供的风味、陪伴和松弛。',
    empty: '还没有喝的记录。向 content/life/drink/ 添加 Markdown 即可。'
  },
  play: {
    title: '见天地',
    eyebrow: 'Travel Notes',
    description: '旅行、城市漫游、展览和路上的判断。它不追求打卡密度，更关心一个地方怎样改变了视野。',
    empty: '这里暂时留空。你可以先把旅行和城市漫游写进 content/life/play/。'
  },
  people: {
    title: '见众生',
    eyebrow: 'People Notes',
    description: '人物短记、对话片段和身边人的微小亮光。重点不是传记，而是一次相遇留下了什么判断。',
    empty: '这里暂时留空。你可以把人物短记写进 content/life/people/。'
  },
  diary: {
    title: '见自己',
    eyebrow: 'Growth Notes',
    description: '个人成长、日记、复盘和恢复力。它们是知识图谱背后的长期语料。',
    empty: '还没有日记。向 content/life/diary/ 添加 Markdown 即可。'
  }
};

const app = document.getElementById('app');
const nav = document.getElementById('mainNav');
const menuButton = document.getElementById('menuButton');

init();

async function init() {
  bindGlobalEvents();
  try {
    const [site, knowledge, life] = await Promise.all([
      fetchJson('data/site.json'),
      fetchJson('data/knowledge-index.json'),
      fetchJson('data/life-index.json')
    ]);
    state.site = site;
    state.knowledge = knowledge;
    state.life = life;
    hydrateChrome();
    renderCurrentRoute();
  } catch (error) {
    app.innerHTML = `
      <section class="page">
        <div class="error-card">
          <h1>站点数据未能加载</h1>
          <p>请确认已经运行 <code>node scripts/build-index.mjs</code>，并通过本地服务器预览，例如 <code>python3 -m http.server 8000</code>。直接双击 index.html 时，浏览器可能会阻止读取本地 JSON。</p>
          <pre>${escapeHtml(error.message)}</pre>
        </div>
      </section>`;
  }
}

function bindGlobalEvents() {
  window.addEventListener('hashchange', renderCurrentRoute);
  menuButton?.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
  nav?.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal();
      document.body.classList.remove('nav-open');
      menuButton?.setAttribute('aria-expanded', 'false');
    }
  });
}

function hydrateChrome() {
  const profile = state.site.profile;
  document.title = 'HYB的个人主页';
  const brandAvatar = document.getElementById('brandAvatar');
  if (brandAvatar) {
    brandAvatar.innerHTML = `<img src="${escapeAttr(profile.avatarImage || 'assets/img/dog-avatar.png')}" alt="${escapeAttr(profile.avatarAlt || '小狗头像')}" />`;
  }
  document.getElementById('brandName').textContent = profile.name || 'Ethan Huang';
  document.getElementById('brandTitle').textContent = profile.title || 'BUAA · Propulsion';
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

function routeFromHash() {
  const raw = location.hash.replace(/^#\/?/, '').trim();
  const route = raw.split('/')[0] || 'home';
  return routes[route] ? route : 'home';
}

function renderCurrentRoute() {
  if (!state.site) return;
  destroyGraph();
  const route = routeFromHash();
  setActiveNav(route);
  document.body.classList.remove('nav-open');
  menuButton?.setAttribute('aria-expanded', 'false');

  if (route === 'home') renderHome();
  else if (route === 'cv') renderCv();
  else if (route === 'student-work') renderStudentWork();
  else if (route === 'awards') renderAwards();
  else if (route === 'knowledge') renderKnowledge();
  else if (route === 'life') renderLifeHub();
  else if (route === 'guestbook') renderGuestbook();
  else if (['play', 'people', 'diary', 'eat', 'drink'].includes(route)) renderLife(route);
  else if (route === 'workshop') renderWorkshop();
  else if (route === 'about') renderAbout();
  app.focus({ preventScroll: true });
}

function setActiveNav(route) {
  const navRoute = ['play', 'people', 'diary', 'eat', 'drink'].includes(route) ? 'life' : route;
  document.querySelectorAll('.nav a').forEach(link => {
    link.classList.toggle('active', link.dataset.route === navRoute);
  });
}

function renderHome() {
  const { profile, heroStats, projects, siteReflections = [] } = state.site;
  const stats = heroStats.map(stat => ({
    ...stat,
    value: stat.value === 'auto' ? String(state.knowledge.stats.nodes) : stat.value
  }));
  const recentNotes = [...state.knowledge.records]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 4);
  const researchProjects = projects.slice(0, 4);

  app.innerHTML = `
    <section class="page hero">
      <div class="hero-main">
        <div>
          <p class="eyebrow">Ethan Huang</p>
          <h1 class="hero-title">HYB的个人主页</h1>
          <p class="hero-subtitle">${escapeHtml(profile.name)}，${escapeHtml(profile.title)}。项目经历、学习笔记、生活记录。</p>
          <div class="hero-actions">
            <a class="button primary" href="#/cv">查看科研经历</a>
            <a class="button" href="${escapeAttr(profile.github)}" target="_blank" rel="noreferrer">GitHub</a>
            <a class="button" href="#/knowledge">进入知识图谱</a>
            <a class="button ghost" href="#/life">生活记录</a>
          </div>
        </div>
        <div class="hero-footer">
          ${stats.map(stat => `
            <div class="stat-card">
              <strong>${escapeHtml(stat.value)}</strong>
              <span>${escapeHtml(stat.label)}</span>
              <small>${escapeHtml(stat.hint)}</small>
            </div>
          `).join('')}
        </div>
      </div>

      <aside class="hero-side">
        <div class="profile-seal">
          <div class="sigil-large"><img src="${escapeAttr(profile.avatarImage || 'assets/img/dog-avatar.png')}" alt="${escapeAttr(profile.avatarAlt || '小狗头像')}" /></div>
          <p>BUAA / Flight Propulsion/修勾值班中</p>
        </div>
        <div class="profile-list">
          ${profileRow('身份', profile.title)}
          ${profileRow('位置', profile.location)}
          ${profileRow('邮箱', profile.email)}
          ${profileRow('GitHub', `<a href="${escapeAttr(profile.github)}" target="_blank" rel="noreferrer">${escapeHtml(profile.handle || profile.github)}</a>`, true)}
        </div>
        <div class="companion-mini">
          <img src="assets/img/pet-companions.svg" alt="猫猫狗狗陪读小插画" />
          <p>猫猫狗狗负责提醒：做研究也要晒太阳。</p>
        </div>
      </aside>
    </section>

    <section class="page section-stack">
      <div class="section-header">
        <div>
          <p class="eyebrow">Research Evidence</p>
          <h2>项目经历</h2>
          <p>按时间、问题、方法、结果和边界整理。</p>
        </div>
      </div>
      <div class="project-grid">
        ${researchProjects.map(projectCard).join('')}
      </div>

      <div class="section-header">
        <div>
          <p class="eyebrow">Recent Nodes</p>
          <h2>最近的知识节点</h2>
          <p>这些节点来自 <code>content/knowledge</code>，由脚本自动生成索引。</p>
        </div>
      </div>
      <div class="module-grid">
        ${recentNotes.map(note => `
          <a class="module-card note-card" href="#/knowledge" data-note-path="${escapeAttr(note.path)}">
            <p class="card-kicker">${escapeHtml(note.domain || 'Note')} / ${escapeHtml(note.date || 'undated')}</p>
            <h3>${escapeHtml(note.title)}</h3>
            <p>${escapeHtml(note.summary || 'No summary yet.')}</p>
          </a>
        `).join('')}
      </div>

      <div class="section-header">
        <div>
          <p class="eyebrow">Iteration Notes</p>
          <h2>下一步主页迭代</h2>
          <p>把公开主页继续做成科研证据、知识图谱和生活记录的长期入口。</p>
        </div>
      </div>
      <div class="module-grid">
        ${siteReflections.map(item => `
          <article class="module-card">
            <p class="card-kicker">Next</p>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;

  document.querySelectorAll('[data-note-path]').forEach(link => {
    link.addEventListener('click', () => {
      const path = link.dataset.notePath;
      setTimeout(() => openKnowledgeArticle(path), 120);
    });
  });
}

function renderCv() {
  const { profile, skills, projects } = state.site;
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Research Experience</p>
          <h1>科研经历与项目证据</h1>
          <p>每个项目按“时间—问题—方法—结果—边界”组织，仓库链接保留在项目卡片里。</p>
        </div>
        <div class="action-row">
          <a class="button" href="${escapeAttr(profile.github)}" target="_blank" rel="noreferrer">GitHub</a>
          <a class="button ghost" href="mailto:${escapeAttr(profile.email)}">Email</a>
        </div>
      </div>

      <div class="cv-intro">
        <div class="panel">
          <p class="card-kicker">Profile</p>
          <h2 style="position: relative; font-family: var(--font-serif); margin: 10px 0;">${escapeHtml(profile.name)}</h2>
          <p style="position: relative; color: var(--text-soft); line-height: 1.85;">${escapeHtml(profile.title)}。当前主页重点展示：飞行器动力方向的概念设计、机器学习 baseline 复现、软体机器人控制复现、真实用户工程工具，以及把实验边界写清楚的工程表达能力。</p>
          <div class="profile-list" style="position: relative; margin-top: 14px;">
            ${profileRow('邮箱', profile.email)}
            ${profileRow('GitHub', `<a href="${escapeAttr(profile.github)}" target="_blank" rel="noreferrer">${escapeHtml(profile.github)}</a>`, true)}
            ${profileRow('方向', profile.status)}
          </div>
        </div>
        <div class="panel skill-list">
          <p class="card-kicker">Skill Map</p>
          ${skills.map(group => `
            <section>
              <h3>${escapeHtml(group.group)}</h3>
              <ul>${group.items.map(item => `<li class="pill">${escapeHtml(item)}</li>`).join('')}</ul>
            </section>
          `).join('')}
        </div>
      </div>

      <div class="section-header" style="margin-top: 34px;">
        <div>
          <p class="eyebrow">Projects</p>
          <h2>项目经历</h2>
        </div>
      </div>
      <div class="project-grid">
        ${projects.map(projectCard).join('')}
      </div>
    </section>
  `;
}

function renderStudentWork() {
  const records = state.site.studentWork || [];
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Student Work</p>
          <h1>学工经历</h1>
          <p>按组织任职、活动策划、材料审核、班团建设、社会实践和项目支持整理。</p>
        </div>
      </div>

      <div class="project-grid">
        ${records.length ? records.map(studentWorkCard).join('') : `
          <div class="blank-slate" style="grid-column: 1 / -1;">
            <h3>暂无学工记录</h3>
            <p>后续可以补充任职时间、组织名称、负责事项和证明材料。</p>
          </div>
        `}
      </div>
    </section>
  `;
}

function renderAwards() {
  const records = state.site.awards || [];
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Awards</p>
          <h1>所获奖项</h1>
          <p>竞赛奖项、荣誉证书、课程成果和可公开展示的证明材料。</p>
        </div>
      </div>

      <div class="project-grid">
        ${records.length ? records.map(awardCard).join('') : `
          <div class="blank-slate" style="grid-column: 1 / -1;">
            <h3>暂无奖项记录</h3>
            <p>后续可以补充获奖时间、颁发单位、级别类别和证书链接。</p>
          </div>
        `}
      </div>
    </section>
  `;
}

function renderLifeHub() {
  const categories = state.life.categories;
  const travelCount = categories.play?.length || 0;
  const peopleCount = categories.people?.length || 0;
  const selfCount = categories.diary?.length || 0;
  const eatCount = categories.eat?.length || 0;
  const drinkCount = categories.drink?.length || 0;

  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Life Notes</p>
          <h1>生活：见天地，见众生，见自己</h1>
          <p>见天地记录旅行所感，见众生记录人物短记，见自己记录个人成长；致谢记录好吃的和好喝的。</p>
        </div>
      </div>

      <div class="module-grid">
        <div class="panel">
          <p class="card-kicker">Travel Notes</p>
          <h2>见天地</h2>
          <p>记录旅行、展览、短途出行和城市漫游。重点不是到此一游，而是一个地方怎样改变判断和心情。</p>
          <div class="field-links">
            <a href="#/play">进入见天地 · ${travelCount}</a>
          </div>
        </div>

        <div class="panel">
          <p class="card-kicker">People Notes</p>
          <h2>见众生</h2>
          <p>记录人物短记、对话片段和相遇时刻。让生活里具体的人留下名字、动作和一点判断。</p>
          <div class="field-links">
            <a href="#/people">进入见众生 · ${peopleCount}</a>
          </div>
        </div>

        <div class="panel">
          <p class="card-kicker">Growth Notes</p>
          <h2>见自己</h2>
          <p>记录个人成长、阶段复盘和心理能量的变化。它更安静，但会影响长期选择。</p>
          <div class="field-links">
            <a href="#/diary">进入见自己 · ${selfCount}</a>
          </div>
        </div>

        <div class="panel">
          <p class="card-kicker">Thanks</p>
          <h2>致谢</h2>
          <p>好吃的、好喝的、具体地点和当时的味道。</p>
          <div class="field-links">
            <a href="#/eat">好吃的 · ${eatCount}</a>
            <a href="#/drink">好喝的 · ${drinkCount}</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderKnowledge() {
  const index = state.knowledge;
  const noteWorkflow = state.site.noteWorkflow || [];
  const pkmRoutes = state.site.pkmRoutes || [];
  const firstRecord = index.records.find(record => ['航空发动机', '工程工具', '课程'].includes(record.domain)) || index.records[0];
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Knowledge Graph</p>
          <h1>知识图谱</h1>
          <p>Markdown 文件按领域保存；构建脚本抽取标题、标签、摘要和 <code>[[双链]]</code>，形成可搜索的目录、阅读器和轻量图谱。</p>
        </div>
        <div class="action-row">
          <span class="pill">${index.stats.nodes} nodes</span>
          <span class="pill">${index.stats.links} links</span>
          <span class="pill">${index.stats.domains} domains</span>
        </div>
      </div>

      <div class="workflow-panel">
        <div>
          <p class="card-kicker">Study Note Pipeline</p>
          <h2>学习笔记沉淀路线</h2>
          <p>先把课堂、论文、项目调试和手写材料收进 inbox，再按“可转写 / 难转写 / 只保留影像”分流，最后用双链和项目页面连接起来。</p>
        </div>
        <img src="assets/img/pet-companions.svg" alt="猫猫狗狗陪读小插画" />
      </div>
      <div class="workflow-grid">
        ${noteWorkflow.map(step => `
          <article class="workflow-step">
            <p class="card-kicker">${escapeHtml(step.stage)}</p>
            <h3>${escapeHtml(step.title)}</h3>
            <p>${escapeHtml(step.detail)}</p>
          </article>
        `).join('')}
      </div>

      <div class="section-header compact-header">
        <div>
          <p class="eyebrow">PKM Cloud Path</p>
          <h2>笔记上云路径</h2>
          <p>手写笔记不强行一刀切：能转文字的变成可检索卡片，不方便转文字的保留影像证据，再用索引页和双链连接。</p>
        </div>
      </div>
      <div class="pkm-grid">
        ${pkmRoutes.map(route => `
          <article class="pkm-card">
            <p class="card-kicker">${escapeHtml(route.stage)}</p>
            <h3>${escapeHtml(route.title)}</h3>
            <p>${escapeHtml(route.detail)}</p>
          </article>
        `).join('')}
      </div>

      <div class="knowledge-layout">
        <aside class="index-panel">
          <p class="card-kicker">Archive</p>
          <h2>文件层级</h2>
          <input class="search-input" id="treeSearch" placeholder="搜索标题、标签、文件夹" />
          <div class="tree" id="knowledgeTree"></div>
        </aside>

        <div class="graph-reader-layout">
          <section class="graph-wrap">
            <div class="graph-toolbar">
              <div>
                <p class="card-kicker">Graph</p>
                <h2>节点关系</h2>
              </div>
              <div class="action-row">
                <input class="search-input" id="graphSearch" placeholder="筛选节点" />
                <select class="select-input" id="domainFilter" aria-label="按领域筛选">
                  <option value="">全部领域</option>
                  ${index.domains.map(domain => `<option value="${escapeAttr(domain.name)}">${escapeHtml(domain.name)} · ${domain.count}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="graph-canvas-box">
              <canvas id="knowledgeCanvas"></canvas>
              <div class="graph-hint">点击节点打开笔记；连线来自 Markdown 双链。</div>
            </div>
          </section>

          <section class="reader-panel" id="readerPanel">
            <div class="blank-slate"><h3>选择一篇笔记</h3><p>从目录或图谱打开。</p></div>
          </section>
        </div>
      </div>
    </section>
  `;

  const tree = document.getElementById('knowledgeTree');
  tree.innerHTML = renderTree(index.tree, '');
  tree.addEventListener('click', event => {
    const file = event.target.closest('.tree-file');
    if (!file) return;
    event.preventDefault();
    openKnowledgeArticle(file.dataset.path);
  });

  const treeSearch = document.getElementById('treeSearch');
  treeSearch.addEventListener('input', () => {
    tree.innerHTML = renderTree(index.tree, treeSearch.value.trim());
  });

  const canvas = document.getElementById('knowledgeCanvas');
  const graphSearch = document.getElementById('graphSearch');
  const domainFilter = document.getElementById('domainFilter');
  state.graph = new KnowledgeGraph(canvas, index.records, index.links, {
    onSelect: openKnowledgeArticle
  });

  const applyGraphFilter = () => {
    state.graph?.setFilter({ query: graphSearch.value.trim(), domain: domainFilter.value });
  };
  graphSearch.addEventListener('input', applyGraphFilter);
  domainFilter.addEventListener('change', applyGraphFilter);

  if (firstRecord) openKnowledgeArticle(firstRecord.path);
}

function renderLife(category) {
  const info = categoryInfo[category];
  const entries = state.life.categories[category] || [];
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">${escapeHtml(info.eyebrow)}</p>
          <h1>${escapeHtml(info.title)}</h1>
          <p>${escapeHtml(info.description)}</p>
        </div>
        <div class="action-row">
          <span class="pill">${entries.length} records</span>
        </div>
      </div>

      <div class="panel">
        <div class="life-toolbar">
          <input class="search-input" id="lifeSearch" placeholder="搜索地点、标题、标签、摘要" />
          <select class="select-input" id="lifeTagFilter">
            <option value="">全部标签</option>
            ${collectTags(entries).map(tag => `<option value="${escapeAttr(tag)}">${escapeHtml(tag)}</option>`).join('')}
          </select>
        </div>
        <div class="life-grid" id="lifeGrid"></div>
      </div>
    </section>
  `;

  const grid = document.getElementById('lifeGrid');
  const search = document.getElementById('lifeSearch');
  const tagFilter = document.getElementById('lifeTagFilter');

  const update = () => {
    const query = normalize(search.value);
    const tag = tagFilter.value;
    const filtered = entries.filter(entry => {
      const haystack = normalize([entry.title, entry.place, entry.city, entry.item, entry.summary, ...(entry.tags || [])].join(' '));
      return (!query || haystack.includes(query)) && (!tag || entry.tags.includes(tag));
    });
    grid.innerHTML = filtered.length ? filtered.map(entry => lifeCard(entry)).join('') : `<div class="blank-slate" style="grid-column: 1 / -1;"><h3>没有匹配记录</h3><p>${escapeHtml(info.empty)}</p></div>`;
  };

  update();
  search.addEventListener('input', update);
  tagFilter.addEventListener('change', update);
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-open-life]');
    if (!button) return;
    openLifeArticle(button.dataset.openLife);
  });
}

function renderWorkshop() {
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Future Lab</p>
          <h1>工程小工具暂存区</h1>
          <p>这一页先不放交互计算器。后续等需求明确后，再把标准大气、循环计算、实验数据处理等工具做成独立模块。</p>
        </div>
      </div>

      <div class="module-grid">
        <section class="tool-card">
          <p class="card-kicker">Roadmap</p>
          <h3>后续工程小工具</h3>
          <ul class="clean-list vertical">
            <li>涡喷/涡扇循环状态表与 T-s 示意图。</li>
            <li>压气机工作点与喘振裕度示意。</li>
            <li>实验 CSV 自动拟合、误差传播和图表导出。</li>
            <li>课程公式卡：输入变量、单位、适用条件、常见误区。</li>
          </ul>
        </section>
        <section class="tool-card">
          <p class="card-kicker">Policy</p>
          <h3>先写清需求，再做交互</h3>
          <p>每个工具上线前先写一篇说明笔记：输入是什么、输出是什么、公式来源是什么、适用边界在哪里。这样工具不会变成漂亮但不可信的小玩具。</p>
          <a class="repo-link" href="#/knowledge">回到知识图谱</a>
        </section>
      </div>
    </section>
  `;
}

function renderAbout() {
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">About</p>
          <h1>这里不再作为公开说明页</h1>
          <p>主页信息已经拆到三个更清晰的入口：科研经历、知识图谱和生活记录。</p>
        </div>
        <div class="action-row">
          <a class="button primary" href="#/cv">科研经历</a>
          <a class="button" href="#/life">生活记录</a>
        </div>
      </div>
    </section>
  `;
}

function renderGuestbook() {
  const profile = state.site.profile || {};
  const config = state.site.guestbook || {};
  const discussionUrl = `${profile.repo || 'https://github.com/EthanHuangEbor/EthanHuangEbor.github.io'}/discussions`;
  const isConfigured = Boolean(config.repo && config.repoId && config.category && config.categoryId);

  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Guestbook</p>
          <h1>留言板</h1>
          <p>这里留给朋友、同学和路过的人。评论由 GitHub Discussions 托管，登录 GitHub 后即可留言。</p>
        </div>
        <div class="action-row">
          <a class="button primary" href="${escapeAttr(discussionUrl)}" target="_blank" rel="noreferrer">GitHub Discussions</a>
          <a class="button ghost" href="#/home">回到首页</a>
        </div>
      </div>

      <div class="guestbook-layout">
        <aside class="guestbook-guide">
          <p class="card-kicker">${isConfigured ? 'Ready' : 'Setup'}</p>
          <h2>${isConfigured ? '修勾把门，留言开放' : '等待 GitHub Discussions 启用'}</h2>
          <p>${isConfigured
            ? 'giscus 已连接到主页仓库的 Discussions。留言会沉淀在 GitHub 中，便于长期保存和管理。'
            : '当前仓库尚未启用 Discussions，或还缺少 giscus category id。完成右侧配置后，这里会自动变成真实留言区。'}</p>
          <div class="guestbook-steps">
            <span>1. Settings → Features → Discussions</span>
            <span>2. 安装 giscus app 到主页仓库</span>
            <span>3. 在 giscus.app 选择分类并复制 category id</span>
          </div>
        </aside>

        <section class="guestbook-panel">
          <div class="guestbook-panel-head">
            <div>
              <p class="card-kicker">Giscus Thread</p>
              <h2>公开留言</h2>
            </div>
            <span class="pill">${isConfigured ? '已配置' : '待配置'}</span>
          </div>
          ${isConfigured ? '<div id="giscusThread" class="giscus-thread"></div>' : guestbookSetupCard(config)}
        </section>
      </div>
    </section>
  `;

  if (isConfigured) mountGiscus(config);
}

function guestbookSetupCard(config) {
  const lines = [
    ['repo', config.repo],
    ['repoId', config.repoId],
    ['category', config.category],
    ['categoryId', config.categoryId || '待从 giscus.app 复制']
  ];
  return `
    <div class="blank-slate guestbook-placeholder">
      <h3>giscus 尚未连接</h3>
      <p>GitHub API 显示当前仓库 Discussions 未启用。启用后，在 <code>data/site.json</code> 的 <code>guestbook.categoryId</code> 中填入分类 ID。</p>
      <div class="config-list">
        ${lines.map(([key, value]) => `
          <div>
            <span>${escapeHtml(key)}</span>
            <strong>${escapeHtml(value || '待补充')}</strong>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function mountGiscus(config) {
  const container = document.getElementById('giscusThread');
  if (!container) return;
  container.innerHTML = '';
  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-repo', config.repo);
  script.setAttribute('data-repo-id', config.repoId);
  script.setAttribute('data-category', config.category);
  script.setAttribute('data-category-id', config.categoryId);
  script.setAttribute('data-mapping', config.mapping || 'pathname');
  script.setAttribute('data-strict', config.strict || '0');
  script.setAttribute('data-reactions-enabled', config.reactionsEnabled || '1');
  script.setAttribute('data-emit-metadata', config.emitMetadata || '0');
  script.setAttribute('data-input-position', config.inputPosition || 'bottom');
  script.setAttribute('data-theme', config.theme || 'light');
  script.setAttribute('data-lang', config.lang || 'zh-CN');
  script.setAttribute('data-loading', 'lazy');
  container.appendChild(script);
}

function profileRow(label, value, raw = false) {
  return `
    <div class="profile-row">
      <span>${escapeHtml(label)}</span>
      <strong>${raw ? value : escapeHtml(value || '待补充')}</strong>
    </div>
  `;
}

function projectCard(project) {
  return `
    <article class="project-card project-strip">
      <div class="project-time">${escapeHtml(project.time || '时间待补充')}</div>
      <div class="project-content">
        <p class="card-kicker">${escapeHtml(project.type)} · ${escapeHtml(project.status)}</p>
        <h3>${escapeHtml(project.name)}</h3>
        <p class="problem"><strong>问题：</strong>${escapeHtml(project.problem)}</p>
        <p class="solution"><strong>方法：</strong>${escapeHtml(project.solution)}</p>
        <p><strong>结果：</strong>${escapeHtml(project.result)}</p>
        <div class="project-meta">${project.stack.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join('')}</div>
      </div>
      <a class="repo-link" href="${escapeAttr(project.repo)}" target="_blank" rel="noreferrer">Repo ↗</a>
    </article>
  `;
}

function studentWorkCard(item) {
  const summary = item.summary || [item.title, item.scope, item.work].filter(Boolean).join(' ');
  const status = [item.level, item.status].filter(Boolean).join(' / ') || '待补充';
  return `
    <article class="project-card work-card">
      <div class="work-card-head">
        <div>
          <p class="work-time">${escapeHtml(item.time || '时间待补充')}</p>
          <p class="work-org">${escapeHtml(item.organization || '组织待补充')}</p>
          <h3 class="work-role">${escapeHtml(item.role || '职务待补充')}</h3>
        </div>
        <span class="tag work-status">${escapeHtml(status)}</span>
      </div>
      <p class="work-summary">${escapeHtml(summary || '经历说明待补充。')}</p>
      <div class="project-meta work-tags">${(item.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </article>
  `;
}

function awardCard(item) {
  const description = item.description || item.summary || '奖项说明待补充。';
  return `
    <article class="project-card project-strip">
      <div class="project-time">${escapeHtml(item.time || '时间待补充')}</div>
      <div class="project-content">
        <p class="card-kicker">${escapeHtml(item.issuer || '颁发单位待补充')} · ${escapeHtml(item.level || '级别待补充')}</p>
        <h3>${escapeHtml(item.title || '奖项待补充')}</h3>
        <p>${escapeHtml(description)}</p>
        <div class="project-meta">${(item.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
      <span class="tag">${escapeHtml(item.status || '待补充')}</span>
    </article>
  `;
}

function moduleCard(module) {
  return `
    <article class="module-card">
      <p class="card-kicker">Module</p>
      <h3>${escapeHtml(module.title)}</h3>
      <p><strong>为什么做：</strong>${escapeHtml(module.reason)}</p>
      <p><strong>怎么实现：</strong>${escapeHtml(module.implementation)}</p>
    </article>
  `;
}

function renderTree(node, query) {
  const normalizedQuery = normalize(query);

  function matchesFile(file) {
    if (!normalizedQuery) return true;
    return normalize([file.title, file.name, file.path, file.domain, ...(file.tags || [])].join(' ')).includes(normalizedQuery);
  }

  function renderNode(current) {
    if (current.type === 'file') {
      if (!matchesFile(current)) return '';
      return `<a href="#" class="tree-file" data-path="${escapeAttr(current.path)}">${escapeHtml(current.title)}</a>`;
    }
    const children = (current.children || []).map(renderNode).filter(Boolean).join('');
    if (!children && normalizedQuery) return '';
    if (current.name === 'knowledge') return children;
    return `
      <details class="tree-folder" open>
        <summary>${escapeHtml(current.name)}</summary>
        <div class="tree-children">${children}</div>
      </details>
    `;
  }

  const html = renderNode(node);
  return html || '<div class="blank-slate"><h3>没有匹配笔记</h3><p>换一个关键词试试。</p></div>';
}

async function openKnowledgeArticle(path) {
  const panel = document.getElementById('readerPanel');
  if (!panel) return;
  const record = state.knowledge.records.find(item => item.path === path);
  panel.innerHTML = '<div class="blank-slate"><h3>正在读取卷轴</h3><p>Loading Markdown…</p></div>';
  try {
    const raw = await loadText(path);
    panel.innerHTML = renderArticle(raw, record);
    bindWikiLinks(panel);
    document.querySelectorAll('.tree-file').forEach(file => file.classList.toggle('active', file.dataset.path === path));
    state.graph?.highlight(path);
  } catch (error) {
    panel.innerHTML = `<div class="error-card"><h3>读取失败</h3><p>${escapeHtml(path)}</p><pre>${escapeHtml(error.message)}</pre></div>`;
  }
}

async function openLifeArticle(path) {
  try {
    const raw = await loadText(path);
    openModal(renderArticle(raw));
  } catch (error) {
    openModal(`<div class="error-card"><h3>读取失败</h3><pre>${escapeHtml(error.message)}</pre></div>`);
  }
}

async function loadText(path) {
  if (state.articleCache.has(path)) return state.articleCache.get(path);
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const text = await response.text();
  state.articleCache.set(path, text);
  return text;
}

function renderArticle(raw, record = null) {
  const parsed = parseFrontmatter(raw);
  const meta = { ...(record || {}), ...parsed.meta };
  const title = meta.title || firstHeading(parsed.body) || 'Untitled';
  const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);
  const summary = meta.summary || '';
  const eyebrow = [meta.domain, meta.category, meta.date].filter(Boolean).join(' / ') || 'Markdown';
  return `
    <article class="article-panel">
      <header class="article-header">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(title)}</h1>
        ${summary ? `<p class="summary">${escapeHtml(summary)}</p>` : ''}
        <div class="tag-row">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </header>
      <div class="article-body prose">${markdownToHtml(parsed.body)}</div>
    </article>
  `;
}

function lifeCard(entry) {
  const metaLine = [entry.city, entry.place, entry.price].filter(Boolean).join(' · ');
  return `
    <article class="life-card">
      <p class="card-kicker">${escapeHtml(entry.date || entry.category)}</p>
      <h3>${escapeHtml(entry.title)}</h3>
      <div class="life-meta">
        ${entry.item ? `<span class="tag jade">${escapeHtml(entry.item)}</span>` : ''}
        ${entry.rating !== '' && entry.rating !== null && entry.rating !== undefined ? `<span class="tag rating">★ ${escapeHtml(entry.rating)}/5</span>` : ''}
      </div>
      <p>${escapeHtml(entry.summary)}</p>
      <div class="project-meta">${(entry.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="card-footer">
        <span>${escapeHtml(metaLine || '未填写地点')}</span>
        <button class="read-button" type="button" data-open-life="${escapeAttr(entry.path)}">打开记录</button>
      </div>
    </article>
  `;
}

function bindWikiLinks(root) {
  root.querySelectorAll('.wiki-link').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const target = button.dataset.wiki;
      const record = findKnowledgeRecord(target);
      if (record) {
        closeModal();
        if (routeFromHash() !== 'knowledge') {
          location.hash = '#/knowledge';
          setTimeout(() => openKnowledgeArticle(record.path), 120);
        } else {
          openKnowledgeArticle(record.path);
        }
      } else {
        showToast(`未找到笔记：${target}`);
      }
    });
  });
}

function findKnowledgeRecord(target) {
  const needle = normalizeAlias(target);
  return state.knowledge.records.find(record => {
    const candidates = [record.title, record.fileName, record.slug, record.path.replace(/^content\/knowledge\//, '').replace(/\.(md|markdown)$/i, '')];
    return candidates.some(candidate => normalizeAlias(candidate) === needle);
  });
}

function markdownToHtml(rawBody) {
  const lines = rawBody.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType) return;
    html.push(`<${listType}>${listItems.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushCode = () => {
    html.push(`<pre><code${codeLang ? ` class="language-${escapeAttr(codeLang)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    inCode = false;
    codeLang = '';
    codeLines = [];
  };

  for (const line of lines) {
    const fence = line.match(/^```\s*(.*)$/);
    if (fence) {
      if (inCode) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = fence[1].trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2].trim())}</h${level}>`);
      continue;
    }

    const blockquote = line.match(/^>\s+(.+)$/);
    if (blockquote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(blockquote[1])}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(ordered[1]);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) flushCode();
  flushParagraph();
  flushList();
  return html.join('\n');
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, (_, alt, url) => `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" />`);
  html = html.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const cleanTarget = target.trim();
    const cleanLabel = (label || target).trim();
    return `<button type="button" class="wiki-link" data-wiki="${escapeAttr(cleanTarget)}">${escapeHtml(cleanLabel)}</button>`;
  });
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+|#[^\s\)]+|[^\s\)]+)\)/g, (_, label, url) => {
    const safe = sanitizeUrl(url);
    return `<a href="${escapeAttr(safe)}" target="${safe.startsWith('http') ? '_blank' : '_self'}" rel="noreferrer">${label}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const meta = {};
  let body = raw;
  if (!match) return { meta, body };
  body = raw.slice(match[0].length);
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const keyValue = line.match(/^([A-Za-z0-9_\-\u4e00-\u9fff]+):\s*(.*)$/);
    if (keyValue) {
      currentKey = keyValue[1];
      meta[currentKey] = parseScalar(keyValue[2] ?? '');
      continue;
    }
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(parseScalar(listItem[1]));
    }
  }
  return { meta, body };
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function firstHeading(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function openModal(innerHtml) {
  closeModal();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-inner">
      <button class="modal-close" type="button">关闭</button>
      ${innerHtml}
    </div>
  `;
  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('.modal-close')) closeModal();
  });
  document.body.appendChild(modal);
  bindWikiLinks(modal);
}

function closeModal() {
  document.querySelectorAll('.modal-backdrop').forEach(modal => modal.remove());
}

function showToast(message) {
  const old = document.querySelector('.toast');
  old?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function collectTags(entries) {
  return [...new Set(entries.flatMap(entry => entry.tags || []))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function bindWorkshopCalculators() {
  const isaAlt = document.querySelector('[data-isa-alt]');
  const isaOutput = document.querySelector('[data-isa-output]');
  const machV = document.querySelector('[data-mach-v]');
  const machT = document.querySelector('[data-mach-t]');
  const machOutput = document.querySelector('[data-mach-output]');
  const braytonPr = document.querySelector('[data-brayton-pr]');
  const braytonGamma = document.querySelector('[data-brayton-gamma]');
  const braytonOutput = document.querySelector('[data-brayton-output]');

  const updateIsa = () => {
    const h = clamp(Number(isaAlt.value || 0), 0, 20000);
    const result = isa(h);
    isaOutput.innerHTML = `T = <strong>${format(result.T)} K</strong>；p = <strong>${format(result.p / 1000)} kPa</strong>；ρ = <strong>${format(result.rho)} kg/m³</strong>；a = <strong>${format(result.a)} m/s</strong>`;
  };
  const updateMach = () => {
    const V = Math.max(0, Number(machV.value || 0));
    const T = Number(machT.value || 0) + 273.15;
    const a = Math.sqrt(1.4 * 287.05287 * T);
    const M = V / a;
    machOutput.innerHTML = `声速 a = <strong>${format(a)} m/s</strong>；马赫数 M = <strong>${format(M, 3)}</strong>`;
  };
  const updateBrayton = () => {
    const pr = Math.max(1.01, Number(braytonPr.value || 1.01));
    const gamma = Math.max(1.1, Number(braytonGamma.value || 1.4));
    const eta = 1 - 1 / Math.pow(pr, (gamma - 1) / gamma);
    braytonOutput.innerHTML = `η = 1 - 1 / πc^((γ-1)/γ) = <strong>${format(eta * 100)}%</strong>`;
  };

  [isaAlt].forEach(input => input?.addEventListener('input', updateIsa));
  [machV, machT].forEach(input => input?.addEventListener('input', updateMach));
  [braytonPr, braytonGamma].forEach(input => input?.addEventListener('input', updateBrayton));
  updateIsa();
  updateMach();
  updateBrayton();
}

function isa(h) {
  const g0 = 9.80665;
  const R = 287.05287;
  const gamma = 1.4;
  let T;
  let p;
  if (h <= 11000) {
    T = 288.15 - 0.0065 * h;
    p = 101325 * Math.pow(T / 288.15, 5.2558797);
  } else {
    T = 216.65;
    const p11 = 101325 * Math.pow(216.65 / 288.15, 5.2558797);
    p = p11 * Math.exp(-g0 * (h - 11000) / (R * T));
  }
  const rho = p / (R * T);
  const a = Math.sqrt(gamma * R * T);
  return { T, p, rho, a };
}

function format(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function destroyGraph() {
  if (state.graph) {
    state.graph.destroy();
    state.graph = null;
  }
}

class KnowledgeGraph {
  constructor(canvas, records, links, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.records = records;
    this.linksRaw = links;
    this.options = options;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.width = 0;
    this.height = 0;
    this.hovered = null;
    this.selected = null;
    this.filter = { query: '', domain: '' };
    this.running = true;
    this.colors = ['#246a73', '#9f4f43', '#7a6a36', '#4f6f52', '#2f5f9e', '#6b6478', '#8a6f3a'];
    this.domainColor = new Map();

    this.nodes = records.map((record, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, records.length);
      const radius = 90 + (index % 4) * 20;
      const domainIndex = this.getDomainIndex(record.domain);
      return {
        id: record.path,
        title: record.title,
        tags: record.tags || [],
        domain: record.domain || '',
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        r: 7,
        color: this.colors[domainIndex % this.colors.length],
        visible: true,
        alpha: 1
      };
    });
    this.nodeMap = new Map(this.nodes.map(node => [node.id, node]));
    this.links = links
      .map(link => ({ source: this.nodeMap.get(link.source), target: this.nodeMap.get(link.target), label: link.label }))
      .filter(link => link.source && link.target);

    const degree = new Map();
    for (const link of this.links) {
      degree.set(link.source.id, (degree.get(link.source.id) || 0) + 1);
      degree.set(link.target.id, (degree.get(link.target.id) || 0) + 1);
    }
    this.nodes.forEach(node => { node.r = 7 + Math.min(8, degree.get(node.id) || 0); });

    this.handleResize = this.resize.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseLeave = () => { this.hovered = null; };
    this.handleClick = this.onClick.bind(this);
    window.addEventListener('resize', this.handleResize);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseleave', this.handleMouseLeave);
    canvas.addEventListener('click', this.handleClick);
    this.resize();
    this.tick();
  }

  getDomainIndex(domain) {
    if (!this.domainColor.has(domain)) this.domainColor.set(domain, this.domainColor.size);
    return this.domainColor.get(domain);
  }

  resize() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const oldWidth = this.width || Math.max(300, box.width);
    const oldHeight = this.height || Math.max(280, box.height);
    this.width = Math.max(300, box.width);
    this.height = Math.max(280, box.height);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const cx = this.width / 2;
    const cy = this.height / 2;
    if (!this.initialized) {
      this.nodes.forEach(node => {
        node.x += cx;
        node.y += cy;
      });
      this.initialized = true;
      return;
    }
    const dx = (this.width - oldWidth) / 2;
    const dy = (this.height - oldHeight) / 2;
    this.nodes.forEach(node => {
      node.x = clamp(node.x + dx, 22, this.width - 22);
      node.y = clamp(node.y + dy, 22, this.height - 22);
    });
  }

  setFilter(filter) {
    this.filter = filter;
    const query = normalize(filter.query);
    for (const node of this.nodes) {
      const haystack = normalize([node.title, node.domain, ...node.tags].join(' '));
      node.visible = (!query || haystack.includes(query)) && (!filter.domain || node.domain === filter.domain);
    }
  }

  highlight(path) {
    this.selected = path;
  }

  tick() {
    if (!this.running) return;
    this.simulate();
    this.draw();
    this.frame = requestAnimationFrame(() => this.tick());
  }

  simulate() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const nodes = this.nodes;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist2 = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(dist2);
        const force = 1200 / dist2;
        dx /= dist;
        dy /= dist;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      }
    }

    for (const link of this.links) {
      const a = link.source;
      const b = link.target;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const desired = 112;
      const force = (dist - desired) * 0.010;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const node of nodes) {
      node.vx += (cx - node.x) * 0.0025;
      node.vy += (cy - node.y) * 0.0025;
      node.vx *= 0.86;
      node.vy *= 0.86;
      node.x += node.vx;
      node.y += node.vy;
      node.x = clamp(node.x, 22, this.width - 22);
      node.y = clamp(node.y, 22, this.height - 22);
      node.alpha += ((node.visible ? 1 : 0.16) - node.alpha) * 0.12;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(174, 189, 175, 0.34)';
    ctx.lineWidth = 1;
    for (let x = 20; x < this.width; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 20; y < this.height; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();

    for (const link of this.links) {
      const alpha = Math.min(link.source.alpha, link.target.alpha) * 0.55;
      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.strokeStyle = `rgba(36, 106, 115, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const node of this.nodes) {
      const isHot = this.hovered === node || this.selected === node.id;
      ctx.save();
      ctx.globalAlpha = node.alpha;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + (isHot ? 5 : 0), 0, Math.PI * 2);
      ctx.fillStyle = isHot ? 'rgba(36, 106, 115, 0.14)' : 'rgba(255, 255, 252, 0.82)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.lineWidth = isHot ? 2.4 : 1.3;
      ctx.strokeStyle = isHot ? '#17211d' : 'rgba(23, 33, 29, 0.42)';
      ctx.stroke();
      if (isHot || node.alpha > 0.85) {
        ctx.font = isHot ? '700 13px system-ui' : '12px system-ui';
        ctx.fillStyle = isHot ? '#17211d' : 'rgba(36, 48, 43, 0.76)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(truncate(node.title, isHot ? 18 : 10), node.x, node.y + node.r + 7);
      }
      ctx.restore();
    }

    if (this.hovered) {
      this.drawTooltip(this.hovered);
    }
  }

  drawTooltip(node) {
    const ctx = this.ctx;
    const text = `${node.title} · ${node.domain}`;
    const width = Math.min(340, ctx.measureText(text).width + 28);
    const x = clamp(node.x + 16, 12, this.width - width - 12);
    const y = clamp(node.y - 42, 12, this.height - 56);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 252, 0.96)';
    ctx.strokeStyle = 'rgba(36, 106, 115, 0.34)';
    roundedRect(ctx, x, y, width, 36, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#17211d';
    ctx.font = '12px system-ui';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncate(text, 34), x + 14, y + 18);
    ctx.restore();
  }

  onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let nearest = null;
    let nearestDist = Infinity;
    for (const node of this.nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < node.r + 10 && dist < nearestDist) {
        nearest = node;
        nearestDist = dist;
      }
    }
    this.hovered = nearest;
    this.canvas.style.cursor = nearest ? 'pointer' : 'default';
  }

  onClick() {
    if (!this.hovered) return;
    this.selected = this.hovered.id;
    this.options.onSelect?.(this.hovered.id);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('click', this.handleClick);
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function normalize(value) {
  return String(value ?? '').toLowerCase().trim();
}

function normalizeAlias(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.(md|markdown)$/i, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[《》“”"'`]/g, '');
}

function sanitizeUrl(url) {
  const trimmed = String(url ?? '').trim();
  if (/^(https?:\/\/|#|\.\/|\/|content\/|assets\/|data\/)/.test(trimmed)) return trimmed;
  return '#';
}

function truncate(value, length) {
  const text = String(value ?? '');
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
