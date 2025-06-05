"use client";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FirewallRule {
  name: string;
  description: string;
  application_path: string | null;
  port: number | null;
  protocol: string;
  direction: string;
  action: string;
  enabled: boolean;
}

export default function DeviceManagement() {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<FirewallRule>({
    name: "",
    description: "",
    application_path: null,
    port: null,
    protocol: "TCP",
    direction: "Inbound",
    action: "Block",
    enabled: true,
  });

  // Fetch firewall rules on component mount
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const result = await invoke<FirewallRule[]>("get_firewall_rules");
      setRules(result);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch firewall rules:", err);
      setError(`Failed to fetch firewall rules: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const addRule = async () => {
    try {
      await invoke("add_firewall_rule", { ruleInfo: newRule });
      // Reset the form
      setNewRule({
        name: "",
        description: "",
        application_path: null,
        port: null,
        protocol: "TCP",
        direction: "Inbound",
        action: "Block",
        enabled: true,
      });
      // Refresh the rules list
      fetchRules();
    } catch (err) {
      console.error("Failed to add firewall rule:", err);
      setError(`Failed to add firewall rule: ${err}`);
    }
  };

  const removeRule = async (ruleName: string) => {
    try {
      await invoke("remove_firewall_rule", { ruleName });
      // Refresh the rules list
      fetchRules();
    } catch (err) {
      console.error(`Failed to remove rule ${ruleName}:`, err);
      setError(`Failed to remove rule ${ruleName}: ${err}`);
    }
  };
  
  const toggleRuleStatus = async (ruleName: string, enable: boolean) => {
    try {
      await invoke("enable_disable_rule", { ruleName, enable });
      // Refresh the rules list
      fetchRules();
    } catch (err) {
      console.error(`Failed to ${enable ? 'enable' : 'disable'} rule ${ruleName}:`, err);
      setError(`Failed to ${enable ? 'enable' : 'disable'} rule ${ruleName}: ${err}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#ffffff] overflow-hidden">
      {/* 50% white opacity overlay */}
      <div className="absolute inset-0 bg-white/50 pointer-events-none z-0" />
      {/* Optional: background image, if you want to keep it */}
      {/*
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat bg-fixed opacity-50"
        style={{
          backgroundImage: "url('/forest.jpg')",
          filter: "brightness(1.0) contrast(1.1)",
        }}
      />
      */}

      <div className="container mx-auto p-4 relative z-10 rounded-6xl">
      
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
      
      {/* Add new rule form */}
      <div className="bg-[#f5f5f0] shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Rule</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Rule Name
            </label>
            <input
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="Enter rule name"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description
            </label>
            <input
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newRule.description}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              placeholder="Enter description"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Application Path (optional)
            </label>
            <input
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newRule.application_path || ""}
              onChange={(e) => setNewRule({ ...newRule, application_path: e.target.value || null })}
              placeholder="Enter application path"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Port (optional)
            </label>
            <input
              type="number"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newRule.port || ""}
              onChange={(e) => setNewRule({ ...newRule, port: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Enter port number"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Protocol
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newRule.protocol}
              onChange={(e) => setNewRule({ ...newRule, protocol: e.target.value })}
            >
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP</option>
              <option value="Any">Any</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Direction
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newRule.direction}
              onChange={(e) => setNewRule({ ...newRule, direction: e.target.value })}
            >
              <option value="Inbound">Inbound</option>
              <option value="Outbound">Outbound</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Action
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newRule.action}
              onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
            >
              <option value="Allow">Allow</option>
              <option value="Block">Block</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={newRule.enabled}
                onChange={(e) => setNewRule({ ...newRule, enabled: e.target.checked })}
              />
              <span className="ml-2 text-gray-700">Enabled</span>
            </label>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={addRule}
            disabled={!newRule.name}
          >
            Add Rule
          </button>
        </div>
      </div>
      
      {/* Rules List */}
      <div className="bg-[#f5f5f0] shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-xl font-semibold mb-4">Firewall Rules</h2>
        
        {loading ? (
          <p>Loading rules...</p>
        ) : rules.length === 0 ? (
          <p>No firewall rules found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Protocol
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, index) => (
                  <tr key={`${rule.name}-${rule.protocol}-${rule.direction}-${index}`}>
                    <td className="py-2 px-4 border-b border-gray-200">{rule.name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{rule.description}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{rule.direction}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{rule.protocol}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        rule.action === "Allow" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        rule.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      <button
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        onClick={() => toggleRuleStatus(rule.name, !rule.enabled)}
                      >
                        {rule.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => removeRule(rule.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6">
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={fetchRules}
          >
            Refresh Rules
          </button>
        </div>
      </div>

      <img
        src="/fun.gif"
        alt="Fun animation"
        className="fixed bottom-4 right-4 w-24 h-24 z-50 rounded-lg shadow-lg"
      />
    </div>
    </div>
  );
}
