"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import SecurityDashboardCard from "./SecurityDashboardCard";
import NetworkIntrusionCard from "./NetworkIntrusionCard";
import RecentActivityItem from "./RecentActivityItem";
import Button from "../ui/Button";

const incidentTrendData = [
  { month: "Jan", incidents: 45 },
  { month: "Feb", incidents: 38 },
  { month: "Mar", incidents: 52 },
  { month: "Apr", incidents: 40 },
  { month: "May", incidents: 60 },
  { month: "Jun", incidents: 48 },
  { month: "Jul", incidents: 55 },
  { month: "Aug", incidents: 42 },
  { month: "Sep", incidents: 50 },
  { month: "Oct", incidents: 65 },
  { month: "Nov", incidents: 58 },
  { month: "Dec", incidents: 62 },
];

const threatSeverityData = [
  { name: "Low", value: 320, color: "#4CAF50" },
  { name: "Medium", value: 180, color: "#FFB300" },
  { name: "High", value: 130, color: "#F44336" },
  { name: "Critical", value: 70, color: "#B71C1C" },
];


const SecurityDashboard = () => {
  const [isPassive, setIsPassive] = useState(true);
  const [isHoveringReport, setIsHoveringReport] = useState(false);

  const toggleStatus = () => {
    setIsPassive((prev) => !prev);
  };

  return (
    <div className="pt-0">
      <div className="relative z-10 max-w-6xl mx-auto p-6 font-sans text-gray-900 bg-gradient-to-br from-white/80 via-[#FFF3E0]/70 to-white/80 backdrop-blur-xl rounded-2xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6">Security Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex flex-1 gap-6 w-full">
            <NetworkIntrusionCard
              title="Detection Status"
              value="Active"
              icon="!"
              infoColor="#b43c3c"
            />
            <NetworkIntrusionCard
              title="Critical Alerts"
              value="2"
              info="+ 2 detected"
              icon="!"
              infoColor="#217f2b"
            />
          </div>

          <Button
            color={isPassive ? "#777" : "#4CAF50"}
            style={{ height: 40, fontWeight: "600", minWidth: 140 }}
            onClick={toggleStatus}
          >
            {isPassive ? "Set Passive" : "Set Active"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
          {/* Incident Trends Over Year - Line Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-6 tracking-wide text-gray-800">
              Incident Trends Over the Year
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={incidentTrendData}
                margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
              >
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="4 4" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#666", fontWeight: 600 }}
                  axisLine={{ stroke: "#bbb" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#666", fontWeight: 600 }}
                  axisLine={{ stroke: "#bbb" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: "#8884d8" }}
                  labelStyle={{ fontWeight: "bold" }}
                  formatter={(value) => [`${value}`, "Incidents"]}
                />
                <Line
                  type="monotone"
                  dataKey="incidents"
                  stroke="#8884d8"
                  strokeWidth={3}
                  dot={{ r: 6, strokeWidth: 3, fill: "#fff", stroke: "#8884d8" }}
                  activeDot={{ r: 8, strokeWidth: 3, fill: "#8884d8" }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Threat Severity Distribution - Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-6 tracking-wide text-gray-800">
              Threat Severity Distribution (Annual)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={threatSeverityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={5}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(1)}%)`
                  }
                  labelLine={false}
                  stroke="#fff"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={800}
                >
                  {threatSeverityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  iconSize={14}
                  wrapperStyle={{ fontWeight: 600, color: "#555" }}
                />
                <Tooltip
                  formatter={(value) => [`${value} incidents`, "Count"]}
                  contentStyle={{ borderRadius: 8, borderColor: "#ccc" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>



        <h3 className="text-2xl font-semibold mb-4">Recent Activity</h3>

        <div className="bg-white border rounded-xl shadow-md p-0 max-h-[400px] flex flex-col overflow-hidden">
          {/* Scrollable area */}
          <div
            className="overflow-y-auto px-6 pt-6"
            style={{ maxHeight: "280px" }}
          >
            <RecentActivityItem time="2 min" ip="192.168.1.105" description="Blocked suspicious connection attempt" />
            <RecentActivityItem time="15 min" ip="192.168.1.105" description="Multiple failed login attempts detected" />
            <RecentActivityItem time="24 min" ip="192.168.1.105" description="New device connected to network" />
            <RecentActivityItem time="26 min" ip="System" description="Firewall rules updated successfully" />
            <RecentActivityItem time="42 min" ip="192.168.1.105" description="Malicious URL access attempt blocked" />
          </div>          {/* Fixed bottom content */}
          <div className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur-md px-6 py-5 rounded-b-xl shadow-inner">
            <div className="text-center text-blue-600 font-semibold text-base hover:text-blue-800  transition duration-200 mb-4 cursor-pointer">
              View All Activity
            </div>

            <div 
              className="relative"
              onMouseEnter={() => setIsHoveringReport(true)}
              onMouseLeave={() => setIsHoveringReport(false)}
            >
              <Button
                color={isHoveringReport ? "#999" : "#6c63ff"}
                style={{
                  width: "100%",
                  fontWeight: 600,
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  padding: "12px 0",
                  borderRadius: "0.75rem",
                  transition: "all 0.2s ease-in-out",
                  cursor: isHoveringReport ? "not-allowed" : "pointer",
                  opacity: isHoveringReport ? 0.7 : 1,
                }}
              >
                Generate Full Report
              </Button>
              
              {/* Coming Soon Tooltip */}
              {isHoveringReport && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10 opacity-0 animate-[fadeIn_0.2s_ease-in-out_forwards]">
                  Feature coming soon
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
