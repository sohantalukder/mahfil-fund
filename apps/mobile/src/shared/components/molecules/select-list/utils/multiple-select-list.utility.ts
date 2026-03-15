import type { MultipleSelectItem } from '../types/multiple-select-list.type';

export function validateMultipleSelectItem(_item: MultipleSelectItem): boolean {
  return true;
}

export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
