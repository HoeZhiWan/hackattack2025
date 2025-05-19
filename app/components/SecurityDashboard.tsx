"use client";

import React, { useState } from "react";
import SecurityDashboardCard from "./SecurityDashboardCard";
import NetworkIntrusionCard from "./NetworkIntrusionCard";
import RecentActivityItem from "./RecentActivityItem";
import Button from "./Button";

const SecurityDashboard = () => {
  const [isPassive, setIsPassive] = useState(true);

  const toggleStatus = () => {
    setIsPassive((prev) => !prev);
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        maxWidth: 1025,
        margin: "20px auto",
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        color: "#111",
        padding: 20,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        opacity: 1,
      }}
    >
      <h2 style={{ marginBottom: 24, color: "#222" }}>Security Dashboard</h2>

      <div
        style={{
          display: "flex",
          gap: 18,
          marginBottom: 32,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <SecurityDashboardCard
          title="Protected Devices"
          value="24"
          info="+ 2 new today"
          bgColor="#c0e8dd"
          iconBgColor="#e89b9b"
          icon="!"
          infoColor="green"
        />
        <SecurityDashboardCard
          title="Blocked Attacks"
          value="1632"
          info="+ 165 today"
          bgColor="#b6dfb3"
          iconBgColor="#3f8f75"
          icon="✓"
          infoColor="green"
          infoIcon="📄"
        />
        <SecurityDashboardCard
          title="Monitored Domains"
          value="155"
          info="+ 5 today"
          bgColor="#fff1a8"
          iconBgColor="#c5a830"
          icon="✪"
          infoColor="#a78a00"
        />
        <SecurityDashboardCard
          title="Active Threats"
          value="3"
          info="↓ 2 less than yesterday"
          bgColor="#f1b4b9"
          iconBgColor="#b35563"
          icon="!"
          infoColor="red"
          infoIcon="📄"
        />
      </div>

      <h3 style={{ color: "#222", marginBottom: 14 }}>Network Intrusion Detection</h3>
      <div
        style={{
          display: "flex",
          gap: 22,
          marginBottom: 28,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <NetworkIntrusionCard title="Detection Status" value="Active" icon="!" infoColor="#b43c3c" />
        <NetworkIntrusionCard title="Critical Alerts" value="2" info="+ 2 detected" icon="!" infoColor="#217f2b" />
        <Button
          color={isPassive ? "#777" : "#4CAF50"}
          style={{
            height: 36,
            marginLeft: "auto",
            fontWeight: "600",
            transition: "background-color 0.3s ease",
          }}
          onClick={toggleStatus}
        >
          {isPassive ? "Set Passive" : "Set Active"}
        </Button>
      </div>

      <h3 style={{ color: "#000", marginBottom: 16 }}>Recent Activity</h3>
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 10,
          boxShadow: "0 3px 8px rgba(0, 0, 0, 0.12)",
          padding: 24,
          maxHeight: 340,
          overflowY: "auto",
          color: "#000",
        }}
      >
        <RecentActivityItem time="2 min" ip="192.168.1.105" description="Blocked suspicious connection attempt" />
        <RecentActivityItem time="15 min" ip="192.168.1.105" description="Multiple failed login attempts detected" />
        <RecentActivityItem time="24 min" ip="192.168.1.105" description="New device connected to network" />
        <RecentActivityItem time="26 min" ip="System" description="Firewall rules updated successfully" />
        <RecentActivityItem time="42 min" ip="192.168.1.105" description="Malicious URL access attempt blocked" />

        <div
          style={{
            textAlign: "center",
            marginTop: 22,
            fontSize: 15,
            fontWeight: "600",
            color: "#000",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          View All Activity
        </div>

        <Button color="#6c63ff" style={{ marginTop: 24, width: "100%", fontWeight: "700" }}>
          Generate Full Report
        </Button>
      </div>
    </div>
  );
};

export default SecurityDashboard;
