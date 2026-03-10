/**
 * Validates if an item is a valid SelectItem
 * @param item - The item to validate
 * @returns True if the item is valid
 */
const validateSelectItem = (item) => {
    return (typeof item === 'object' &&
        item !== null &&
        (typeof item.key === 'string' ||
            typeof item.key === 'number' ||
            item.key === undefined) &&
        (typeof item.value === 'string' ||
            typeof item.value === 'number' ||
            item.value === undefined));
};
export { validateSelectItem };
