'use client';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

type TrayState = 'Active' | 'Passive' | 'Disabled';

interface TrayStatusProps {
  className?: string;
}

export default function TrayStatus({ className = '' }: TrayStatusProps) {
  const [isTrayActive, setIsTrayActive] = useState<boolean>(false);
  const [trayState, setTrayState] = useState<TrayState>('Disabled');
  const [loading, setLoading] = useState<boolean>(true);
  const [customTooltip, setCustomTooltip] = useState<string>('');

  // Check tray status on component mount
  useEffect(() => {
    checkTrayStatus();
    getTrayState();
    
    // Set up interval to check tray status periodically
    const interval = setInterval(() => {
      checkTrayStatus();
      getTrayState();
    }, 5000);    // Listen for tray state changes from the backend
    const unlistenTrayState = listen('tray-state-changed', (event) => {
      const newState = event.payload as TrayState;
      console.log('📡 Received tray state change event:', newState);
      setTrayState(newState);
      console.log('✅ Updated frontend tray state to:', newState);
    });
    
    return () => {
      clearInterval(interval);
      unlistenTrayState.then(unlisten => unlisten());
    };
  }, []);

  const checkTrayStatus = async () => {
    try {
      const status = await invoke<boolean>('check_tray_status');
      setIsTrayActive(status);
      setLoading(false);
    } catch (error) {
      console.error('Failed to check tray status:', error);
      setIsTrayActive(false);
      setLoading(false);
    }
  };

  const getTrayState = async () => {
    try {
      const state = await invoke<TrayState>('get_tray_status');
      setTrayState(state);
    } catch (error) {
      console.error('Failed to get tray state:', error);
    }
  };
  const toggleTrayState = async () => {
    console.log('🔄 Toggle tray state requested from frontend');
    try {
      const newState = await invoke<TrayState>('toggle_tray_status');
      console.log('✅ Toggle successful, new state:', newState);
      setTrayState(newState);
      
      // Show success feedback
      const event = new CustomEvent('show-notification', {
        detail: {
          type: 'success',
          title: 'Tray Status Changed',
          message: `Tray is now ${newState.toLowerCase()}`
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('❌ Failed to toggle tray state:', error);
      // Show error feedback
      const event = new CustomEvent('show-notification', {
        detail: {
          type: 'error',
          title: 'Toggle Failed',
          message: 'Failed to toggle tray status'
        }
      });
      window.dispatchEvent(event);
    }
  };

  const setSpecificTrayState = async (state: TrayState) => {
    try {
      await invoke('set_tray_status', { state });
      setTrayState(state);
      
      // Show success feedback
      const event = new CustomEvent('show-notification', {
        detail: {
          type: 'success',
          title: 'Tray Status Set',
          message: `Tray is now ${state.toLowerCase()}`
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to set tray state:', error);
      // Show error feedback
      const event = new CustomEvent('show-notification', {
        detail: {
          type: 'error',
          title: 'Status Change Failed',
          message: 'Failed to change tray status'
        }
      });
      window.dispatchEvent(event);
    }
  };
  const updateTrayTooltip = async () => {
    if (!customTooltip.trim()) return;
    
    try {
      await invoke('set_tray_tooltip', { message: customTooltip });
      setCustomTooltip('');
      // Show success feedback
      const event = new CustomEvent('show-notification', {
        detail: {
          type: 'success',
          title: 'Tray Updated',
          message: 'Tray tooltip has been updated successfully!'
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to update tray tooltip:', error);
      // Show error feedback
      const event = new CustomEvent('show-notification', {
        detail: {
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update tray tooltip'
        }
      });
      window.dispatchEvent(event);
    }
  };

  const setStatusTooltip = async (status: string) => {
    const messages = {      monitoring: '🟢 Security Smile - Actively Monitoring',
      idle: '🟡 Security Smile - Idle',
      alert: '🔴 Security Smile - Security Alert Active',
      scanning: '🔍 Security Smile - Scanning Network'
    };

    try {
      await invoke('set_tray_tooltip', { 
        message: messages[status as keyof typeof messages] || '🛡️ Security Smile Security Monitor'
      });
    } catch (error) {
      console.error('Failed to update tray status:', error);
    }
  };

  const getStateColor = (state: TrayState) => {
    switch (state) {
      case 'Active': return 'bg-green-500';
      case 'Passive': return 'bg-yellow-500';
      case 'Disabled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStateIcon = (state: TrayState) => {
    switch (state) {
      case 'Active': return '🟢';
      case 'Passive': return '🟡';
      case 'Disabled': return '🔴';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 dark:bg-gray-700 h-4 w-32 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tray Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStateColor(trayState)} ${trayState === 'Active' ? 'animate-pulse' : ''}`}></div>
          <span className="text-sm font-medium">
            System Tray: {getStateIcon(trayState)} {trayState}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={checkTrayStatus}
            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={toggleTrayState}
            disabled={trayState === 'Disabled'}
            className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Toggle
          </button>
        </div>
      </div>

      {/* Tray State Controls */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tray State Controls:</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSpecificTrayState('Active')}
            disabled={trayState === 'Active'}
            className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🟢 Set Active
          </button>
          <button
            onClick={() => setSpecificTrayState('Passive')}
            disabled={trayState === 'Passive'}
            className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🟡 Set Passive
          </button>
        </div>
      </div>      {/* Tray Controls (only show if tray is active) */}
      {isTrayActive && (
        <>
          {/* Quick Status Updates */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Status Updates:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusTooltip('monitoring')}
                className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              >
                🟢 Monitoring
              </button>
              <button
                onClick={() => setStatusTooltip('idle')}
                className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
              >
                🟡 Idle
              </button>
              <button
                onClick={() => setStatusTooltip('alert')}
                className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                🔴 Alert
              </button>
              <button
                onClick={() => setStatusTooltip('scanning')}
                className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                🔍 Scanning
              </button>
            </div>
          </div>

          {/* Custom Tooltip */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Custom Tooltip:</h4>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customTooltip}
                onChange={(e) => setCustomTooltip(e.target.value)}
                placeholder="Enter custom tooltip message..."
                className="flex-1 text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && updateTrayTooltip()}
              />
              <button
                onClick={updateTrayTooltip}
                disabled={!customTooltip.trim()}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Update
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>💡 <strong>Current State:</strong> {getStateIcon(trayState)} {trayState}</p>
            <p><strong>Active:</strong> Full monitoring and alert capabilities</p>
            <p><strong>Passive:</strong> Limited monitoring, reduced notifications</p>
            <div className="mt-2 space-y-1">
              <p>• Left-click the tray icon to show/hide the app</p>
              <p>• Double-click to always show the app</p>
              <p>• Right-click for the context menu with state toggle</p>
              <p>• Closing the window will minimize to tray instead of quitting</p>
            </div>
          </div>
        </>
      )}

      {/* Tray Inactive Message */}
      {!isTrayActive && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>System tray is not active. Restart the application to enable tray functionality.</span>
          </div>
        </div>
      )}
    </div>
  );
}
