export declare const API_VERSION = "v1";
export declare const HTTP_METHODS: readonly ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
export type HttpMethod = typeof HTTP_METHODS[number];
export declare const WEBHOOK_EVENTS: {
    readonly RECEIVED: "webhook:received";
    readonly DELIVERED: "webhook:delivered";
    readonly FAILED: "webhook:failed";
};
export declare const DEFAULT_PAGINATION: {
    readonly PAGE_SIZE: 20;
    readonly MAX_PAGE_SIZE: 100;
};
export declare const RATE_LIMITS: {
    readonly DEFAULT: {
        readonly MAX: 100;
        readonly WINDOW_MS: number;
    };
    readonly WEBHOOK: {
        readonly MAX: 1000;
        readonly WINDOW_MS: number;
    };
};
//# sourceMappingURL=constants.d.ts.map