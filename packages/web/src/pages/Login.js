"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Login = Login;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const auth_1 = require("@/store/auth");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
function Login() {
    const [apiKey, setApiKey] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const login = (0, auth_1.useAuthStore)((state) => state.login);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            react_hot_toast_1.default.error('Please enter your API key');
            return;
        }
        setIsLoading(true);
        try {
            await login(apiKey);
            react_hot_toast_1.default.success('Login successful!');
            navigate('/');
        }
        catch (error) {
            react_hot_toast_1.default.error(error.response?.data?.error || 'Invalid API key');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <lucide_react_1.Webhook className="h-12 w-12 text-primary-600"/>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Webhook Proxy
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your API key to access your webhooks
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <div className="mt-1">
              <input id="api-key" name="api-key" type="password" autoComplete="current-password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="whp_..."/>
            </div>
          </div>

          <div>
            <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an API key?{' '}
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                Request access
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>);
}
//# sourceMappingURL=Login.js.map