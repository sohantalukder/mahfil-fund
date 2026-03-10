export function validateMultipleSelectItem(item) {
    return Boolean(item?.label && item?.value);
}
export function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
}
