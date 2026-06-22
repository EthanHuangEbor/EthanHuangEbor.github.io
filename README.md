# Ethan Huang · 个人主页

这是一个面向 GitHub Pages 的静态个人主页，主线是 CV、项目经历和 Markdown 知识图谱；生活记录保留为隐藏的 field notes，工程小工具等需求明确后再逐步开发。

## 主要功能

- CV / 项目：在 `data/site.json` 中维护项目卡片，每个项目包含问题、方法、结果和 repo 链接。
- 知识图谱：在 `content/knowledge/` 中维护 Markdown 笔记，使用 `[[笔记标题]]` 建立双链。构建脚本会生成目录树和图谱索引。
- Field notes：在 `content/life/eat`、`drink`、`play`、`diary` 下添加 Markdown 卡片；入口藏在 About 页。
- 未来工程工具：标准大气、马赫数、布雷顿循环等交互工具先保留为路线图，后续按具体需求开发。
- 自动部署：`.github/workflows/pages.yml` 会在 push 到 `main` 时生成索引并部署到 GitHub Pages。

## 本地预览

```bash
node scripts/build-index.mjs
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

不要直接双击 `index.html`。浏览器通常会阻止静态页面读取本地 JSON 和 Markdown 文件。

## 修改个人信息

编辑：

```text
data/site.json
```

重点修改：

- `profile.name`
- `profile.handle`
- `profile.email`
- `profile.github`
- `profile.repo`
- `projects`
- `skills`
- `timeline`

## 添加知识笔记

新建文件：

```text
content/knowledge/航空发动机/某个概念.md
```

推荐格式：

```markdown
---
title: 某个概念
date: 2026-06-16
domain: 航空发动机
tags: [航空发动机, 热力学]
status: seed
summary: 用一句话说明这篇笔记解决什么问题。
---

# 某个概念

正文内容。

关联到 [[布雷顿循环]] 和 [[标准大气模型]]。
```

运行：

```bash
node scripts/build-index.mjs
```

生成文件：

```text
data/knowledge-index.json
data/life-index.json
```

## 添加隐藏生活记录

例如新增一次吃的记录：

```text
content/life/eat/北京-某店-某菜.md
```

推荐格式：

```markdown
---
title: 某店某菜
date: 2026-06-16
category: eat
city: 北京
place: 某地点
item: 某菜
rating: 4.2
price: ¥35
summary: 一句话评价。
tags: [校园周边, 高性价比]
---

# 某店某菜

## 评价

正文内容。
```

## 部署到 GitHub Pages

1. 使用仓库 `EthanHuangEbor.github.io`。
2. 将本项目所有文件推送到 `main` 分支。
3. 进入仓库 `Settings → Pages`。
4. 在 `Build and deployment` 中选择 `GitHub Actions`。
5. 推送后查看 `Actions`，部署成功后访问 `https://ethanhuangebor.github.io/`。

## 目录结构

```text
.
├── index.html
├── assets/
│   ├── css/style.css
│   ├── js/app.js
│   └── img/sigil.svg
├── content/
│   ├── knowledge/
│   └── life/
├── data/
│   ├── site.json
│   ├── knowledge-index.json
│   └── life-index.json
├── scripts/build-index.mjs
└── .github/workflows/pages.yml
```

## 更新原则

建议每周更新三类内容：

- 一张专业知识卡片。
- 一条项目进展或复盘。
- 一条生活判断记录。

长期坚持后，这个主页会自然变成公开作品集、复习系统和个人成长档案。
