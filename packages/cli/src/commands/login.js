"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const config_js_1 = require("../config.js");
const axios_1 = __importDefault(require("axios"));
async function login(apiKey) {
    const spinner = (0, ora_1.default)('Verifying API key...').start();
    try {
        const config = (0, config_js_1.loadConfig)();
        // Verify the API key
        const response = await axios_1.default.get(`${config.apiUrl}/api/auth/me`, {
            headers: {
                'X-API-Key': apiKey,
            },
        });
        const user = response.data.data.user;
        // Save the API key
        (0, config_js_1.saveConfig)({
            ...config,
            apiKey,
        });
        spinner.succeed(chalk_1.default.green(`Logged in as ${user.email}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Invalid API key'));
        process.exit(1);
    }
}
//# sourceMappingURL=login.js.map