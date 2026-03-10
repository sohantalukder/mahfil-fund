// Custom error types for better error handling
export class BottomSheetError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'BottomSheetError';
    }
}
// Constants for better maintainability
export const DEFAULT_SNAP_POINTS = ['25%', '35%'];
export const DEFAULT_BACKDROP_OPACITY = 0.3;
export const DEFAULT_ANIMATION_DURATION = 250;
