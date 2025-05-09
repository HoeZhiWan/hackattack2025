"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function DomainBlockerPage() {
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="container mx-auto p-4">
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
    </div>
  );
}