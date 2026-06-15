import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { PlusCircle, LogIn, Clock } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentRooms();
  }, []);

  const fetchRecentRooms = async () => {
    try {
      const response = await api.get('/rooms/recent');
      setRecentRooms(response.data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/rooms', { name: roomName });
      navigate(`/room/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    navigate(`/room/${joinRoomId.trim()}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Welcome back, {user?.name}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Create Room</h2>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <Input
                placeholder="E.g., Engineering Team Sync"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={loading || !roomName.trim()}>
                Create & Join
              </Button>
            </form>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Join Room</h2>
            </div>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <Input
                placeholder="Enter Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
              />
              <Button variant="secondary" type="submit" className="w-full" disabled={!joinRoomId.trim()}>
                Join Room
              </Button>
            </form>
          </Card>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Recent Rooms
          </h3>
          {recentRooms.length === 0 ? (
            <Card className="text-center py-8 text-gray-500">
              No recent rooms found. Create one to get started!
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentRooms.map(room => (
                <Card key={room.id} className="hover:border-blue-200 transition-colors cursor-pointer" onClick={() => navigate(`/room/${room.id}`)}>
                  <h4 className="font-medium text-gray-900 truncate">{room.name}</h4>
                  <p className="text-xs text-gray-500 mt-2">ID: {room.id}</p>
                  <div className="mt-4 flex justify-between items-center text-xs">
                    <span className={`px-2 py-1 rounded-full ${room.status === 'active' ? 'bg-green-100 text-green-700' : room.status === 'ended' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {room.status}
                    </span>
                    <span className="text-gray-400">
                      {new Date(room.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
