"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const api_1 = require("@/lib/api");
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login: async (apiKey) => {
        const response = await api_1.api.post('/api/auth/login', { apiKey });
        const { user, token } = response.data.data;
        set({
            user,
            token,
            isAuthenticated: true,
        });
        // Set token for future requests
        api_1.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    },
    logout: () => {
        set({
            user: null,
            token: null,
            isAuthenticated: false,
        });
        delete api_1.api.defaults.headers.common['Authorization'];
    },
    setAuth: (user, token) => {
        set({
            user,
            token,
            isAuthenticated: true,
        });
        api_1.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    },
}), {
    name: 'webhook-proxy-auth',
    onRehydrateStorage: () => (state) => {
        if (state?.token) {
            api_1.api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
    },
}));
//# sourceMappingURL=auth.js.map