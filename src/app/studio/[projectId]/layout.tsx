'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default function StudioLayout({ children, params }: LayoutProps) {
  const { projectId } = use(params); // Next.js 15 Promise unwrapping [4]
  const pathname = usePathname();

  const navItems = [
    { name: 'Universe Engine', path: `/studio/${projectId}/universe` },
    { name: 'Character Engine', path: `/studio/${projectId}/characters` },
    { name: 'Episode Director', path: `/studio/${projectId}/episodes` },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Sub-Navigation Panel */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-8 py-3.5 flex gap-8 items-center">
          <Link 
            href="/" 
            className="text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition mr-2"
          >
            ← Dashboard
          </Link>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`text-sm font-bold transition py-1 border-b-2 ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Sub-Page Render Frame */}
      <div className="flex-grow">{children}</div>
    </div>
  );
}