"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketProvider = SocketProvider;
exports.useSocket = useSocket;
const react_1 = __importStar(require("react"));
const socket_io_client_1 = require("socket.io-client");
const auth_1 = require("@/store/auth");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const SocketContext = (0, react_1.createContext)(null);
function SocketProvider({ children }) {
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const isAuthenticated = (0, auth_1.useAuthStore)((state) => state.isAuthenticated);
    (0, react_1.useEffect)(() => {
        if (!isAuthenticated) {
            return;
        }
        const newSocket = (0, socket_io_client_1.io)(import.meta.env.VITE_WS_URL || '', {
            transports: ['websocket'],
            auth: {
                token: auth_1.useAuthStore.getState().token,
            },
        });
        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Socket connected');
        });
        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Socket disconnected');
        });
        newSocket.on('webhook:event', (event) => {
            switch (event.type) {
                case 'webhook:received':
                    react_hot_toast_1.default.success('New webhook received!');
                    break;
                case 'webhook:delivered':
                    if (!event.data.success) {
                        react_hot_toast_1.default.error('Webhook delivery failed');
                    }
                    break;
                case 'webhook:failed':
                    react_hot_toast_1.default.error('Webhook delivery failed');
                    break;
            }
        });
        setSocket(newSocket);
        return () => {
            newSocket.close();
        };
    }, [isAuthenticated]);
    const subscribeToEndpoint = (endpointId) => {
        if (socket) {
            socket.emit('subscribe:endpoint', endpointId);
        }
    };
    const unsubscribeFromEndpoint = (endpointId) => {
        if (socket) {
            socket.emit('unsubscribe:endpoint', endpointId);
        }
    };
    return (<SocketContext.Provider value={{
            socket,
            isConnected,
            subscribeToEndpoint,
            unsubscribeFromEndpoint,
        }}>
      {children}
    </SocketContext.Provider>);
}
function useSocket() {
    const context = (0, react_1.useContext)(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
}
//# sourceMappingURL=SocketContext.js.map