"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = App;
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const react_hot_toast_1 = require("react-hot-toast");
const Layout_1 = require("./components/Layout");
const Dashboard_1 = require("./pages/Dashboard");
const Endpoints_1 = require("./pages/Endpoints");
const EndpointDetail_1 = require("./pages/EndpointDetail");
const WebhookDetail_1 = require("./pages/WebhookDetail");
const Login_1 = require("./pages/Login");
const Settings_1 = require("./pages/Settings");
const auth_1 = require("./store/auth");
const SocketContext_1 = require("./contexts/SocketContext");
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
        },
    },
});
function PrivateRoute({ children }) {
    const isAuthenticated = (0, auth_1.useAuthStore)((state) => state.isAuthenticated);
    return isAuthenticated ? <>{children}</> : <react_router_dom_1.Navigate to="/login"/>;
}
function App() {
    return (<react_query_1.QueryClientProvider client={queryClient}>
      <react_router_dom_1.BrowserRouter>
        <SocketContext_1.SocketProvider>
          <react_router_dom_1.Routes>
            <react_router_dom_1.Route path="/login" element={<Login_1.Login />}/>
            <react_router_dom_1.Route path="/" element={<PrivateRoute>
                  <Layout_1.Layout />
                </PrivateRoute>}>
              <react_router_dom_1.Route index element={<Dashboard_1.Dashboard />}/>
              <react_router_dom_1.Route path="endpoints" element={<Endpoints_1.Endpoints />}/>
              <react_router_dom_1.Route path="endpoints/:id" element={<EndpointDetail_1.EndpointDetail />}/>
              <react_router_dom_1.Route path="webhooks/:id" element={<WebhookDetail_1.WebhookDetail />}/>
              <react_router_dom_1.Route path="settings" element={<Settings_1.Settings />}/>
            </react_router_dom_1.Route>
          </react_router_dom_1.Routes>
          <react_hot_toast_1.Toaster position="bottom-right" toastOptions={{
            duration: 4000,
            style: {
                background: '#1f2937',
                color: '#f3f4f6',
            },
        }}/>
        </SocketContext_1.SocketProvider>
      </react_router_dom_1.BrowserRouter>
    </react_query_1.QueryClientProvider>);
}
//# sourceMappingURL=App.js.map