import { BIBLE_BOOKS } from '../data/bibleBooks';

export type CanonMode = 'all' | 'ot' | 'nt';

export function getActiveIndices(mode: CanonMode): number[] {
  return BIBLE_BOOKS.reduce<number[]>((acc, book, index) => {
    if (mode === 'all') acc.push(index);
    else if (mode === 'ot' && book.testament === 'OT') acc.push(index);
    else if (mode === 'nt' && book.testament === 'NT') acc.push(index);
    return acc;
  }, []);
}

export function toGlobalIndex(activeIndices: number[], localIndex: number): number {
  return activeIndices[localIndex];
}

export function modeLabel(mode: CanonMode): string {
  switch (mode) {
    case 'ot':
      return 'Old Testament';
    case 'nt':
      return 'New Testament';
    default:
      return 'Whole Bible';
  }
}

export function modeShortLabel(mode: CanonMode): string {
  switch (mode) {
    case 'ot':
      return 'OT';
    case 'nt':
      return 'NT';
    default:
      return 'All 66';
  }
}

export function modeDescription(mode: CanonMode): string {
  const count = getActiveIndices(mode).length;
  return `${modeLabel(mode)} · ${count} books`;
}
