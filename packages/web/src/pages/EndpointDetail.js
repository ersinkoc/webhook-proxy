"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointDetail = EndpointDetail;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const lucide_react_1 = require("lucide-react");
const api_1 = require("@/lib/api");
const date_fns_1 = require("date-fns");
const SocketContext_1 = require("@/contexts/SocketContext");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const clsx_1 = __importDefault(require("clsx"));
function EndpointDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const { socket, subscribeToEndpoint, unsubscribeFromEndpoint } = (0, SocketContext_1.useSocket)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const [filter, setFilter] = (0, react_1.useState)('all');
    const { data: endpoint } = (0, react_query_1.useQuery)({
        queryKey: ['endpoint', id],
        queryFn: async () => {
            const response = await api_1.api.get(`/api/endpoints/${id}`);
            return response.data.data;
        },
    });
    const { data: webhooks, refetch: refetchWebhooks } = (0, react_query_1.useQuery)({
        queryKey: ['webhooks', id, filter],
        queryFn: async () => {
            const params = new URLSearchParams({
                endpointId: id,
                pageSize: '50',
            });
            if (filter === 'success') {
                params.append('success', 'true');
            }
            else if (filter === 'failed') {
                params.append('success', 'false');
            }
            const response = await api_1.api.get(`/api/webhooks?${params}`);
            return response.data.data.items;
        },
        enabled: !!id,
    });
    const clearWebhooksMutation = (0, react_query_1.useMutation)({
        mutationFn: async () => {
            await api_1.api.delete(`/api/webhooks/bulk?endpointId=${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks', id] });
            react_hot_toast_1.default.success('All webhooks cleared');
        },
    });
    (0, react_1.useEffect)(() => {
        if (!id || !socket)
            return;
        subscribeToEndpoint(id);
        const handleWebhookEvent = (event) => {
            // Refetch webhooks when new events arrive
            refetchWebhooks();
            queryClient.invalidateQueries({ queryKey: ['endpoint', id] });
        };
        socket.on('webhook:event', handleWebhookEvent);
        return () => {
            unsubscribeFromEndpoint(id);
            socket.off('webhook:event', handleWebhookEvent);
        };
    }, [id, socket, subscribeToEndpoint, unsubscribeFromEndpoint, refetchWebhooks, queryClient]);
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        react_hot_toast_1.default.success('Copied to clipboard');
    };
    const getWebhookUrl = (slug) => {
        return `${window.location.origin}/webhook/${slug}`;
    };
    const exportWebhooks = () => {
        if (!webhooks)
            return;
        const data = JSON.stringify(webhooks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webhooks-${endpoint?.slug}-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    if (!endpoint) {
        return (<div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>);
    }
    return (<div className="space-y-6">
      {/* Header */}
      <div>
        <react_router_dom_1.Link to="/endpoints" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <lucide_react_1.ArrowLeft className="h-4 w-4 mr-1"/>
          Back to endpoints
        </react_router_dom_1.Link>
        <div className="bg-white shadow rounded-lg px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{endpoint.name}</h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span className={(0, clsx_1.default)('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', endpoint.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800')}>
                  {endpoint.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="flex items-center">
                  <lucide_react_1.ExternalLink className="h-4 w-4 mr-1"/>
                  {endpoint.targetUrl}
                </span>
                <span>{endpoint.webhookCount} total webhooks</span>
              </div>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-gray-200">
                {getWebhookUrl(endpoint.slug)}
              </code>
              <button onClick={() => copyToClipboard(getWebhookUrl(endpoint.slug))} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <lucide_react_1.Copy className="h-4 w-4"/>
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint API Key
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-gray-200 font-mono">
                {endpoint.apiKey}
              </code>
              <button onClick={() => copyToClipboard(endpoint.apiKey)} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <lucide_react_1.Copy className="h-4 w-4"/>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Webhooks</h2>
            <div className="flex items-center space-x-2">
              <div className="flex rounded-md shadow-sm">
                <button onClick={() => setFilter('all')} className={(0, clsx_1.default)('px-3 py-1 text-sm font-medium rounded-l-md border', filter === 'all'
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')}>
                  All
                </button>
                <button onClick={() => setFilter('success')} className={(0, clsx_1.default)('px-3 py-1 text-sm font-medium border-t border-b', filter === 'success'
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')}>
                  Success
                </button>
                <button onClick={() => setFilter('failed')} className={(0, clsx_1.default)('px-3 py-1 text-sm font-medium rounded-r-md border', filter === 'failed'
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')}>
                  Failed
                </button>
              </div>
              <button onClick={exportWebhooks} className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <lucide_react_1.Download className="h-4 w-4 mr-1"/>
                Export
              </button>
              {webhooks && webhooks.length > 0 && (<button onClick={() => {
                if (confirm('Are you sure you want to clear all webhooks?')) {
                    clearWebhooksMutation.mutate();
                }
            }} className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50">
                  <lucide_react_1.Trash2 className="h-4 w-4 mr-1"/>
                  Clear All
                </button>)}
            </div>
          </div>
        </div>

        <div className="overflow-hidden">
          {webhooks && webhooks.length > 0 ? (<ul className="divide-y divide-gray-200">
              {webhooks.map((webhook) => {
                const isSuccess = webhook.statusCode && webhook.statusCode >= 200 && webhook.statusCode < 400;
                return (<li key={webhook.id}>
                    <react_router_dom_1.Link to={`/webhooks/${webhook.id}`} className="block hover:bg-gray-50 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {webhook.statusCode ? (isSuccess ? (<lucide_react_1.CheckCircle className="h-5 w-5 text-green-400"/>) : (<lucide_react_1.XCircle className="h-5 w-5 text-red-400"/>)) : (<lucide_react_1.Clock className="h-5 w-5 text-gray-400 animate-pulse"/>)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {webhook.method} Request
                            </div>
                            <div className="text-sm text-gray-500">
                              {(0, date_fns_1.formatDistanceToNow)(new Date(webhook.createdAt), { addSuffix: true })}
                              {webhook.statusCode && ` • ${webhook.statusCode}`}
                              {webhook.duration && ` • ${webhook.duration}ms`}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {webhook.deliveredAt ? 'Delivered' : 'Pending'}
                        </div>
                      </div>
                    </react_router_dom_1.Link>
                  </li>);
            })}
            </ul>) : (<div className="text-center py-12">
              <lucide_react_1.Clock className="mx-auto h-12 w-12 text-gray-400"/>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Send a webhook to {getWebhookUrl(endpoint.slug)} to see it here
              </p>
            </div>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=EndpointDetail.js.map