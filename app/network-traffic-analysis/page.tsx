"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useRouter } from "next/navigation";

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

const PAGE_SIZE = 1000;

export default function NetworkTrafficAnalysisPage() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const router = useRouter();

  const refreshStatusAndAlerts = async () => {
    setLoading(true);
    try {
      const active = await invoke<boolean>("is_suricata_active");
      setIsActive(active);

      if (active) {
        await invoke("extract_and_handle_events");
      }
      const alertList = await invoke<AlertEvent[]>("read_alert_events");
      setAlerts(alertList);
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

  // Sort alerts by timestamp descending (most recent first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    // Fallback to "" if timestamp is missing
    return (b.timestamp || "").localeCompare(a.timestamp || "");
  });

  // Filter by severity if selected
  const filteredAlerts =
    severityFilter === null
      ? sortedAlerts
      : sortedAlerts.filter((alert) => alert.severity === severityFilter);

  // Pagination logic
  const totalPages = Math.ceil(filteredAlerts.length / PAGE_SIZE);
  const pagedAlerts = filteredAlerts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset to first page when filter changes or alerts change
  useEffect(() => {
    setPage(0);
  }, [severityFilter, alerts]);

  // Helper to format ISO timestamp to "YYYY-MM-DD HH:mm:ss"
  function formatTimestamp(ts?: string) {
    if (!ts) return "";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds())
    );
  }

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

        {/* Add navigation button here */}
        <div className="mb-6">
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => router.push("/network-report")}
          >
            📊 View Network Flow Report
          </button>
        </div>

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
          <div className="flex items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold">Alerts</h2>
            <label className="flex items-center gap-2">
              <span>Severity:</span>
              <select
                className="border rounded px-2 py-1"
                value={severityFilter === null ? "" : severityFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSeverityFilter(val === "" ? null : Number(val));
                }}
              >
                <option value="">All</option>
                <option value="1">1 (High)</option>
                <option value="2">2 (Medium)</option>
                <option value="3">3 (Low)</option>
              </select>
            </label>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : filteredAlerts.length === 0 ? (
            <p>No alerts found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 bg-[#f5f5f0] text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        No.
                      </th>
                      <th className="py-2 px-4 bg-[#f5f5f0] text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="py-2 px-4 bg-[#f5f5f0] text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="py-2 px-4 bg-[#f5f5f0] text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Destination
                      </th>
                      <th className="py-2 px-4 bg-[#f5f5f0] text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Signature
                      </th>
                      <th className="py-2 px-4 bg-[#f5f5f0] text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="py-2 px-4 bg-[#f5f5f0] text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Severity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAlerts.map((alert, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 px-4">{page * PAGE_SIZE + idx + 1}</td>
                        <td className="py-2 px-4">{formatTimestamp(alert.timestamp)}</td>
                        <td className="py-2 px-4">
                          {alert.src_ip}
                          {alert.src_port ? `:${alert.src_port}` : ""}
                        </td>
                        <td className="py-2 px-4">
                          {alert.dest_ip}
                          {alert.dest_port ? `:${alert.dest_port}` : ""}
                        </td>
                        <td className="py-2 px-4">{alert.signature}</td>
                        <td className="py-2 px-4">{alert.category}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            alert.severity === 1
                              ? "bg-red-100 text-red-800"
                              : alert.severity === 2
                              ? "bg-yellow-100 text-yellow-800"
                              : alert.severity === 3
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {alert.severity === 1
                              ? "High"
                              : alert.severity === 2
                              ? "Medium"
                              : alert.severity === 3
                              ? "Low"
                              : alert.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                  <button
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Prev Page
                  </button>
                  <span>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next Page
                  </button>
                </div>
              )}
            </>
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
