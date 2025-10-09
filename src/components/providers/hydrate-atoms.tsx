'use client';

/**
 * HydrateAtoms component for initializing Jotai atoms with server-side data
 *
 * Usage:
 * ```tsx
 * <HydrateAtoms atomValues={[[someAtom, serverData]]}>
 *   <YourComponent />
 * </HydrateAtoms>
 * ```
 */

import { useHydrateAtoms } from 'jotai/utils';
import type { WritableAtom } from 'jotai';

type AnyWritableAtom = WritableAtom<unknown, [unknown], unknown>;
type AtomValueTuple = readonly [AnyWritableAtom, unknown];

type HydrateAtomsProps = {
  atomValues: Iterable<AtomValueTuple>;
  children: React.ReactNode;
};

export function HydrateAtoms({ atomValues, children }: HydrateAtomsProps) {
  useHydrateAtoms(new Map(atomValues));
  return children;
}
