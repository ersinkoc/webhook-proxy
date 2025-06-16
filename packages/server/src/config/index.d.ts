export declare const config: {
    readonly env: "development" | "test" | "production";
    readonly port: number;
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
    readonly isTest: boolean;
    readonly database: {
        readonly url: string;
    };
    readonly redis: {
        readonly url: string;
    };
    readonly security: {
        readonly jwtSecret: string;
        readonly apiKeySalt: string;
    };
    readonly urls: {
        readonly api: string;
        readonly web: string;
        readonly publicWebhook: string;
    };
    readonly rateLimit: {
        readonly max: number;
        readonly windowMs: number;
    };
    readonly webhook: {
        readonly timeoutMs: number;
        readonly maxRetries: number;
        readonly retryDelayMs: number;
    };
};
//# sourceMappingURL=index.d.ts.map