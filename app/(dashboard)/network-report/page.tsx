"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type TopEntry = {
  name: string;
  frequency: number;
};

type FlowReport = {
  time_start: string;
  time_end: string;
  flow_count: number;
  top_sourceip: TopEntry[];
  top_destinationip: TopEntry[];
  top_sourceport: TopEntry[];
  top_destinationport: TopEntry[];
  protocol: TopEntry[];
};

export default function NetworkReportPage() {
  const [report, setReport] = useState<FlowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<FlowReport>("read_flow_report");
      setReport(result);
    } catch (err: any) {
      setError(typeof err === "string" ? err : "Failed to load report.");
    }
    setLoading(false);
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke("generate_flow_report");
      await invoke("extract_and_handle_events");
      await fetchReport();
    } catch (err: any) {
      setError(typeof err === "string" ? err : "Failed to generate report.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const boxStyle: React.CSSProperties = {
    borderRadius: 8,
    padding: "16px 20px",
    marginBottom: 24,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
  };

  // Big container style, similar to dashboard card
  const bigBoxStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15), 0 1.5px 6px 0 rgba(60,60,60,0.08)",
    maxWidth: 900,
    margin: "0 auto",
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
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }} className="relative z-10">
        {/* Title */}
        <h1 className="text-3xl font-bold mb-6">📊 Network Traffic Flow Report</h1>
        {/* Description in a white box */}
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: "24px 24px 16px 24px",
            marginBottom: 24,
            boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#333", marginBottom: 0, fontSize: "1.15rem" }}>
            A comprehensive summary of your network traffic flows, highlighting the most active IPs, ports, and protocols observed in your local area network.
          </p>
        </div>
        {/* Generate Report Button */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button
            onClick={handleGenerateReport}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded transition"
            disabled={loading}
          >
            {loading ? "Generating..." : "🔄 Generate New Report"}
          </button>
        </div>
        {/* Big box for all report content */}
        <div style={bigBoxStyle}>
          {loading && <div>Loading report...</div>}
          {error && <div style={{ color: "red" }}>{error}</div>}
          {report && (
            <div>
              <div style={boxStyle}>
                <strong>Date Range:</strong> {report.time_start} to {report.time_end}
                <br />
                <strong>Total Flows:</strong> {report.flow_count}
              </div>
              <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                <div style={{ ...boxStyle, flex: 1 }}>
                  <h3>Top Source IPs</h3>
                  <ol>
                    {report.top_sourceip.map((entry) => (
                      <li key={entry.name}>
                        {entry.name} <span style={{ color: "#bbb" }}>({entry.frequency})</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div style={{ ...boxStyle, flex: 1 }}>
                  <h3>Top Destination IPs</h3>
                  <ol>
                    {report.top_destinationip.map((entry) => (
                      <li key={entry.name}>
                        {entry.name} <span style={{ color: "#bbb" }}>({entry.frequency})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                <div style={{ ...boxStyle, flex: 1 }}>
                  <h3>Top Source Ports</h3>
                  <ol>
                    {report.top_sourceport.map((entry) => (
                      <li key={entry.name}>
                        {entry.name} <span style={{ color: "#bbb" }}>({entry.frequency})</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div style={{ ...boxStyle, flex: 1 }}>
                  <h3>Top Destination Ports</h3>
                  <ol>
                    {report.top_destinationport.map((entry) => (
                      <li key={entry.name}>
                        {entry.name} <span style={{ color: "#bbb" }}>({entry.frequency})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div style={boxStyle}>
                <h3>Protocol Usage</h3>
                <ul>
                  {report.protocol.map((entry) => (
                    <li key={entry.name}>
                      {entry.name}: <span style={{ color: "#bbb" }}>{entry.frequency}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}