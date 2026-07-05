// 一次性建表脚本：读取 .env.local 的连接串，逐条执行 schema.sql。
// 用法：node scripts/apply-schema.mjs   （执行完可删）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// --- 解析 .env.local（只取需要的键） ---
const env = {};
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = env.POSTGRES_URL || env.DATABASE_URL;
if (!url) { console.error('缺少 POSTGRES_URL / DATABASE_URL'); process.exit(1); }

const sql = neon(url);

// --- 拆分 schema.sql 为单条语句（去掉整行注释后按分号切） ---
const raw = readFileSync(join(root, 'schema.sql'), 'utf8')
  .split(/\r?\n/)
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');
const statements = raw.split(';').map((s) => s.trim()).filter(Boolean);

for (const stmt of statements) {
  const label = stmt.split('\n')[0].slice(0, 60);
  try {
    await sql.query(stmt);
    console.log('OK  ', label);
  } catch (e) {
    console.error('FAIL', label, '\n     ', e.message);
    process.exit(1);
  }
}

// --- 校验：列出建好的表 ---
const rows = await sql.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
);
console.log('\n已建表：', rows.map((r) => r.tablename).join(', '));
console.log('全部完成。');
