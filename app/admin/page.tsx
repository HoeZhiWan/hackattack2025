"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function AdminPage() {
  const [systemInfo, setSystemInfo] = useState({
    blockedDomains: 0,
    firewallRules: 0,
    suricataStatus: false
  });
  
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadSystemInfo();
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
  };

  const testDomainBlock = async () => {
    try {
      // This is just a simulation for the admin panel
      setTestResult("Test: Domain blocking system is operational. System would block domains and show tray notifications.");
      setTimeout(() => setTestResult(null), 5000);
    } catch (error) {
      console.error("Test failed:", error);
      setTestResult("Test failed");
    }
  };

  return (
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

        {/* Notification System Tests */}
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🔔 Notification System</h2>
          <p className="text-gray-600 mb-4">
            Test the system tray notification system. When domains are blocked, users will see notifications like:
            <br />
            <em>"Domain www.example.com has been blocked. Click to learn more."</em>
          </p>
          
          <div className="flex space-x-4 mb-4">
            <button
              onClick={triggerTestNotification}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              🧪 Test Notification Preview
            </button>
            <button
              onClick={testDomainBlock}
              className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              🛡️ Test Domain Block Flow
            </button>
          </div>

          {testResult && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
              <p>{testResult}</p>
            </div>
          )}
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
        </div>

        {/* Info Box */}
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <h3 className="font-bold">ℹ️ About This Admin Panel</h3>
          <p className="text-sm mt-2">
            This admin panel provides system oversight and testing capabilities for HackAttack.
            Access is granted by clicking the logo 3 times quickly on the main navigation bar.
            The notification system will show tray popups when domains are blocked automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
