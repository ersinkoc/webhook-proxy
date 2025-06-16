"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEndpointModal = CreateEndpointModal;
const react_1 = require("react");
const react_2 = require("@headlessui/react");
const lucide_react_1 = require("lucide-react");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
function CreateEndpointModal({ isOpen, onClose }) {
    const [name, setName] = (0, react_1.useState)('');
    const [targetUrl, setTargetUrl] = (0, react_1.useState)('');
    const queryClient = (0, react_query_1.useQueryClient)();
    const createMutation = (0, react_query_1.useMutation)({
        mutationFn: async (data) => {
            const response = await api_1.api.post('/api/endpoints', data);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['endpoints'] });
            react_hot_toast_1.default.success('Endpoint created successfully');
            onClose();
            setName('');
            setTargetUrl('');
        },
        onError: (error) => {
            react_hot_toast_1.default.error(error.response?.data?.message || 'Failed to create endpoint');
        },
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !targetUrl.trim()) {
            react_hot_toast_1.default.error('Please fill in all fields');
            return;
        }
        try {
            new URL(targetUrl);
        }
        catch {
            react_hot_toast_1.default.error('Please enter a valid URL');
            return;
        }
        createMutation.mutate({ name, targetUrl });
    };
    return (<react_2.Transition.Root show={isOpen} as={react_1.Fragment}>
      <react_2.Dialog as="div" className="relative z-10" onClose={onClose}>
        <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"/>
        </react_2.Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <react_2.Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button type="button" className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2" onClick={onClose}>
                    <lucide_react_1.X className="h-6 w-6"/>
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <react_2.Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Create New Endpoint
                    </react_2.Dialog.Title>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="My Webhook Endpoint"/>
                      </div>
                      <div>
                        <label htmlFor="targetUrl" className="block text-sm font-medium text-gray-700">
                          Target URL
                        </label>
                        <input type="url" id="targetUrl" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="http://localhost:3000/webhook"/>
                        <p className="mt-1 text-xs text-gray-500">
                          The URL where webhooks will be forwarded
                        </p>
                      </div>
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button type="submit" disabled={createMutation.isPending} className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:ml-3 sm:w-auto disabled:opacity-50">
                          {createMutation.isPending ? 'Creating...' : 'Create Endpoint'}
                        </button>
                        <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onClick={onClose}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </react_2.Dialog.Panel>
            </react_2.Transition.Child>
          </div>
        </div>
      </react_2.Dialog>
    </react_2.Transition.Root>);
}
//# sourceMappingURL=CreateEndpointModal.js.map