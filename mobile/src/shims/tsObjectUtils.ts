/**
 * recyclerlistview depends on ts-object-utils, whose pnpm symlink is not
 * consistently visible to Metro. Keep the two helpers it imports inside the
 * project so production bundles resolve deterministically.
 */
export const ObjectUtil = {
  isNullOrUndefined(value: unknown): boolean {
    return !(value || value === 0 || value === false);
  },
};

export const Default = {
  value<T>(value: T | null | undefined, defaultValue: T): T {
    return ObjectUtil.isNullOrUndefined(value) ? defaultValue : (value as T);
  },
};
