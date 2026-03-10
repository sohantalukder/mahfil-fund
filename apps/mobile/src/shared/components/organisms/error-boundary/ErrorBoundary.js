import { jsx as _jsx } from "react/jsx-runtime";
import { DefaultError } from '@/shared/components/molecules';
import { ErrorBoundary as DefaultErrorBoundary } from 'react-error-boundary';
const ErrorBoundary = ({ fallback = undefined, onError, onReset = () => { }, ...props }) => {
    const onErrorReport = (error, info) => {
        // use any crash reporting tool here
        return onError?.(error, info);
    };
    return (_jsx(DefaultErrorBoundary, { ...props, fallback: fallback ?? _jsx(DefaultError, { onReset: onReset }), onError: onErrorReport }));
};
export default ErrorBoundary;
