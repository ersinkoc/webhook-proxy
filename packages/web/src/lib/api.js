"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const axios_1 = __importDefault(require("axios"));
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
exports.api = axios_1.default.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: {
        'Content-Type': 'application/json',
    },
});
// Request interceptor
exports.api.interceptors.request.use((config) => {
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor
exports.api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response?.status === 401) {
        // Handle unauthorized
        window.location.href = '/login';
    }
    else if (error.response?.status >= 500) {
        react_hot_toast_1.default.error('Server error. Please try again later.');
    }
    return Promise.reject(error);
});
//# sourceMappingURL=api.js.map