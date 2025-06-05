"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function DomainBlockerPage() {
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoBlockingEnabled, setAutoBlockingEnabled] = useState(false);

  // Fetch blocked domains on component mount
  useEffect(() => {
    fetchBlockedDomains();
  }, []);

  const fetchBlockedDomains = async () => {
    setLoading(true);
    try {
      const domains = await invoke<string[]>("get_blocked_domains");
      setBlockedDomains(domains);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch blocked domains:", err);
      setError(`Failed to fetch blocked domains: ${err}`);
    } finally {
      setLoading(false);
    }
  };
  const addBlockedDomain = async () => {
    if (!newDomain.trim()) return;
    
    try {
      await invoke("block_domain", { domain: newDomain });
      
      // Show notification for successful domain blocking
      await invoke("show_domain_blocked_notification", { 
        domain: newDomain 
      });
      
      // Clear the input
      setNewDomain("");
      // Refresh the list
      fetchBlockedDomains();
    } catch (err) {
      console.error("Failed to block domain:", err);
      setError(`Failed to block domain: ${err}`);
    }
  };

  const removeDomain = async (domain: string) => {
    try {
      await invoke("unblock_domain", { domain });
      // Refresh the list
      fetchBlockedDomains();
    } catch (err) {
      console.error(`Failed to unblock domain ${domain}:`, err);
      setError(`Failed to unblock domain ${domain}: ${err}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addBlockedDomain();
    }
  };
  const toggleAutoBlocking = () => {
    setAutoBlockingEnabled(!autoBlockingEnabled);
    // This is a demo toggle - no actual AI functionality is implemented yet
    console.log(`Auto-blocking demo ${!autoBlockingEnabled ? 'enabled' : 'disabled'} - UI only`);
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
    <h1 className="text-3xl font-bold mb-6">Domain Blocker</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="underline ml-2" 
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Add new domain form */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-semibold mb-4">Block a Domain</h2>
        <div className="flex items-center">
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-4"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter domain to block (e.g., example.com)"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={addBlockedDomain}
            disabled={!newDomain.trim()}
          >
            Block Domain
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Note: Blocking a domain prevents your computer from connecting to it.
        </p>
      </div>        {/* AI Auto-blocking Toggle */}
      <div className="bg-white shadow-md rounded-lg px-6 py-4 mb-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">AI-Powered Auto Blocking</h2>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                🧪 Function Not Implemented
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`text-xs font-medium ${autoBlockingEnabled ? 'text-green-600' : 'text-gray-500'}`}>
              {autoBlockingEnabled ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <button
              onClick={toggleAutoBlocking}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoBlockingEnabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoBlockingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>        </div>
        
        {autoBlockingEnabled && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            <strong>Demo Active:</strong> AI monitoring simulation enabled 
          </div>
        )}
      </div>
      
      {/* Blocked Domains List */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-xl font-semibold mb-4">Blocked Domains</h2>
        
        {loading ? (
          <p>Loading domains...</p>
        ) : blockedDomains.length === 0 ? (
          <p>No domains are currently blocked.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {blockedDomains.map((domain, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <span className="text-lg">{domain}</span>
                <button
                  className="text-red-600 hover:text-red-900"
                  onClick={() => removeDomain(domain)}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
        
        <div className="mt-6">
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={fetchBlockedDomains}
          >
            Refresh List
          </button>
        </div>
      </div>

      <img
        src="/fun.gif"
        alt="Fun animation"
        className="fixed bottom-4 right-4 w-24 h-24 z-50 rounded-lg shadow-lg"
      />
    </div>
    </div >
  );
}