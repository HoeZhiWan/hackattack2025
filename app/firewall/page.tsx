"use client";

import { useState } from "react";
import DeviceManagement from "./DeviceManagement";
import DepartmentManagement from "./DepartmentManagement";
console.log("DeviceManagement:", DeviceManagement);
console.log("DepartmentManagement:", DepartmentManagement);

export default function FirewallPage() {
  const [mainTab, setMainTab] = useState<"device" | "department">("device");
  const [deptTab, setDeptTab] = useState<"setup" | "connections">("setup");

  return (
    <div className="min-h-screen bg-[#FEDCC1] relative">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat bg-fixed opacity-50"
        style={{
          backgroundImage: "url('/forest.jpg')",
          filter: "brightness(1.0) contrast(1.1)",
        }}
      />

      <div className="container mx-auto p-6 relative z-10">
        {/* Page Title */}
        <h1 className="text-3xl font-bold mb-2">Firewall Management</h1>
        <p className="mb-6 text-gray-700">
          Configure and manage network security policies for devices and departments
        </p>

        {/* Firewall Configuration Section */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          {/* Section Header */}
          <div className="flex items-center bg-orange-600 text-white rounded-t-lg px-6 py-4">
            {/* Optional: Add an icon here */}
            <span className="material-icons mr-2">security</span>
            <span className="text-xl font-semibold">Firewall Configuration</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-orange-200 bg-orange-50">
            <button
              className={`flex-1 py-3 text-center font-medium transition ${
                mainTab === "device"
                  ? "border-b-2 border-orange-500 text-orange-700 bg-white"
                  : "text-gray-500 hover:text-orange-700"
              }`}
              onClick={() => setMainTab("device")}
            >
              Device Management
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium transition ${
                mainTab === "department"
                  ? "border-b-2 border-orange-500 text-orange-700 bg-white"
                  : "text-gray-500 hover:text-orange-700"
              }`}
              onClick={() => {
                setMainTab("department");
                setDeptTab("setup");
              }}
            >
              Department Management
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {mainTab === "device" && <DeviceManagement />}
            {mainTab === "department" && (
              <DepartmentManagement deptTab={deptTab} setDeptTab={setDeptTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/*"use client";

import { useState } from "react";
import DeviceManagement from "./DeviceManagement";
import DepartmentManagement from "./DepartmentManagement";

export default function FirewallPage() {
  const [tab, setTab] = useState<"device" | "department">("device");

  return (
    <div className="min-h-screen bg-[#FEDCC1] p-6">
      <div className="mb-4 flex space-x-4">
        <button
          onClick={() => setTab("device")}
          className={`px-4 py-2 rounded ${
            tab === "device" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border"
          }`}
        >
          Device Management
        </button>
        <button
          onClick={() => setTab("department")}
          className={`px-4 py-2 rounded ${
            tab === "department" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border"
          }`}
        >
          Department Management
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow-md">
        {tab === "device" ? <DeviceManagement /> : <DepartmentManagement />}
      </div>
    </div>
  );
}*/


