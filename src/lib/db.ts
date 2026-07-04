import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Neon serverless 驱动：走 HTTP，无需长连接池，适配 Vercel serverless 环境。
// 连接串来自 Vercel 注入的 POSTGRES_URL（Pooling 版本），兜底 DATABASE_URL。
// 采用惰性初始化：模块加载时不连接，真正执行查询时才读取环境变量，
// 这样在没有环境变量的本地构建期也能正常编译。

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      '[db] 未找到 POSTGRES_URL / DATABASE_URL 环境变量。' +
      '本地开发请执行 `vercel env pull` 生成 .env.local；线上请在 Vercel 项目连接数据库。'
    );
  }
  _sql = neon(connectionString);
  return _sql;
}

// 惰性调用：直接 `import { sql } from '@/lib/db'`，调用 `sql\`...\`` 时
// 才真正初始化连接。用一个普通函数替代 Proxy，避免在 Next.js server bundle
// 打包时被当成普通对象导出导致 "sql is not a function"。
export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any> {
  return (getSql() as any)(strings, ...values);
}
