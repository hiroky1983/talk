"use client";

import { Language } from "@/types/types";
import React from "react";

interface User {
  username: string;
  language: Language;
}

interface Character {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

interface TalkHeaderProps {
  user: User | null;
  selectedLanguage: Language;
  selectedCharacter: string;
  isConnected: boolean;
  languageNames: Record<string, string>;
  characters: Character[];
  onLanguageChange: (language: Language) => void;
  onCharacterChange: (character: string) => void;
  onStartConversation: () => void;
  onLogout: () => void;
}

const TalkHeader = ({
  user,
  selectedLanguage,
  selectedCharacter,
  isConnected,
  languageNames,
  characters,
  onLanguageChange,
  onCharacterChange,
  onStartConversation,
  onLogout,
}: TalkHeaderProps) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              AI Language Practice
            </h1>
            <p className="text-gray-600">
              Practice with: {languageNames[selectedLanguage]}
            </p>
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Language:
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange(e.target.value as Language)}
                  title="Select practice language"
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(languageNames).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Character:
                </label>
                <select
                  value={selectedCharacter}
                  onChange={(e) => onCharacterChange(e.target.value)}
                  title="Select AI character"
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:outline-none"
                >
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.emoji} {character.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    isConnected
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {isConnected
                    ? `Connected to ${
                        characters.find((c) => c.id === selectedCharacter)?.name
                      }`
                    : "Disconnected"}
                </span>
              </div>
              {!isConnected && (
                <button
                  type="button"
                  onClick={onStartConversation}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Connect to AI
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TalkHeader;
