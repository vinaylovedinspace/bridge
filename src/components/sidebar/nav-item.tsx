'use client';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';

import { navItems } from './nav-items';
import Link from 'next/link';

export function NavItem({ item }: { item: (typeof navItems)[number] }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link href={item.href} className="block" id={item.label}>
      <Button
        variant="ghost"
        className={cn(
          'w-full h-full min-h-[28px] py-4 px-3 cursor-pointer justify-start',
          isActive && 'bg-gray-100 text-primary'
        )}
      >
        <span className={cn('text-base font-medium', isActive ? 'text-primary' : 'text-gray-600')}>
          {item.label}
        </span>
      </Button>
    </Link>
  );
}
