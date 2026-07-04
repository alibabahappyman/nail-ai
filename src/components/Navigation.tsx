'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/design', label: '开始设计' },
  { href: '/community', label: '灵感社区' },
  { href: '/profile', label: '我的藏品' },
  { href: '/tips', label: '护甲知识' },
];

interface AuthUser {
  id: string;
  name: string;
  avatar: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setUser(data.user || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        background: 'rgba(11,8,10,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        height: '60px',
        padding: '0 40px',
      }}
    >
      <Link href="/" className="flex items-center gap-2 no-underline">
        <img src="/nav-icon.png" alt="NailAI" style={{ height: '36px', width: 'auto' }} />
      </Link>
      <div className="flex gap-7 items-center">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="no-underline transition-colors duration-300 relative"
              style={{
                color: isActive ? 'var(--accent-gold)' : 'var(--ink-secondary)',
                fontSize: '13px',
              }}
            >
              {item.label}
              {isActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-[1px]" style={{ background: 'var(--accent-gold)', opacity: 0.6 }} />
              )}
            </Link>
          );
        })}

        {/* 登录态入口 */}
        <div className="flex items-center gap-3 ml-4" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
          {loading ? (
            <span style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>·</span>
          ) : user ? (
            <>
              <Link href="/profile" className="no-underline flex items-center gap-2" style={{ color: 'var(--ink-secondary)', fontSize: '13px' }}>
                <span
                  className="inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
                  style={{ width: '22px', height: '22px', color: 'var(--accent-gold)', fontSize: '14px' }}
                >
                  {user.avatar && user.avatar.startsWith('http')
                    ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    : (user.avatar || '✦')}
                </span>
                <span>{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="no-underline cursor-pointer transition-colors"
                style={{ color: 'var(--ink-muted)', fontSize: '12px', background: 'transparent', border: 'none' }}
              >
                登出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="no-underline transition-colors" style={{ color: 'var(--ink-secondary)', fontSize: '13px' }}>
                登录
              </Link>
              <Link
                href="/register"
                className="no-underline transition-colors"
                style={{
                  color: '#0a0a0f',
                  fontSize: '12px',
                  background: 'linear-gradient(135deg, var(--accent-gold), #b8942e)',
                  padding: '5px 14px',
                  borderRadius: '6px',
                }}
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
