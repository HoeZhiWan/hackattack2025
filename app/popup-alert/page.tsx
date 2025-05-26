'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface AlertData {
  title: string;
  message: string;
  type: string;
}

export default function PopupAlert() {
  const searchParams = useSearchParams();
  const [alertData, setAlertData] = useState<AlertData>({
    title: '',
    message: '',
    type: 'info'
  });

  useEffect(() => {
    const title = searchParams.get('title') || 'Alert';
    const message = searchParams.get('message') || 'No message provided';
    const type = searchParams.get('type') || 'info';

    setAlertData({ title, message, type });
  }, [searchParams]);

  const closeWindow = () => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      (window as any).__TAURI__.window.getCurrent().close();
    }
  };

  const getAlertIcon = () => {
    switch (alertData.type) {
      case 'error':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'blocked':
        return '🚫';
      default:
        return 'ℹ️';
    }
  };

  const getAlertColor = () => {
    switch (alertData.type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'blocked':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getButtonColor = () => {
    switch (alertData.type) {
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'blocked':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className={`rounded-xl border-2 p-6 shadow-xl backdrop-blur-sm ${getAlertColor()}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl animate-pulse">{getAlertIcon()}</span>
              <h2 className="text-xl font-bold">{alertData.title}</h2>
            </div>
            <button
              onClick={closeWindow}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-all"
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {alertData.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={closeWindow}
              className={`flex-1 px-4 py-3 text-white rounded-lg font-semibold transition-all transform hover:scale-105 ${getButtonColor()}`}
            >
              OK
            </button>
            {alertData.type === 'blocked' && (
              <button
                onClick={() => {
                  // You can add additional actions here
                  // For example, opening the domain blocker settings
                  closeWindow();
                }}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Settings
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 bg-white/70 rounded-full px-3 py-1 inline-block">
            🛡️ HackAttack Security Alert
          </p>
        </div>
      </div>
    </div>
  );
}
