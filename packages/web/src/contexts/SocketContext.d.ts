import React from 'react';
import { Socket } from 'socket.io-client';
interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    subscribeToEndpoint: (endpointId: string) => void;
    unsubscribeFromEndpoint: (endpointId: string) => void;
}
export declare function SocketProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useSocket(): SocketContextValue;
export {};
//# sourceMappingURL=SocketContext.d.ts.map