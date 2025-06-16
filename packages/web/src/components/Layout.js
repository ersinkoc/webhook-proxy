"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = Layout;
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const auth_1 = require("@/store/auth");
const SocketContext_1 = require("@/contexts/SocketContext");
const clsx_1 = __importDefault(require("clsx"));
const navigation = [
    { name: 'Dashboard', href: '/', icon: lucide_react_1.Home },
    { name: 'Endpoints', href: '/endpoints', icon: lucide_react_1.Webhook },
    { name: 'Settings', href: '/settings', icon: lucide_react_1.Settings },
];
function Layout() {
    const location = (0, react_router_dom_1.useLocation)();
    const logout = (0, auth_1.useAuthStore)((state) => state.logout);
    const user = (0, auth_1.useAuthStore)((state) => state.user);
    const { isConnected } = (0, SocketContext_1.useSocket)();
    return (<div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <lucide_react_1.Webhook className="h-8 w-8 text-primary-600"/>
                <span className="ml-2 text-xl font-semibold">Webhook Proxy</span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
                (item.href === '/endpoints' && location.pathname.startsWith('/endpoints'));
            return (<react_router_dom_1.Link key={item.name} to={item.href} className={(0, clsx_1.default)('inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium', isActive
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700')}>
                      <item.icon className="w-4 h-4 mr-2"/>
                      {item.name}
                    </react_router_dom_1.Link>);
        })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <lucide_react_1.Activity className={(0, clsx_1.default)('w-4 h-4 mr-2', isConnected ? 'text-green-500' : 'text-red-500')}/>
                <span className="text-sm text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {user?.email}
              </div>
              <button onClick={logout} className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none">
                <lucide_react_1.LogOut className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <react_router_dom_1.Outlet />
      </main>
    </div>);
}
//# sourceMappingURL=Layout.js.map