'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useQueryState } from 'nuqs';

type ClientSearchProps = {
  placeholder?: string;
  className?: string;
};

export const ClientSearch = ({
  placeholder = 'Search by name or phone number',
  className = 'w-96',
}: ClientSearchProps) => {
  const [search, setSearch] = useQueryState('search', {
    shallow: false,
    throttleMs: 500,
  });

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        data-testid="client-search-input"
        value={search || ''}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className={`pl-9 ${className}`}
      />
    </div>
  );
};
