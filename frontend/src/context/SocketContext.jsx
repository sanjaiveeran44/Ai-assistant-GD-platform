import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Only connect if user is logged in
    if (user) {
      const newSocket = io('http://localhost:5000', {
        withCredentials: true,
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else if (socket) {
      // Disconnect if user logs out
      socket.disconnect();
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
