export interface Config {
    apiKey?: string;
    apiUrl?: string;
}
export declare function loadConfig(): Config;
export declare function saveConfig(config: Config): void;
export declare function getApiKey(): string | undefined;
export declare function getApiUrl(): string;
//# sourceMappingURL=config.d.ts.map