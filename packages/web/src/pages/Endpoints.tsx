import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Webhook, Copy, ExternalLink, MoreVertical, Trash2, RefreshCw, Power } from 'lucide-react';
import { Menu } from '@headlessui/react';
import { api } from '@/lib/api';
import { EndpointWithStats, CreateEndpointDto } from '@webhook-proxy/shared';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { CreateEndpointModal } from '@/components/CreateEndpointModal';

export function Endpoints() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['endpoints'],
    queryFn: async () => {
      const response = await api.get('/api/endpoints');
      return response.data.data.items as EndpointWithStats[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/endpoints/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      toast.success('Endpoint deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.put(`/api/endpoints/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      toast.success('Endpoint updated');
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/endpoints/${id}/regenerate-key`);
      return response.data.data.apiKey;
    },
    onSuccess: (apiKey) => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      copyToClipboard(apiKey);
      toast.success('New API key generated and copied');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getWebhookUrl = (slug: string) => {
    return `${window.location.origin}/webhook/${slug}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Endpoints</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your webhook endpoints and their configurations
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Endpoint
          </button>
        </div>
      </div>

      {data && data.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {data.map((endpoint) => (
              <li key={endpoint.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Link
                          to={`/endpoints/${endpoint.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-500"
                        >
                          {endpoint.name}
                        </Link>
                        <span
                          className={clsx(
                            'ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                            endpoint.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {endpoint.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex sm:space-x-6">
                          <p className="flex items-center text-sm text-gray-500">
                            <ExternalLink className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {endpoint.targetUrl}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <Webhook className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {endpoint.webhookCount} webhooks
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          {endpoint.lastWebhookAt ? (
                            <p>
                              Last webhook {formatDistanceToNow(new Date(endpoint.lastWebhookAt), { addSuffix: true })}
                            </p>
                          ) : (
                            <p>No webhooks received</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="flex items-center">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {getWebhookUrl(endpoint.slug)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(getWebhookUrl(endpoint.slug))}
                            className="ml-2 text-gray-400 hover:text-gray-500"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="rounded-full flex items-center text-gray-400 hover:text-gray-600">
                          <MoreVertical className="h-5 w-5" />
                        </Menu.Button>
                        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => toggleMutation.mutate({
                                    id: endpoint.id,
                                    isActive: !endpoint.isActive,
                                  })}
                                  className={clsx(
                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                    'group flex items-center px-4 py-2 text-sm w-full'
                                  )}
                                >
                                  <Power className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                                  {endpoint.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => regenerateKeyMutation.mutate(endpoint.id)}
                                  className={clsx(
                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                    'group flex items-center px-4 py-2 text-sm w-full'
                                  )}
                                >
                                  <RefreshCw className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                                  Regenerate API Key
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this endpoint?')) {
                                      deleteMutation.mutate(endpoint.id);
                                    }
                                  }}
                                  className={clsx(
                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                    'group flex items-center px-4 py-2 text-sm w-full'
                                  )}
                                >
                                  <Trash2 className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-500" />
                                  Delete
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Menu>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Webhook className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No endpoints</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new endpoint
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Endpoint
            </button>
          </div>
        </div>
      )}

      <CreateEndpointModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}