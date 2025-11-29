"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

enum Language {
  VI = "vi",
  EN = "en",
}

const AuthScreen = () => {
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState(Language.VI);
  const router = useRouter();

  const handleLogin = () => {
    if (username.trim()) {
      localStorage.setItem("user", JSON.stringify({ username, language }));
      router.push("/talk");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            className="mx-auto mb-4"
            src="/next.svg"
            alt="App logo"
            width={120}
            height={24}
            priority
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Language Learning
          </h1>
          <p className="text-gray-600">Practice languages with AI conversation</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="Enter your username"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Practice Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Select practice language"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value={Language.VI}>Vietnamese (Tiếng Việt)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={!username.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Start Learning
          </button>
        </div>

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            <h3 className="font-medium mb-2">Features:</h3>
            <ul className="text-left space-y-1">
              <li>• Voice conversation with AI</li>
              <li>• Real-time speech recognition</li>
              <li>• Multi-language support</li>
              <li>• Instant AI responses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;

