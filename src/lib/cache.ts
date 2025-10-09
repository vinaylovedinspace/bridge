import { revalidateTag, unstable_cache } from 'next/cache';
import { cache } from 'react';
import { formatCompactNumber } from './utils';

formatCompactNumber(2090);

export type ValidTags = ReturnType<typeof getGlobalTag> | ReturnType<typeof getIdTag>;

export const CACHE_TAGS = {
  branch: 'branch',
} as const;

type CacheTag = keyof typeof CACHE_TAGS;

export function getGlobalTag(tag: CacheTag) {
  return `global:${CACHE_TAGS[tag]}` as const;
}

export function getIdTag(id: string, tag: CacheTag) {
  return `id:${id}-${CACHE_TAGS[tag]}` as const;
}

export function clearFullCache() {
  revalidateTag('*');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbCache<T extends (...args: any[]) => Promise<any>>(
  cb: Parameters<typeof unstable_cache<T>>[0],
  { tags }: { tags: ValidTags[] }
) {
  return cache(unstable_cache<T>(cb, undefined, { tags: [...tags, '*'] }));
}

export function revalidateDbCache({ tag, id }: { tag: CacheTag; id?: string }) {
  revalidateTag(getGlobalTag(tag));
  if (id != null) {
    revalidateTag(getIdTag(id, tag));
  }
}
