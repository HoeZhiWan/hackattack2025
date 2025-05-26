"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Modal from "../components/Modal";
import { useNotification } from "../components/NotificationProvider";
import { 
  createPopupAlert, 
  showSecurityAlert, 
  showDomainBlockedAlert, 
  showIntrusionAlert,
  showFirewallAlert,
  AlertType
} from "../utils/popup-alerts";

export default function AdminPage() {
  const [systemInfo, setSystemInfo] = useState({
    blockedDomains: 0,
    firewallRules: 0,
    suricataStatus: false
  });
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customType, setCustomType] = useState<AlertType>('info');
  const [notificationSettings, setNotificationSettings] = useState({
    domain_blocked_delay_seconds: 2,
    cooldown_seconds: 30,
    enabled: true
  });
  const [settingsChanged, setSettingsChanged] = useState(false);
  const { showNotification } = useNotification();
  useEffect(() => {
    loadSystemInfo();
    loadNotificationSettings();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const [domains, rules, suricataActive] = await Promise.all([
        invoke<string[]>("get_blocked_domains"),
        invoke<any[]>("get_firewall_rules"),
        invoke<boolean>("is_suricata_active")
      ]);
      
      setSystemInfo({
        blockedDomains: domains.length,
        firewallRules: rules.length,
        suricataStatus: suricataActive
      });
    } catch (error) {
      console.error("Failed to load system info:", error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await invoke<any>("get_notification_settings");
      setNotificationSettings(settings);
      setSettingsChanged(false);
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      await invoke("set_notification_settings", { newSettings: notificationSettings });
      setSettingsChanged(false);
      showNotification({
        title: '✅ Settings Saved',
        message: 'Notification settings have been updated successfully.',
        type: 'success'
      });
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      showNotification({
        title: '❌ Save Failed',
        message: 'Failed to save notification settings.',
        type: 'error'
      });
    }
  };

  const updateNotificationSetting = (key: string, value: any) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSettingsChanged(true);
  };
  const triggerTestNotification = async () => {
    try {
      // Call the actual notification command
      await invoke("show_domain_blocked_notification", { 
        domain: "www.example.com" 
      });
      setTestResult("✅ Test notification sent! Check your system tray for the notification.");
      setTimeout(() => setTestResult(null), 5000);
    } catch (error) {
      console.error("Failed to trigger test notification:", error);
      setTestResult("❌ Failed to trigger test notification: " + error);
      setTimeout(() => setTestResult(null), 5000);
    }
  };  const testDomainBlock = async () => {
    try {
      // This is just a simulation for the admin panel
      setTestResult("Test: Domain blocking system is operational. System would block domains and show tray notifications.");
      
      // Also show a Tauri popup alert for demonstration
      await showDomainBlockedAlert('test-malicious-site.com');
      
      setTimeout(() => setTestResult(null), 5000);
    } catch (error) {
      console.error("Test failed:", error);
      setTestResult("Test failed");
    }
  };

  const testStyledPopups = () => {
    // Test different notification types
    showNotification({
      title: '🛡️ Admin Test',
      message: 'This is a styled notification popup! Much better than system tray notifications.',
      type: 'info',
      actions: [
        {
          label: 'Open Modal',
          onClick: () => setIsModalOpen(true),
          style: 'primary'
        },
        {
          label: 'Try Warning',
          onClick: () => showNotification({
            title: '⚠️ Security Warning',
            message: 'Suspicious activity detected in admin panel.',
            type: 'warning'
          }),
          style: 'secondary'
        }
      ]
    });
  };

  const testSuccessNotification = () => {
    showNotification({
      title: '✅ Domain Blocked',
      message: 'www.malicious-site.com has been successfully blocked.',
      type: 'success',
      actions: [
        {
          label: 'View Details',
          onClick: () => setIsModalOpen(true),
          style: 'primary'
        }
      ]
    });
  };
  const testErrorNotification = () => {
    showNotification({
      title: '❌ Security Alert',
      message: 'Failed to block domain. Please check your permissions.',
      type: 'error',
      actions: [
        {
          label: 'Retry',
          onClick: () => testSuccessNotification(),
          style: 'primary'
        },
        {
          label: 'Report Issue',
          onClick: () => setIsModalOpen(true),
          style: 'secondary'
        }
      ]
    });
  };

  // Tauri Popup Alert Functions
  const testTauriSecurityAlert = async () => {
    await showSecurityAlert('Suspicious network activity detected on port 443. Connection has been terminated.');
    setTestResult("✅ Tauri security alert window created!");
    setTimeout(() => setTestResult(null), 3000);
  };

  const testTauriDomainAlert = async () => {
    await showDomainBlockedAlert('malicious-admin-test.com');
    setTestResult("✅ Tauri domain blocked alert window created!");
    setTimeout(() => setTestResult(null), 3000);
  };

  const testTauriIntrusionAlert = async () => {
    await showIntrusionAlert('Multiple failed admin login attempts from IP 192.168.1.100\n\nThis may indicate a brute force attack.');
    setTestResult("✅ Tauri intrusion alert window created!");
    setTimeout(() => setTestResult(null), 3000);
  };

  const testTauriFirewallAlert = async () => {
    await showFirewallAlert('blocked incoming connection', 'TCP port 22 from 203.0.113.42 (Admin Panel Access Attempt)');
    setTestResult("✅ Tauri firewall alert window created!");
    setTimeout(() => setTestResult(null), 3000);
  };
  const testCustomTauriAlert = async () => {
    if (!customTitle.trim() || !customMessage.trim()) {
      showNotification({
        title: 'Error',
        message: 'Please fill in both title and message for the custom alert',
        type: 'error'
      });
      return;
    }

    await createPopupAlert({
      title: customTitle,
      message: customMessage,
      type: customType
    });
    
    setTestResult("✅ Custom Tauri alert window created!");
    setTimeout(() => setTestResult(null), 3000);
  };
  return (
    <>
      <style jsx>{`
        .slider-blue::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider-green::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider-blue::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider-green::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
      <div className="relative min-h-screen bg-[#FEDCC1] overflow-hidden">
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat bg-fixed opacity-50"
        style={{
          backgroundImage: "url('/forest.jpg')",
          filter: "brightness(1.0) contrast(1.1)",
        }}
      />

      <div className="container mx-auto p-4 relative z-10">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium">⚡ Admin Panel</h3>
              <p className="text-sm">This is a restricted admin area. Unauthorized access is prohibited.</p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-gray-800">🛡️ HackAttack Admin Panel</h1>
        
        {/* System Overview */}
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📊 System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Blocked Domains</h3>
              <p className="text-2xl font-bold text-blue-600">{systemInfo.blockedDomains}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Firewall Rules</h3>
              <p className="text-2xl font-bold text-green-600">{systemInfo.firewallRules}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Suricata Status</h3>
              <p className="text-2xl font-bold text-purple-600">
                {systemInfo.suricataStatus ? "🟢 Active" : "🔴 Inactive"}
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">⚙️ Notification Settings</h2>
          <p className="text-gray-600 mb-6">
            Configure how and when domain blocking notifications are sent to users.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Controls */}
            <div className="space-y-6">
              {/* Enable/Disable Notifications */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.enabled}
                    onChange={(e) => updateNotificationSetting('enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div>
                    <span className="text-lg font-semibold text-gray-800">
                      🔔 Enable Domain Block Notifications
                    </span>
                    <p className="text-sm text-gray-600">
                      Show notifications when domains are blocked
                    </p>
                  </div>
                </label>
              </div>

              {/* Notification Delay */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-gray-800 font-semibold mb-2">
                  ⏱️ Notification Delay: {notificationSettings.domain_blocked_delay_seconds} seconds
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={notificationSettings.domain_blocked_delay_seconds}
                  onChange={(e) => updateNotificationSetting('domain_blocked_delay_seconds', parseFloat(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-blue"
                />
                <div className="flex justify-between text-xs text-blue-600 mt-1">
                  <span>Instant</span>
                  <span>5s</span>
                  <span>10s</span>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  How long to wait before showing the notification after a domain is blocked
                </p>
              </div>

              {/* Cooldown Period */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <label className="block text-gray-800 font-semibold mb-2">
                  🕒 Cooldown Period: {notificationSettings.cooldown_seconds} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={notificationSettings.cooldown_seconds}
                  onChange={(e) => updateNotificationSetting('cooldown_seconds', parseInt(e.target.value))}
                  className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-green"
                />
                <div className="flex justify-between text-xs text-green-600 mt-1">
                  <span>5s</span>
                  <span>2.5min</span>
                  <span>5min</span>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Minimum time between notifications to prevent spam
                </p>
              </div>

              {/* Precise Input Fields */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-3">🎯 Precise Values</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">
                      Delay (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={notificationSettings.domain_blocked_delay_seconds}
                      onChange={(e) => updateNotificationSetting('domain_blocked_delay_seconds', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">
                      Cooldown (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={notificationSettings.cooldown_seconds}
                      onChange={(e) => updateNotificationSetting('cooldown_seconds', parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Preview and Actions */}
            <div className="space-y-6">
              {/* Current Settings Display */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-4">📋 Current Configuration</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      notificationSettings.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {notificationSettings.enabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700">Notification Delay:</span>
                    <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {notificationSettings.domain_blocked_delay_seconds}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700">Cooldown Period:</span>
                    <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                      {notificationSettings.cooldown_seconds}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Save/Reset Actions */}
              <div className="space-y-3">
                <button
                  onClick={saveNotificationSettings}
                  disabled={!settingsChanged}
                  className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
                    settingsChanged
                      ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {settingsChanged ? '💾 Save Settings' : '✅ Settings Saved'}
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={loadNotificationSettings}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    🔄 Reset
                  </button>
                  <button
                    onClick={triggerTestNotification}
                    disabled={!notificationSettings.enabled}
                    className={`font-medium py-2 px-4 rounded transition-colors ${
                      notificationSettings.enabled
                        ? 'bg-purple-500 hover:bg-purple-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    🧪 Test
                  </button>
                </div>
              </div>

              {/* Settings Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h5 className="font-semibold text-gray-800 mb-2">ℹ️ How It Works:</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>Delay:</strong> Time to wait before showing notification</li>
                  <li>• <strong>Cooldown:</strong> Prevents notification spam</li>
                  <li>• <strong>Settings persist:</strong> Automatically saved to backend</li>
                  <li>• <strong>Real-time:</strong> Changes apply immediately</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Settings Changed Indicator */}
          {settingsChanged && (
            <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">⚠️ You have unsaved changes. Click "Save Settings" to apply them.</span>
            </div>
          )}
        </div>

        {/* Notification System Tests */}
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🔔 Notification System</h2>
          <p className="text-gray-600 mb-4">
            Test both the system tray notifications and the new styled popup system.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">System Tray Notifications</h3>
              <p className="text-sm text-gray-600 mb-3">Traditional system notifications that appear in the tray area.</p>
              <div className="space-y-2">
                <button
                  onClick={triggerTestNotification}
                  className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  🧪 Test Tray Notification
                </button>
                <button
                  onClick={testDomainBlock}
                  className="w-full bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  🛡️ Test Domain Block Flow
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">✨ Styled Popup System</h3>
              <p className="text-sm text-purple-600 mb-3">Beautiful, customizable popups with animations and actions.</p>
              <div className="space-y-2">
                <button
                  onClick={testStyledPopups}
                  className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  🎨 Test Styled Popups
                </button>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={testSuccessNotification}
                    className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded"
                  >
                    Success
                  </button>
                  <button
                    onClick={() => showNotification({
                      title: '⚠️ Warning',
                      message: 'This is a warning notification.',
                      type: 'warning'
                    })}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs py-1 px-2 rounded"
                  >
                    Warning
                  </button>
                  <button
                    onClick={testErrorNotification}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
                  >
                    Error
                  </button>
                </div>
              </div>
            </div>
          </div>          {testResult && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
              <p>{testResult}</p>
            </div>
          )}
        </div>

        {/* Tauri Popup Alert System */}
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🖥️ Tauri Popup Windows</h2>
          <p className="text-gray-600 mb-4">
            Test native OS popup windows that appear outside the main app window. These are ideal for critical security alerts.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Pre-built Security Alerts */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-800 mb-3">🚨 Security Alert Popups</h3>
              <div className="space-y-2">
                <button
                  onClick={testTauriSecurityAlert}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-3 rounded text-sm"
                >
                  ⚠️ Network Security Alert
                </button>
                <button
                  onClick={testTauriDomainAlert}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded text-sm"
                >
                  🚫 Domain Blocked Alert
                </button>
                <button
                  onClick={testTauriIntrusionAlert}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded text-sm"
                >
                  🚨 Intrusion Detection Alert
                </button>
                <button
                  onClick={testTauriFirewallAlert}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded text-sm"
                >
                  🛡️ Firewall Action Alert
                </button>
              </div>
            </div>

            {/* Custom Alert Creator */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-3">🎨 Custom Popup Creator</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Alert title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Alert message..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <div className="flex space-x-2">
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as AlertType)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="info">ℹ️ Info</option>
                    <option value="success">✅ Success</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="error">❌ Error</option>
                    <option value="blocked">🚫 Blocked</option>
                  </select>
                  <button
                    onClick={testCustomTauriAlert}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md text-sm transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">🔧 Tauri Popup Features:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <h5 className="font-semibold text-blue-800 mb-1">Window Properties:</h5>
                <ul className="space-y-1">
                  <li>• Always on top</li>
                  <li>• Centered on screen</li>
                  <li>• Resizable (350-600px)</li>
                  <li>• Native OS window</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-green-800 mb-1">Use Cases:</h5>
                <ul className="space-y-1">
                  <li>• Critical security alerts</li>
                  <li>• Domain blocking notifications</li>
                  <li>• System intrusion warnings</li>
                  <li>• Emergency notifications</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-purple-800 mb-1">Advantages:</h5>
                <ul className="space-y-1">
                  <li>• Persist when app minimized</li>
                  <li>• Multiple windows supported</li>
                  <li>• Platform native appearance</li>
                  <li>• Cannot be ignored</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">⚙️ Admin Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={loadSystemInfo}
              className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline"
            >
              🔄 Refresh System Info
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline"
            >
              🏠 Return to Dashboard
            </button>
          </div>
        </div>        {/* Info Box */}
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <h3 className="font-bold">ℹ️ About This Admin Panel</h3>
          <p className="text-sm mt-2">
            This admin panel provides system oversight and testing capabilities for HackAttack.
            Access is granted by clicking the logo 3 times quickly on the main navigation bar.
            The notification system will show tray popups when domains are blocked automatically.
          </p>
        </div>
      </div>

      {/* Styled Modal Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="🛡️ Security Alert Details"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ Threat Detected</h3>
            <p className="text-red-700">
              A potentially malicious domain has been detected and blocked by the security system.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Domain Details:</h4>
            <ul className="space-y-1 text-sm">
              <li><strong>Domain:</strong> www.malicious-site.com</li>
              <li><strong>Threat Level:</strong> High</li>
              <li><strong>Category:</strong> Malware Distribution</li>
              <li><strong>Blocked At:</strong> {new Date().toLocaleString()}</li>
              <li><strong>Source IP:</strong> 192.168.1.100</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">✅ Actions Taken:</h4>
            <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
              <li>Domain added to block list</li>
              <li>DNS requests redirected</li>
              <li>User notification sent</li>
              <li>Security log updated</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                showNotification({
                  title: '📋 Report Generated',
                  message: 'Security report has been saved to logs.',
                  type: 'success'
                });
                setIsModalOpen(false);
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Generate Report
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>      </Modal>
      </div>
    </>
  );
}
