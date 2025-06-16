"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookDetail = WebhookDetail;
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const lucide_react_1 = require("lucide-react");
const api_1 = require("@/lib/api");
const date_fns_1 = require("date-fns");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const clsx_1 = __importDefault(require("clsx"));
function WebhookDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { data: webhook, refetch } = (0, react_query_1.useQuery)({
        queryKey: ['webhook', id],
        queryFn: async () => {
            const response = await api_1.api.get(`/api/webhooks/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });
    const resendMutation = (0, react_query_1.useMutation)({
        mutationFn: async () => {
            const response = await api_1.api.post(`/api/webhooks/${id}/resend`);
            return response.data.data;
        },
        onSuccess: () => {
            refetch();
            react_hot_toast_1.default.success('Webhook resent successfully');
        },
    });
    const deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: async () => {
            await api_1.api.delete(`/api/webhooks/${id}`);
        },
        onSuccess: () => {
            react_hot_toast_1.default.success('Webhook deleted');
            navigate(-1);
        },
    });
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        react_hot_toast_1.default.success('Copied to clipboard');
    };
    if (!webhook) {
        return (<div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>);
    }
    const isSuccess = webhook.statusCode && webhook.statusCode >= 200 && webhook.statusCode < 400;
    return (<div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <lucide_react_1.ArrowLeft className="h-4 w-4 mr-1"/>
          Back
        </button>
        <div className="bg-white shadow rounded-lg px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {webhook.statusCode ? (isSuccess ? (<lucide_react_1.CheckCircle className="h-8 w-8 text-green-400"/>) : (<lucide_react_1.XCircle className="h-8 w-8 text-red-400"/>)) : (<lucide_react_1.Clock className="h-8 w-8 text-gray-400"/>)}
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {webhook.method} Webhook
                </h1>
                <p className="text-sm text-gray-500">
                  {(0, date_fns_1.format)(new Date(webhook.createdAt), 'PPpp')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                <lucide_react_1.RefreshCw className={(0, clsx_1.default)('h-4 w-4 mr-2', resendMutation.isPending && 'animate-spin')}/>
                Resend
              </button>
              <button onClick={() => {
            if (confirm('Are you sure you want to delete this webhook?')) {
                deleteMutation.mutate();
            }
        }} className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50">
                <lucide_react_1.Trash2 className="h-4 w-4 mr-2"/>
                Delete
              </button>
            </div>
          </div>

          {/* Status Info */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {webhook.deliveredAt ? (webhook.statusCode ? `${webhook.statusCode} ${isSuccess ? 'OK' : 'Error'}` : 'Pending') : 'Not delivered'}
              </dd>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {webhook.duration ? `${webhook.duration}ms` : 'N/A'}
              </dd>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <dt className="text-sm font-medium text-gray-500">Delivered At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {webhook.deliveredAt ? (0, date_fns_1.format)(new Date(webhook.deliveredAt), 'PPpp') : 'Not delivered'}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Request</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">Headers</h3>
              <button onClick={() => copyToClipboard(JSON.stringify(webhook.headers, null, 2))} className="text-sm text-primary-600 hover:text-primary-500">
                <lucide_react_1.Copy className="h-4 w-4"/>
              </button>
            </div>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(webhook.headers, null, 2)}
            </pre>
          </div>

          {/* Query Parameters */}
          {webhook.query && Object.keys(webhook.query).length > 0 && (<div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Query Parameters</h3>
                <button onClick={() => copyToClipboard(JSON.stringify(webhook.query, null, 2))} className="text-sm text-primary-600 hover:text-primary-500">
                  <lucide_react_1.Copy className="h-4 w-4"/>
                </button>
              </div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(webhook.query, null, 2)}
              </pre>
            </div>)}

          {/* Body */}
          {webhook.body && (<div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Body</h3>
                <button onClick={() => copyToClipboard(typeof webhook.body === 'string'
                ? webhook.body
                : JSON.stringify(webhook.body, null, 2))} className="text-sm text-primary-600 hover:text-primary-500">
                  <lucide_react_1.Copy className="h-4 w-4"/>
                </button>
              </div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {typeof webhook.body === 'string'
                ? webhook.body
                : JSON.stringify(webhook.body, null, 2)}
              </pre>
            </div>)}
        </div>
      </div>

      {/* Response Details */}
      {webhook.deliveredAt && (<div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Response</h2>
          </div>
          <div className="p-6 space-y-4">
            {webhook.error ? (<div className="bg-red-50 p-4 rounded">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{webhook.error}</p>
              </div>) : webhook.response ? (<div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Response Body</h3>
                  <button onClick={() => copyToClipboard(typeof webhook.response === 'string'
                    ? webhook.response
                    : JSON.stringify(webhook.response, null, 2))} className="text-sm text-primary-600 hover:text-primary-500">
                    <lucide_react_1.Copy className="h-4 w-4"/>
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  {typeof webhook.response === 'string'
                    ? webhook.response
                    : JSON.stringify(webhook.response, null, 2)}
                </pre>
              </div>) : (<p className="text-sm text-gray-500">No response body</p>)}
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=WebhookDetail.js.map