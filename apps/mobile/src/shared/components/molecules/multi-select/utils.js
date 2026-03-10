export const arraysEqual = (a, b) => {
    if (a.length !== b.length)
        return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    for (let i = 0; i < sa.length; i++)
        if (sa[i] !== sb[i])
            return false;
    return true;
};
export const validateMultiSelectItem = (item) => {
    const hasKey = typeof item.key === 'string' || typeof item.key === 'number';
    const hasValue = typeof item.value === 'string' || typeof item.value === 'number';
    return hasKey || hasValue;
};
export const getStoredValue = (item, save) => (save === 'key' ? item.key : item.value) ?? '';
export const getDisplayValue = (item, fallback) => item?.value ?? item?.key ?? fallback ?? '';
