import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Copy, RefreshCw, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Webhook } from '@ersinkoc/webhook-proxy-shared';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export function WebhookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: webhook, refetch } = useQuery({
    queryKey: ['webhook', id],
    queryFn: async () => {
      const response = await api.get(`/api/webhooks/${id}`);
      return response.data.data as Webhook;
    },
    enabled: !!id,
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/webhooks/${id}/resend`);
      return response.data.data;
    },
    onSuccess: () => {
      refetch();
      toast.success('Webhook resent successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/webhooks/${id}`);
    },
    onSuccess: () => {
      toast.success('Webhook deleted');
      navigate(-1);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!webhook) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isSuccess = webhook.statusCode && webhook.statusCode >= 200 && webhook.statusCode < 400;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <div className="bg-white shadow rounded-lg px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {webhook.statusCode ? (
                  isSuccess ? (
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-400" />
                  )
                ) : (
                  <Clock className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {webhook.method} Webhook
                </h1>
                <p className="text-sm text-gray-500">
                  {format(new Date(webhook.createdAt), 'PPpp')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={clsx(
                  'h-4 w-4 mr-2',
                  resendMutation.isPending && 'animate-spin'
                )} />
                Resend
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this webhook?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>

          {/* Status Info */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {webhook.deliveredAt ? (
                  webhook.statusCode ? `${webhook.statusCode} ${isSuccess ? 'OK' : 'Error'}` : 'Pending'
                ) : 'Not delivered'}
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
                {webhook.deliveredAt ? format(new Date(webhook.deliveredAt), 'PPpp') : 'Not delivered'}
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
              <button
                onClick={() => copyToClipboard(JSON.stringify(webhook.headers, null, 2))}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(webhook.headers, null, 2)}
            </pre>
          </div>

          {/* Query Parameters */}
          {webhook.query && Object.keys(webhook.query).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Query Parameters</h3>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(webhook.query, null, 2))}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(webhook.query, null, 2)}
              </pre>
            </div>
          )}

          {/* Body */}
          {webhook.body && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Body</h3>
                <button
                  onClick={() => copyToClipboard(
                    typeof webhook.body === 'string' 
                      ? webhook.body 
                      : JSON.stringify(webhook.body, null, 2)
                  )}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {typeof webhook.body === 'string' 
                  ? webhook.body 
                  : JSON.stringify(webhook.body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Response Details */}
      {webhook.deliveredAt && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Response</h2>
          </div>
          <div className="p-6 space-y-4">
            {webhook.error ? (
              <div className="bg-red-50 p-4 rounded">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{webhook.error}</p>
              </div>
            ) : webhook.response ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Response Body</h3>
                  <button
                    onClick={() => copyToClipboard(
                      typeof webhook.response === 'string' 
                        ? webhook.response 
                        : JSON.stringify(webhook.response, null, 2)
                    )}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  {typeof webhook.response === 'string' 
                    ? webhook.response 
                    : JSON.stringify(webhook.response, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No response body</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}