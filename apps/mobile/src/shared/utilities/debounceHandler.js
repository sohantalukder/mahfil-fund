const debounceHandler = (fn, delay = 500) => {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
};
export default debounceHandler;
