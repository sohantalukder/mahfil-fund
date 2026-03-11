import type { MultipleSelectItem } from '../types/multiple-select-list.type';

export function validateMultipleSelectItem(item: MultipleSelectItem): boolean {
  return Boolean(item?.label && item?.value);
}

export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}
