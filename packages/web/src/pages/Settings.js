"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = Settings;
const react_1 = require("react");
const auth_1 = require("@/store/auth");
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
function Settings() {
    const user = (0, auth_1.useAuthStore)((state) => state.user);
    const [showApiKey, setShowApiKey] = (0, react_1.useState)(false);
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        react_hot_toast_1.default.success('Copied to clipboard');
    };
    return (<div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and API access
        </p>
      </div>

      {/* Account Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <lucide_react_1.User className="h-5 w-5 mr-2 text-gray-400"/>
            Account Information
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">{user?.id}</p>
          </div>
        </div>
      </div>

      {/* API Access */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <lucide_react_1.Key className="h-5 w-5 mr-2 text-gray-400"/>
            API Access
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your API Key
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <input type={showApiKey ? 'text' : 'password'} value={user?.apiKey || ''} readOnly className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-sm font-mono"/>
              </div>
              <button onClick={() => setShowApiKey(!showApiKey)} className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                {showApiKey ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => copyToClipboard(user?.apiKey || '')} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <lucide_react_1.Copy className="h-4 w-4"/>
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Use this API key to authenticate with the Webhook Proxy API
            </p>
          </div>

          <div className="bg-amber-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <lucide_react_1.Shield className="h-5 w-5 text-amber-400"/>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Keep your API key secure
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Never share your API key publicly</li>
                    <li>Don't commit it to version control</li>
                    <li>Regenerate it if you suspect it's been compromised</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">API Documentation</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            Learn how to integrate with the Webhook Proxy API
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Base URL</h3>
              <code className="block bg-gray-50 p-2 rounded text-sm">
                {window.location.origin}/api
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Authentication</h3>
              <p className="text-sm text-gray-500 mb-2">
                Include your API key in the request headers:
              </p>
              <code className="block bg-gray-50 p-2 rounded text-sm">
                X-API-Key: {user?.apiKey}
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Example Request</h3>
              <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
        {`curl -X GET ${window.location.origin}/api/endpoints \\
  -H "X-API-Key: ${user?.apiKey}"`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* CLI Tool */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">CLI Tool</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            Use our CLI tool for easy webhook management from your terminal
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Installation</h3>
              <code className="block bg-gray-50 p-2 rounded text-sm">
                npm install -g @webhook-proxy/cli
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Login</h3>
              <code className="block bg-gray-50 p-2 rounded text-sm">
                webhook-proxy login {user?.apiKey}
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Start</h3>
              <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
        {`# Create a new endpoint
webhook-proxy create "My App" "http://localhost:3000/webhook"

# List all endpoints
webhook-proxy list

# Follow webhook logs in real-time
webhook-proxy logs <endpoint-id> --follow`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=Settings.js.map