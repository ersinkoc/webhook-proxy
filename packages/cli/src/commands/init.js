"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const config_js_1 = require("../config.js");
async function init() {
    console.log(chalk_1.default.blue('🚀 Webhook Proxy CLI Setup\n'));
    const currentConfig = (0, config_js_1.loadConfig)();
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'apiUrl',
            message: 'API URL:',
            default: currentConfig.apiUrl || 'http://localhost:3001',
            validate: (input) => {
                try {
                    new URL(input);
                    return true;
                }
                catch {
                    return 'Please enter a valid URL';
                }
            },
        },
        {
            type: 'password',
            name: 'apiKey',
            message: 'API Key (optional, can be set later with login):',
            default: currentConfig.apiKey,
        },
    ]);
    const config = {
        apiUrl: answers.apiUrl,
        ...(answers.apiKey && { apiKey: answers.apiKey }),
    };
    (0, config_js_1.saveConfig)(config);
    console.log(chalk_1.default.green('\n✅ Configuration saved!'));
    if (!answers.apiKey) {
        console.log(chalk_1.default.yellow('\n⚠️  No API key set. Run "webhook-proxy login <api-key>" to authenticate.'));
    }
}
//# sourceMappingURL=init.js.map