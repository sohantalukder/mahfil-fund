/**
 * @fileoverview HTTP client class that provides a wrapper around Axios for making HTTP requests
 * Supports multiple instances with shared interceptors for microservices architecture
 */
import axios from 'axios';
import localStore from '@/services/storage/localStore.service';
import NetInfo from '@react-native-community/netinfo';
import { NETWORK_ERROR } from '@/assets/constants/network.constant';
import { logger } from '@/ignoreWarnings';
export const CONTENT_TYPE = {
    formUrlEncoded: 'application/x-www-form-urlencoded',
    applicationJson: 'application/json',
};
/**
 * Base HTTP client class that provides standardized methods for making HTTP requests
 * across different microservices while sharing global interceptors
 */
export class Http {
    /**
     * Creates a new HTTP client instance with specific base URL and shared interceptors
     * @param baseURL - The base URL for all requests made through this instance
     */
    constructor(baseURL) {
        this.axiosInstance = axios.create({
            baseURL,
            withCredentials: true,
        });
        // Apply timeout only in production environment
        if (__DEV__ === false) {
            this.axiosInstance.defaults.timeout = 60000; // 60 seconds timeout
        }
        this.setupInterceptors();
    }
    /**
     * Sets up request and response interceptors for the axios instance
     */
    setupInterceptors() {
        // Add request interceptors
        this.axiosInstance.interceptors.request.use(async (config) => {
            // Log request
            if (__DEV__) {
                console.warn('🚀 Request:', {
                    method: config.method?.toUpperCase(),
                    url: this.axiosInstance.defaults.baseURL + '/' + (config.url || ''),
                    headers: config.headers,
                    data: config.data,
                    params: config.params,
                });
            }
            const isNetwork = await NetInfo.fetch();
            if (!isNetwork.isConnected) {
                return Promise.reject(new Error(NETWORK_ERROR.noInternet));
            }
            // Add authentication token
            const token = localStore.getApiToken();
            if (token) {
                config.headers.set('Authorization', `Bearer ${token}`);
            }
            return config;
        }, (error) => Promise.reject(error));
        // Add response interceptors
        this.axiosInstance.interceptors.response.use((response) => {
            // Log response
            logger.warn('✅ Response:', {
                status: response.status,
                statusText: response.statusText,
                url: this.axiosInstance.defaults.baseURL +
                    '/' +
                    (response.config?.url || ''),
                headers: response.headers,
                data: response.data,
            });
            return response;
        }, async (error) => {
            // Log error
            if (axios.isAxiosError(error)) {
                logger.warn('❌ Error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: this.axiosInstance.defaults.baseURL +
                        '/' +
                        (error.config?.url || ''),
                    headers: error.response?.headers,
                    data: error.response?.data,
                    message: error.message,
                });
            }
            else {
                logger.warn('❌ Error:', error);
            }
            const originalRequest = error.config;
            // Handle timeout errors with retry mechanism (production only)
            if (!__DEV__ && error.code === 'ECONNABORTED') {
                originalRequest._retryCount = originalRequest._retryCount || 0;
                if (originalRequest._retryCount < Http.RETRY_LIMIT) {
                    originalRequest._retryCount += 1;
                    return this.axiosInstance(originalRequest);
                }
            }
            return Promise.reject(error);
        });
    }
    /**
     * Static getter to access the global axios instance
     * Used by interceptors and global configuration
     */
    static get axios() {
        return Http.globalAxios;
    }
    /**
     * Creates a standardized config object for regular HTTP requests
     * @param config - Extended request configuration
     * @param withCredentials - Whether to include credentials in the request
     * @param contentType - Content type header value
     * @returns Configured AxiosRequestConfig object
     */
    createConfig(config = {}, withCredentials = true, contentType = CONTENT_TYPE.applicationJson) {
        return {
            ...config,
            headers: {
                'Content-Type': contentType,
                ...(config?.headers || {}),
            },
            params: config?.params || {},
            paramsSerializer: {
                serialize: (params) => {
                    const searchParams = new URLSearchParams();
                    Object.entries(params).forEach(([key, value]) => {
                        if (Array.isArray(value)) {
                            value.forEach((item) => searchParams.append(key, String(item)));
                        }
                        else {
                            searchParams.append(key, String(value));
                        }
                    });
                    return searchParams.toString();
                },
            },
            withCredentials,
        };
    }
    /**
     * Creates a specialized config object for FormData requests
     * @param config - Extended request configuration
     * @param withCredentials - Whether to include credentials in the request
     * @returns Configured AxiosRequestConfig object
     */
    createFormDataConfig(config = {}, withCredentials = true) {
        return {
            ...config,
            headers: {
                ...(config?.headers || {}),
            },
            params: config?.params || {},
            withCredentials,
        };
    }
    /**
     * HTTP request methods for making API calls
     * All methods handle response data extraction and proper configuration
     *
     * @template T - Type of the response data
     * @template D - Type of the request payload (for POST, PUT, PATCH methods)
     *
     * @param endpoint - API endpoint path
     * @param data - Request payload (for POST, PUT, PATCH methods)
     * @param config - Extended request configuration object
     * @param withCredentials - Whether to include credentials in request (defaults to true)
     * @param contentType - Content-Type header value (defaults to application/json)
     *
     * @returns Promise<T> - Resolves to response data of type T
     *
     * @remarks
     * - Automatically handles FormData vs JSON payloads
     * - Inherits global interceptors for authentication and retries
     * - All methods return unwrapped response data
     */
    async get(endpoint, config = {}, withCredentials = true, contentType = CONTENT_TYPE.applicationJson) {
        const response = await this.axiosInstance.get(endpoint, this.createConfig(config, withCredentials, contentType));
        return response.data;
    }
    async post(endpoint, data, config = {}, withCredentials = true, contentType = CONTENT_TYPE.applicationJson) {
        const isFormData = data instanceof FormData;
        const finalConfig = isFormData
            ? this.createFormDataConfig(config, withCredentials)
            : this.createConfig(config, withCredentials, contentType);
        const response = await this.axiosInstance.post(endpoint, data, finalConfig);
        return response.data;
    }
    async put(endpoint, data, config = {}, withCredentials = true, contentType = CONTENT_TYPE.applicationJson) {
        const isFormData = data instanceof FormData;
        const finalConfig = isFormData
            ? this.createFormDataConfig(config, withCredentials)
            : this.createConfig(config, withCredentials, contentType);
        const response = await this.axiosInstance.put(endpoint, data, finalConfig);
        return response.data;
    }
    async patch(endpoint, data, config = {}, withCredentials = true, contentType = CONTENT_TYPE.applicationJson) {
        const isFormData = data instanceof FormData;
        const finalConfig = isFormData
            ? this.createFormDataConfig(config, withCredentials)
            : this.createConfig(config, withCredentials, contentType);
        const response = await this.axiosInstance.patch(endpoint, data, finalConfig);
        return response.data;
    }
    async delete(endpoint, data, config = {}, withCredentials = true, contentType = CONTENT_TYPE.applicationJson) {
        const finalConfig = {
            ...this.createConfig(config, withCredentials, contentType),
            data,
        };
        const response = await this.axiosInstance.delete(endpoint, finalConfig);
        return response.data;
    }
}
Http.globalAxios = axios;
Http.RETRY_LIMIT = 1;
