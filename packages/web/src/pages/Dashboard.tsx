import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Webhook, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { EndpointWithStats, Webhook as WebhookType } from '@ersinkoc/webhook-proxy-shared';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const { data: endpoints } = useQuery({
    queryKey: ['endpoints'],
    queryFn: async () => {
      const response = await api.get('/api/endpoints');
      return response.data.data.items as EndpointWithStats[];
    },
  });

  const { data: recentWebhooks } = useQuery({
    queryKey: ['recent-webhooks'],
    queryFn: async () => {
      const response = await api.get('/api/webhooks?pageSize=10');
      return response.data.data.items as WebhookType[];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const stats = {
    totalEndpoints: endpoints?.length || 0,
    activeEndpoints: endpoints?.filter(e => e.isActive).length || 0,
    totalWebhooks: endpoints?.reduce((sum, e) => sum + e.webhookCount, 0) || 0,
    recentWebhooks: recentWebhooks?.length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your webhook endpoints and recent activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Webhook className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Endpoints
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalEndpoints}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Endpoints
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeEndpoints}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Webhooks
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalWebhooks}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Recent Activity
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.recentWebhooks}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Webhooks */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Webhooks
          </h3>
        </div>
        <div className="overflow-hidden">
          {recentWebhooks && recentWebhooks.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentWebhooks.map((webhook) => {
                const endpoint = endpoints?.find(e => e.id === webhook.endpointId);
                const isSuccess = webhook.statusCode && webhook.statusCode >= 200 && webhook.statusCode < 400;
                
                return (
                  <li key={webhook.id}>
                    <Link
                      to={`/webhooks/${webhook.id}`}
                      className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {webhook.statusCode ? (
                              isSuccess ? (
                                <CheckCircle className="h-5 w-5 text-green-400" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-400" />
                              )
                            ) : (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {webhook.method} - {endpoint?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true })}
                              {webhook.statusCode && ` • ${webhook.statusCode}`}
                            </div>
                          </div>
                        </div>
                        <div>
                          <ArrowRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-12">
              <Webhook className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new endpoint
              </p>
              <div className="mt-6">
                <Link
                  to="/endpoints"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Create Endpoint
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Endpoints */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Active Endpoints
          </h3>
        </div>
        <div className="overflow-hidden">
          {endpoints && endpoints.filter(e => e.isActive).length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {endpoints.filter(e => e.isActive).map((endpoint) => (
                <li key={endpoint.id}>
                  <Link
                    to={`/endpoints/${endpoint.id}`}
                    className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {endpoint.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {endpoint.targetUrl}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {endpoint.webhookCount} webhooks
                          {endpoint.lastWebhookAt && ` • Last: ${formatDistanceToNow(new Date(endpoint.lastWebhookAt), { addSuffix: true })}`}
                        </p>
                      </div>
                      <div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No active endpoints</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}