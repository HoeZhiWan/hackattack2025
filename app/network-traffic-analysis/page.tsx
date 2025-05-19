"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

type AlertEvent = {
  timestamp: string;
  src_ip?: string;
  dest_ip?: string;
  src_port?: number;
  dest_port?: number;
  signature?: string;
  category?: string;
  severity?: number;
};

export default function NetworkTrafficAnalysisPage() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatusAndAlerts = async () => {
    setLoading(true);
    try {
      const active = await invoke<boolean>("is_suricata_active");
      setIsActive(active);

      if (active) {
        const alertList = await invoke<AlertEvent[]>("read_alert_events_from_eve");
        setAlerts(alertList);
      } else {
        setAlerts([]);
      }
      setError(null);
    } catch (err) {
      setError(`Failed to fetch status or alerts: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatusAndAlerts();
  }, []);

  const handleRun = async () => {
    setLoading(true);
    try {
      await invoke("run_suricata");
      setTimeout(refreshStatusAndAlerts, 1000);
    } catch (err) {
      setError(`Failed to start Suricata: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKill = async () => {
    setLoading(true);
    try {
      await invoke("kill_suricata");
      setTimeout(refreshStatusAndAlerts, 1000);
    } catch (err) {
      setError(`Failed to kill Suricata: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FEDCC1] overflow-hidden">
      {/* Background image, fixed and full screen */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat bg-fixed opacity-50"
        style={{
          backgroundImage: "url('/forest.jpg')",
          filter: "brightness(1.0) contrast(1.1)",
        }}
      />

      {/* Main content container */}
      <div className="container mx-auto p-4 relative z-10">
        <h1 className="text-3xl font-bold mb-6">Network Traffic Analysis</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <button className="underline ml-2" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6 flex items-center gap-4">
          <span>
            Suricata status:{" "}
            <span className={isActive ? "text-green-600" : "text-red-600"}>
              {isActive === null ? "Checking..." : isActive ? "Active" : "Inactive"}
            </span>
          </span>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleRun}
            disabled={isActive || loading}
          >
            Run Suricata
          </button>
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleKill}
            disabled={!isActive || loading}
          >
            Kill Suricata
          </button>
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            onClick={refreshStatusAndAlerts}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
          <h2 className="text-xl font-semibold mb-4">Alerts</h2>
          {loading ? (
            <p>Loading...</p>
          ) : !isActive ? (
            <p>Suricata is not running.</p>
          ) : alerts.length === 0 ? (
            <p>No alerts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border">Time</th>
                    <th className="px-2 py-1 border">Source</th>
                    <th className="px-2 py-1 border">Destination</th>
                    <th className="px-2 py-1 border">Signature</th>
                    <th className="px-2 py-1 border">Category</th>
                    <th className="px-2 py-1 border">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1 border">{alert.timestamp}</td>
                      <td className="px-2 py-1 border">
                        {alert.src_ip}
                        {alert.src_port ? `:${alert.src_port}` : ""}
                      </td>
                      <td className="px-2 py-1 border">
                        {alert.dest_ip}
                        {alert.dest_port ? `:${alert.dest_port}` : ""}
                      </td>
                      <td className="px-2 py-1 border">{alert.signature}</td>
                      <td className="px-2 py-1 border">{alert.category}</td>
                      <td className="px-2 py-1 border">{alert.severity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <img
        src="/fun.gif"
        alt="Fun animation"
        className="fixed bottom-4 right-4 w-24 h-24 z-50 rounded-lg shadow-lg"
      />
    </div>
  );
}
