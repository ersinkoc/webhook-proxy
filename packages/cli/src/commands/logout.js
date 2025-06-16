"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = logout;
const chalk_1 = __importDefault(require("chalk"));
const config_js_1 = require("../config.js");
function logout() {
    const config = (0, config_js_1.loadConfig)();
    if (!config.apiKey) {
        console.log(chalk_1.default.yellow('Not logged in'));
        return;
    }
    (0, config_js_1.saveConfig)({
        ...config,
        apiKey: undefined,
    });
    console.log(chalk_1.default.green('✅ Logged out successfully'));
}
//# sourceMappingURL=logout.js.map