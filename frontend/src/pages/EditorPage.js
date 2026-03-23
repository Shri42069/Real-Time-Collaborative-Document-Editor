import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';
import Editor from '../components/Editor/Editor';

export default function EditorPage() {
  const { id }                      = useParams();
  const { accessToken, loading }    = useAuth();
  const navigate                    = useNavigate();
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    // Wait until auth has finished restoring from cookie
    if (loading) return;

    if (!accessToken) {
      navigate('/login');
      return;
    }

    // accessToken is guaranteed set here — AuthContext already called
    // setAuthHeader() synchronously before setting the token in state,
    // so axios is ready for any HTTP requests too.
    const socket = connectSocket(accessToken);

    if (socket.connected) {
      setSocketReady(true);
    } else {
      socket.once('connect', () => setSocketReady(true));
      // If connection fails entirely, show error after timeout
      socket.once('connect_error', () => setSocketReady(false));
    }

    return () => {
      disconnectSocket();
      setSocketReady(false);
    };
  }, [accessToken, loading, navigate]);

  if (loading || !socketReady) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: 14, color: '#999',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {loading ? 'Loading…' : 'Connecting…'}
      </div>
    );
  }

  return <Editor documentId={id} />;
}