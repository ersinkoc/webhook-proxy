"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEndpoint = deleteEndpoint;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const api_js_1 = require("../api.js");
async function deleteEndpoint(endpointId) {
    try {
        const api = (0, api_js_1.createApiClient)();
        // Get endpoint details first
        const endpointResponse = await api.get(`/api/endpoints/${endpointId}`);
        const endpoint = endpointResponse.data.data;
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to delete "${endpoint.name}"?`,
                default: false,
            },
        ]);
        if (!confirm) {
            console.log(chalk_1.default.yellow('Deletion cancelled'));
            return;
        }
        const spinner = (0, ora_1.default)('Deleting endpoint...').start();
        await api.delete(`/api/endpoints/${endpointId}`);
        spinner.succeed(chalk_1.default.green('Endpoint deleted successfully'));
    }
    catch (error) {
        if (error.response?.status === 404) {
            console.error(chalk_1.default.red('Endpoint not found'));
        }
        else {
            console.error(chalk_1.default.red('Failed to delete endpoint'));
            console.error(chalk_1.default.red(error.message));
        }
        process.exit(1);
    }
}
//# sourceMappingURL=delete.js.map