import { Button } from '@/components/ui/button';
import { SignOutButton } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { navItems } from './nav-items';
import { NavItem } from './nav-item';
import { OrgSelector } from '@/components/organization/org-selector';

export function Sidebar() {
  return (
    <div className="w-72 flex flex-col sticky top-0 max-h-screen transition-all duration-300 px-2 py-10 bg-white rounded-xl">
      <div className="flex flex-col flex-1 space-y-10">
        <div className="min-h-8">
          <OrgSelector />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </div>
      <div className="mt-auto">
        <SignOutButton>
          <Button variant="ghost" className="w-full flex justify-start h-14">
            <LogOut />
            Log out
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}
