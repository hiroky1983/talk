'use client';

import { useState } from 'react';
import ChatRoom from '../../components/ChatRoom';

export default function ChatPage() {
  const [isJoined, setIsJoined] = useState(false);
  const [roomId, setRoomId] = useState('general');
  const [username, setUsername] = useState('');
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);

  const joinChat = () => {
    if (username.trim()) {
      setIsJoined(true);
    }
  };

  const leaveChat = () => {
    setIsJoined(false);
    setUsername('');
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Join Chat Room</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter room ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
                onKeyPress={(e) => e.key === 'Enter' && joinChat()}
              />
            </div>
            
            <button
              onClick={joinChat}
              disabled={!username.trim() || !roomId.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
            >
              Join Chat
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-600">
            <h3 className="font-medium mb-2">Features:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Real-time messaging with gRPC streaming</li>
              <li>Multiple chat rooms support</li>
              <li>User join/leave notifications</li>
              <li>Auto-scroll to latest messages</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mb-4">
        <button
          onClick={leaveChat}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Leave Chat
        </button>
      </div>
      <div className="h-[calc(100vh-8rem)]">
        <ChatRoom
          roomId={roomId}
          userId={userId}
          username={username}
        />
      </div>
    </div>
  );
}