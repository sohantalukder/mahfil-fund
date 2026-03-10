/**
 * Generates background styles from configuration
 * @param configuration
 */
export const generateBackgrounds = (configuration) => {
    return Object.entries(configuration.backgrounds).reduce((accumulator, [key, value]) => {
        return Object.assign(accumulator, {
            [key]: {
                backgroundColor: value,
            },
        });
    }, {});
};
/**
 * Static background styles
 * @desc These styles are not generated from configuration, you can add your own
 */
export const staticBackgroundStyles = {};
