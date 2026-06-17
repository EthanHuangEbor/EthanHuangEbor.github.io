const state = {
  site: null,
  knowledge: null,
  life: null,
  graph: null,
  articleCache: new Map()
};

const routes = {
  home: { label: '星塔入口' },
  cv: { label: 'CV / 项目' },
  knowledge: { label: '知识图谱' },
  eat: { label: '吃' },
  drink: { label: '喝' },
  play: { label: '玩' },
  diary: { label: '乐 / 日记' },
  workshop: { label: '动力工坊' },
  about: { label: '设计说明' }
};

const categoryInfo = {
  eat: {
    title: '吃 · 味觉地图',
    eyebrow: 'Taste Atlas',
    description: '记录地点、菜品、价格、评分和复访条件。目标不是写美食流水账，而是建立自己的味觉判断。',
    empty: '还没有吃的记录。向 content/life/eat/ 添加 Markdown 即可。'
  },
  drink: {
    title: '喝 · 风味坐标',
    eyebrow: 'Flavor Notes',
    description: '记录酒、茶、咖啡或其他饮品的风味坐标。这里更重视香气、口感、场景和复盘，不鼓励过量饮酒。',
    empty: '还没有喝的记录。向 content/life/drink/ 添加 Markdown 即可。'
  },
  play: {
    title: '玩 · 恢复能量的计划池',
    eyebrow: 'Playground',
    description: '可记录展览、运动、短途旅行、桌游、城市漫游。先保留为空白，未来按体验质量补充。',
    empty: '这里暂时留空。你可以先把想玩的清单写进 content/life/play/。'
  },
  diary: {
    title: '乐 · 日记与复盘',
    eyebrow: 'Diary',
    description: '“乐”不是单纯快乐，而是记录情绪、判断、复盘和恢复力。适合写周记、月记和学期复盘。',
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
  document.title = `${profile.name} · Aether Archive`;
  document.getElementById('brandAvatar').textContent = profile.avatarText || '航';
  document.getElementById('brandName').textContent = profile.name || 'Aether Archive';
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
  else if (route === 'knowledge') renderKnowledge();
  else if (['eat', 'drink', 'play', 'diary'].includes(route)) renderLife(route);
  else if (route === 'workshop') renderWorkshop();
  else if (route === 'about') renderAbout();
  app.focus({ preventScroll: true });
}

function setActiveNav(route) {
  document.querySelectorAll('.nav a').forEach(link => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

function renderHome() {
  const { profile, heroStats, principles, candidateSections } = state.site;
  const stats = heroStats.map(stat => ({
    ...stat,
    value: stat.value === 'auto' ? String(state.knowledge.stats.nodes) : stat.value
  }));

  app.innerHTML = `
    <section class="page hero">
      <div class="hero-main">
        <div>
          <p class="eyebrow">Aether Archive / Personal Observatory</p>
          <h1 class="hero-title">${escapeHtml(profile.name)}<span>的星塔档案</span></h1>
          <p class="hero-subtitle">${escapeHtml(profile.tagline)}</p>
          <div class="hero-actions">
            <a class="button primary" href="#/knowledge">打开知识图谱</a>
            <a class="button" href="#/cv">查看 CV 与项目</a>
            <a class="button ghost" href="#/workshop">进入动力工坊</a>
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
        <div class="profile-seal"><div class="sigil-large">${escapeHtml(profile.avatarText || '航')}</div></div>
        <div class="profile-list">
          ${profileRow('身份', profile.title)}
          ${profileRow('位置', profile.location)}
          ${profileRow('状态', profile.status)}
          ${profileRow('GitHub', `<a href="${escapeAttr(profile.github)}" target="_blank" rel="noreferrer">${escapeHtml(profile.handle || profile.github)}</a>`, true)}
        </div>
      </aside>
    </section>

    <section class="page" style="margin-top: 24px;">
      <div class="section-header">
        <div>
          <p class="eyebrow">Operating Principles</p>
          <h2>主页的底层规则</h2>
          <p>它不是一次性作品集，而是一个长期更新的个人操作系统：项目要能追溯，笔记要能连接，生活要能复盘。</p>
        </div>
      </div>
      <div class="grid-3">
        ${principles.map((item, index) => `
          <div class="panel">
            <p class="card-kicker">Rule ${String(index + 1).padStart(2, '0')}</p>
            <p style="position: relative; color: var(--text-soft); line-height: 1.85; font-size: 16px;">${escapeHtml(item)}</p>
          </div>
        `).join('')}
      </div>
      <div class="section-header" style="margin-top: 34px;">
        <div>
          <p class="eyebrow">Next Sections</p>
          <h2>后续可扩展模块</h2>
        </div>
      </div>
      <div class="module-grid">
        ${candidateSections.slice(0, 4).map(module => moduleCard(module)).join('')}
      </div>
      <p class="footer-note">视觉方向采用“魔法学院式卷轴 + 中式印章 + 航空星图”的混合语言，没有使用任何第三方图片素材。</p>
    </section>
  `;
}

function renderCv() {
  const { profile, skills, projects, timeline } = state.site;
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Curriculum Vitae</p>
          <h1>CV 与项目经历</h1>
          <p>每个项目都按“问题—方法—结果—repo”组织。这样访问者不用猜项目价值，也方便你后续把课程作业、实验脚本和研究尝试逐步纳入。</p>
        </div>
        <div class="action-row">
          <a class="button" href="${escapeAttr(profile.github)}" target="_blank" rel="noreferrer">GitHub</a>
          <a class="button ghost" href="${escapeAttr(profile.cvPdf)}">CV PDF</a>
        </div>
      </div>

      <div class="cv-intro">
        <div class="panel">
          <p class="card-kicker">Profile</p>
          <h2 style="position: relative; font-family: var(--font-serif); margin: 10px 0;">${escapeHtml(profile.name)}</h2>
          <p style="position: relative; color: var(--text-soft); line-height: 1.85;">${escapeHtml(profile.title)}。当前主页重点展示：工程计算能力、知识组织能力、项目复盘能力，以及可持续更新的生活记录系统。</p>
          <div class="profile-list" style="position: relative; margin-top: 14px;">
            ${profileRow('邮箱', profile.email)}
            ${profileRow('GitHub', `<a href="${escapeAttr(profile.github)}" target="_blank" rel="noreferrer">${escapeHtml(profile.github)}</a>`, true)}
            ${profileRow('主页仓库', `<a href="${escapeAttr(profile.repo)}" target="_blank" rel="noreferrer">${escapeHtml(profile.repo)}</a>`, true)}
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
          <h2>项目卡片</h2>
        </div>
      </div>
      <div class="project-grid">
        ${projects.map(projectCard).join('')}
      </div>

      <div class="section-header" style="margin-top: 34px;">
        <div>
          <p class="eyebrow">Trajectory</p>
          <h2>航迹时间线</h2>
        </div>
      </div>
      <div class="timeline">
        ${timeline.map(item => `
          <div class="timeline-card">
            <div class="timeline-time">${escapeHtml(item.time)}</div>
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.detail)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderKnowledge() {
  const index = state.knowledge;
  const firstRecord = index.records[0];
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Obsidian-like Graph</p>
          <h1>知识图谱</h1>
          <p>Markdown 文件仍按文件夹保存；构建脚本会抽取标题、标签、摘要和 <code>[[双链]]</code>，前端显示目录树和可点击的节点图谱。</p>
        </div>
        <div class="action-row">
          <span class="pill">${index.stats.nodes} nodes</span>
          <span class="pill">${index.stats.links} links</span>
          <span class="pill">${index.stats.domains} domains</span>
        </div>
      </div>

      <div class="knowledge-layout">
        <aside class="index-panel">
          <p class="card-kicker">Archive Tree</p>
          <h2 style="position: relative; margin: 10px 0 14px; font-family: var(--font-serif);">文件层级</h2>
          <input class="search-input" id="treeSearch" placeholder="搜索标题、标签、文件夹" />
          <div class="tree" id="knowledgeTree"></div>
        </aside>

        <div class="graph-reader-layout">
          <section class="graph-wrap">
            <div class="graph-toolbar">
              <div>
                <p class="card-kicker">Graph View</p>
                <h2 style="position: relative; margin: 8px 0 0; font-family: var(--font-serif);">节点星图</h2>
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
              <div class="graph-hint">拖动鼠标查看节点；点击节点打开笔记。节点连线来自 Markdown 中的 [[双链]]。</div>
            </div>
          </section>

          <section class="reader-panel" id="readerPanel">
            <div class="blank-slate"><h3>选择一篇笔记</h3><p>从左侧目录或上方图谱打开。</p></div>
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
          <p class="eyebrow">Propulsion Workshop</p>
          <h1>动力工坊</h1>
          <p>这是为飞行器动力工程身份新增的模块：把专业学习沉淀为可演示工具。当前先放三个轻量计算器，未来可以扩展成完整循环计算与实验数据处理页面。</p>
        </div>
      </div>

      <div class="workshop-grid">
        <section class="tool-card">
          <p class="card-kicker">ISA</p>
          <h3>标准大气计算器</h3>
          <p>输入高度，估算 0—20 km 范围内的温度、压力、密度和声速。</p>
          <div class="calc-form" id="isaCalc">
            <label>高度 h / m <input class="calc-input" type="number" value="5000" min="0" max="20000" step="100" data-isa-alt /></label>
            <div class="calc-output" data-isa-output></div>
          </div>
        </section>

        <section class="tool-card">
          <p class="card-kicker">Mach</p>
          <h3>马赫数估算</h3>
          <p>输入速度和环境温度，估算马赫数。适合把飞行条件快速转化为无量纲量。</p>
          <div class="calc-form" id="machCalc">
            <div class="calc-row">
              <label>速度 V / m·s⁻¹ <input class="calc-input" type="number" value="250" min="0" step="1" data-mach-v /></label>
              <label>温度 T / ℃ <input class="calc-input" type="number" value="15" step="1" data-mach-t /></label>
            </div>
            <div class="calc-output" data-mach-output></div>
          </div>
        </section>

        <section class="tool-card">
          <p class="card-kicker">Brayton</p>
          <h3>理想布雷顿循环效率</h3>
          <p>输入压比和比热比，估算理想循环热效率。真实发动机还需要考虑部件效率和总压损失。</p>
          <div class="calc-form" id="braytonCalc">
            <div class="calc-row">
              <label>压比 πc <input class="calc-input" type="number" value="12" min="1.01" step="0.1" data-brayton-pr /></label>
              <label>比热比 γ <input class="calc-input" type="number" value="1.4" min="1.1" max="1.67" step="0.01" data-brayton-gamma /></label>
            </div>
            <div class="calc-output" data-brayton-output></div>
          </div>
        </section>

        <section class="tool-card">
          <p class="card-kicker">Roadmap</p>
          <h3>后续工程小工具</h3>
          <ul class="clean-list vertical" style="position: relative;">
            <li>涡喷/涡扇循环状态表与 T-s 示意图。</li>
            <li>压气机工作点与喘振裕度示意。</li>
            <li>实验 CSV 自动拟合、误差传播和图表导出。</li>
            <li>课程公式卡：输入变量、单位、适用条件、常见误区。</li>
          </ul>
        </section>
      </div>
    </section>
  `;
  bindWorkshopCalculators();
}

function renderAbout() {
  const { candidateSections } = state.site;
  app.innerHTML = `
    <section class="page">
      <div class="section-header">
        <div>
          <p class="eyebrow">Design System</p>
          <h1>设计说明与更新组织</h1>
          <p>这版主页按“公开展示层 + Markdown 内容层 + 自动索引层”组织。你平时只需要写内容；展示、目录和图谱由脚本生成。</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <p class="card-kicker">Visual Direction</p>
          <h2 style="position: relative; font-family: var(--font-serif);">魔法学院式卷轴 × 中式印章 × 航空星图</h2>
          <ul class="clean-list vertical" style="position: relative;">
            <li>哈利波特式氛围只取“卷轴、星图、学院档案、符文边框”的抽象质感，不使用官方素材。</li>
            <li>中式部分落在金石印章、墨色层次、玉色点缀和卷册感。</li>
            <li>专业身份落在节点图谱、工程计算器、项目问题意识和航迹时间线。</li>
          </ul>
        </div>
        <div class="panel">
          <p class="card-kicker">Update Protocol</p>
          <h2 style="position: relative; font-family: var(--font-serif);">推荐更新协议</h2>
          <ul class="clean-list vertical" style="position: relative;">
            <li>项目：更新 <span class="inline-code">data/site.json</span> 的 projects 字段。</li>
            <li>知识：向 <span class="inline-code">content/knowledge/领域/标题.md</span> 添加笔记，并使用 <span class="inline-code">[[双链]]</span> 连接旧笔记。</li>
            <li>生活：向 <span class="inline-code">content/life/eat</span>、<span class="inline-code">drink</span>、<span class="inline-code">play</span>、<span class="inline-code">diary</span> 添加 Markdown。</li>
            <li>发布：push 到 GitHub 后，由 Actions 运行脚本并部署到 Pages。</li>
          </ul>
        </div>
      </div>

      <div class="section-header" style="margin-top: 34px;">
        <div>
          <p class="eyebrow">Concrete Extensions</p>
          <h2>基于你身份推荐补充的模块</h2>
        </div>
      </div>
      <div class="module-grid">
        ${candidateSections.map(moduleCard).join('')}
      </div>

      <div class="panel" style="margin-top: 22px;">
        <p class="card-kicker">Repository Structure</p>
        <pre style="position: relative; white-space: pre-wrap; line-height: 1.7;"><code>.
├── index.html
├── assets/
│   ├── css/style.css
│   ├── js/app.js
│   └── img/sigil.svg
├── data/
│   ├── site.json                  # 个人信息、项目、技能、时间线
│   ├── knowledge-index.json        # 自动生成
│   └── life-index.json             # 自动生成
├── content/
│   ├── knowledge/                  # 专业、阅读、成长类 Markdown
│   └── life/                       # 吃 / 喝 / 玩 / 乐
├── scripts/build-index.mjs         # 扫描 Markdown 并生成索引
└── .github/workflows/pages.yml     # GitHub Pages 自动部署</code></pre>
      </div>
    </section>
  `;
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
    <article class="project-card">
      <p class="card-kicker">${escapeHtml(project.type)} · ${escapeHtml(project.status)}</p>
      <h3>${escapeHtml(project.name)}</h3>
      <p class="problem"><strong>问题：</strong>${escapeHtml(project.problem)}</p>
      <p class="solution"><strong>方法：</strong>${escapeHtml(project.solution)}</p>
      <p><strong>结果：</strong>${escapeHtml(project.result)}</p>
      <div class="project-meta">${project.stack.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join('')}</div>
      <a class="repo-link" href="${escapeAttr(project.repo)}" target="_blank" rel="noreferrer">Repo ↗</a>
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
    this.colors = ['#d5b15f', '#74a99b', '#a87a67', '#668bb7', '#c9d18f', '#c48484', '#9f91c7'];
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
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = 'rgba(241, 212, 131, 0.32)';
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
      ctx.strokeStyle = `rgba(220, 190, 120, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const node of this.nodes) {
      const isHot = this.hovered === node || this.selected === node.id;
      ctx.save();
      ctx.globalAlpha = node.alpha;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + (isHot ? 5 : 0), 0, Math.PI * 2);
      ctx.fillStyle = isHot ? 'rgba(241, 212, 131, 0.18)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.lineWidth = isHot ? 2.4 : 1.3;
      ctx.strokeStyle = isHot ? '#fff2b5' : 'rgba(255, 255, 255, 0.58)';
      ctx.stroke();
      if (isHot || node.alpha > 0.85) {
        ctx.font = isHot ? '700 13px system-ui' : '12px system-ui';
        ctx.fillStyle = isHot ? '#fff2b5' : 'rgba(248, 241, 220, 0.78)';
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
    ctx.fillStyle = 'rgba(8, 10, 16, 0.92)';
    ctx.strokeStyle = 'rgba(241, 212, 131, 0.46)';
    roundedRect(ctx, x, y, width, 36, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8f1dc';
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
