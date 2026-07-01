import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const knowledgeRoot = path.join(ROOT, 'content', 'knowledge');
const lifeRoot = path.join(ROOT, 'content', 'life');
const dataRoot = path.join(ROOT, 'data');

const mdExtensions = new Set(['.md', '.markdown']);

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else if (entry.isFile() && mdExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function stripExt(filePath) {
  return filePath.replace(/\.(md|markdown)$/i, '');
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1)
      .split(',')
      .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const meta = {};
  let body = raw;
  if (match) {
    body = raw.slice(match[0].length);
    const lines = match[1].split(/\r?\n/);
    let currentKey = null;
    for (const line of lines) {
      const cleanLine = line.replace(/\r$/, '');
      if (!cleanLine.trim() || cleanLine.trim().startsWith('#')) continue;
      const keyValue = cleanLine.match(/^([A-Za-z0-9_\-\u4e00-\u9fff]+):\s*(.*)$/);
      if (keyValue) {
        currentKey = keyValue[1];
        meta[currentKey] = parseScalar(keyValue[2] ?? '');
        continue;
      }
      const listItem = cleanLine.match(/^\s*-\s+(.*)$/);
      if (listItem && currentKey) {
        if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
        meta[currentKey].push(parseScalar(listItem[1]));
      }
    }
  }
  return { meta, body };
}

function firstHeading(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function excerpt(body, length = 130) {
  const clean = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[>*_#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

function extractWikiLinks(body) {
  const links = [];
  const regex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = regex.exec(body))) {
    const target = match[1].trim();
    if (target) links.push(target);
  }
  return [...new Set(links)];
}

function extractHeadings(body) {
  return [...body.matchAll(/^(#{1,4})\s+(.+)$/gm)].map(match => ({
    depth: match[1].length,
    text: match[2].trim()
  }));
}

function normalizeAlias(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.(md|markdown)$/i, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[《》“”"'`]/g, '');
}

function insertTree(root, parts, fileRecord) {
  if (parts.length === 1) {
    root.children.push({
      type: 'file',
      name: parts[0],
      title: fileRecord.title,
      path: fileRecord.path,
      tags: fileRecord.tags,
      domain: fileRecord.domain
    });
    return;
  }
  const folderName = parts[0];
  let folder = root.children.find(child => child.type === 'folder' && child.name === folderName);
  if (!folder) {
    folder = { type: 'folder', name: folderName, children: [] };
    root.children.push(folder);
  }
  insertTree(folder, parts.slice(1), fileRecord);
}

function sortTree(node) {
  if (!node.children) return node;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
  node.children.forEach(sortTree);
  return node;
}

async function buildKnowledge() {
  const files = await walk(knowledgeRoot);
  const records = [];
  const aliases = new Map();
  const tree = { type: 'folder', name: 'knowledge', children: [] };

  for (const fullPath of files) {
    const raw = await fs.readFile(fullPath, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const rel = toPosix(path.relative(ROOT, fullPath));
    const relKnowledge = toPosix(path.relative(knowledgeRoot, fullPath));
    const base = path.basename(fullPath, path.extname(fullPath));
    const title = meta.title || firstHeading(body) || base;
    const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);
    const domain = meta.domain || relKnowledge.split('/')[0] || '未分类';
    const record = {
      path: rel,
      folderPath: toPosix(path.dirname(relKnowledge)),
      fileName: path.basename(fullPath),
      slug: normalizeAlias(stripExt(relKnowledge)),
      title,
      date: meta.date || '',
      updated: meta.updated || '',
      status: meta.status || 'seed',
      domain,
      tags,
      summary: meta.summary || excerpt(body),
      headings: extractHeadings(body),
      wikilinks: extractWikiLinks(body),
      wordCount: body.replace(/\s+/g, '').length
    };
    records.push(record);

    const aliasCandidates = [
      title,
      base,
      stripExt(relKnowledge),
      normalizeAlias(title),
      normalizeAlias(base),
      normalizeAlias(stripExt(relKnowledge))
    ];
    for (const alias of aliasCandidates) {
      const key = normalizeAlias(alias);
      if (key && !aliases.has(key)) aliases.set(key, record.path);
    }

    insertTree(tree, relKnowledge.split('/'), record);
  }

  const links = [];
  const unresolved = [];
  for (const record of records) {
    for (const target of record.wikilinks) {
      const key = normalizeAlias(target);
      const targetPath = aliases.get(key);
      if (targetPath) {
        links.push({ source: record.path, target: targetPath, label: target });
      } else {
        unresolved.push({ source: record.path, target });
      }
    }
  }

  const tagCounts = new Map();
  const domainCounts = new Map();
  for (const record of records) {
    domainCounts.set(record.domain, (domainCounts.get(record.domain) || 0) + 1);
    for (const tag of record.tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      nodes: records.length,
      links: links.length,
      unresolved: unresolved.length,
      domains: domainCounts.size,
      tags: tagCounts.size
    },
    records,
    links,
    unresolved,
    tree: sortTree(tree),
    tags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    domains: [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
  };
}

async function buildLife() {
  const categories = ['play', 'people', 'diary', 'eat', 'drink'];
  const output = { generatedAt: new Date().toISOString(), categories: {} };

  for (const category of categories) {
    const dir = path.join(lifeRoot, category);
    const files = await walk(dir);
    const entries = [];
    for (const fullPath of files) {
      const raw = await fs.readFile(fullPath, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const rel = toPosix(path.relative(ROOT, fullPath));
      const base = path.basename(fullPath, path.extname(fullPath));
      const title = meta.title || firstHeading(body) || base;
      const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);
      entries.push({
        path: rel,
        slug: normalizeAlias(`${category}/${base}`),
        category,
        title,
        date: meta.date || '',
        city: meta.city || '',
        place: meta.place || '',
        rating: meta.rating ?? '',
        price: meta.price || '',
        item: meta.item || meta.dish || meta.drink || '',
        mood: meta.mood || '',
        summary: meta.summary || excerpt(body),
        tags,
        meta
      });
    }
    entries.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title, 'zh-Hans-CN'));
    output.categories[category] = entries;
  }
  return output;
}

async function main() {
  await fs.mkdir(dataRoot, { recursive: true });
  const knowledge = await buildKnowledge();
  const life = await buildLife();
  await fs.writeFile(path.join(dataRoot, 'knowledge-index.json'), JSON.stringify(knowledge, null, 2) + '\n');
  await fs.writeFile(path.join(dataRoot, 'life-index.json'), JSON.stringify(life, null, 2) + '\n');
  console.log(`Indexed ${knowledge.stats.nodes} knowledge notes, ${knowledge.stats.links} links.`);
  const lifeCount = Object.values(life.categories).reduce((sum, items) => sum + items.length, 0);
  console.log(`Indexed ${lifeCount} life records.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
