'use client';

import Image from 'next/image';
import Link from 'next/link';
import { forwardRef, type ComponentProps } from 'react';
import { VirtuosoGrid, type GridComponents } from 'react-virtuoso';

import { placeholderDogPhotoUrl } from '@/lib/placeholder-images';

import type { Pet } from '@petwalker/shared/types';

interface Props {
  items: Pet[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onEndReached: () => void;
}

/**
 * Virtualized pet grid powered by react-virtuoso.
 *
 * Only the rows currently visible (plus a small overscan buffer) are mounted —
 * the page can render 50K+ pets without DOM bloat. Auto-fetches the next page
 * when the user scrolls within `overscan` distance of the bottom.
 *
 * The grid uses its own internal scroll container and fills 100% of its
 * parent's height. The parent is responsible for giving it a bounded height
 * (e.g. `flex-1 min-h-0`) so the page header and filter bars stay fixed and
 * only the items list scrolls.
 */
export function PetsGrid({
  items,
  hasNextPage,
  isFetchingNextPage,
  onEndReached,
}: Props): JSX.Element {
  return (
    <VirtuosoGrid
      style={{ height: '100%' }}
      data={items}
      overscan={400}
      endReached={() => {
        if (hasNextPage && !isFetchingNextPage) onEndReached();
      }}
      components={GRID_COMPONENTS}
      itemContent={(_index, pet) => <PetCard pet={pet} />}
    />
  );
}

const GRID_COMPONENTS: GridComponents = {
  // The list IS the grid container — Tailwind's responsive grid handles columns.
  List: forwardRef<HTMLDivElement, ComponentProps<'div'>>(function GridList(
    { style, children, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        style={style}
        {...rest}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {children}
      </div>
    );
  }),
  // Each Item just unwraps to its child so the grid sees Pet cards directly.
  Item: ({ children, ...rest }) => <div {...rest}>{children}</div>,
};

function PetCard({ pet }: { pet: Pet }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <Link href={`/pets/${pet.id}`} className="block">
        <Image
          src={pet.photoUrl ?? placeholderDogPhotoUrl(pet.id)}
          alt={pet.name}
          width={400}
          height={240}
          className="mb-3 h-40 w-full rounded-lg object-cover"
          unoptimized
          loading="lazy"
        />
        <h3 className="font-semibold">{pet.name}</h3>
        <p className="text-sm text-slate-500">
          {pet.breed ?? pet.species}
          {pet.weightKg != null ? ` · ${pet.weightKg} kg` : null}
          {pet.ageYears != null ? ` · ${pet.ageYears} yo` : null}
        </p>
      </Link>
    </div>
  );
}
