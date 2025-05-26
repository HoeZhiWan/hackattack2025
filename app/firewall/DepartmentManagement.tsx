"use client";

import React, { useState } from "react";
import DepartmentSetup from "./DepartmentSetup";
import InterDepartment from "./InterDepartment";

interface Device {
  name: string;
}

interface Department {
  id: string;
  name: string;
  subnet: string;
  protocol: "ALL" | "TCP" | "UDP" | "ICMP";
  action: "Allow" | "Block";
  description: string;
  devices: Device[];
}

interface ConnectionRule {
  from: string;
  to: string;
  port: string;
  direction: "Both" | "Inbound" | "Outbound";
  action: "Allow" | "Block";
}

interface Props {
  deptTab: "setup" | "connections";
  setDeptTab: (tab: "setup" | "connections") => void;
}

export default function DepartmentManagement({ deptTab, setDeptTab }: Props) {
  // Form state
  const [form, setForm] = useState({
    name: "",
    subnet: "",
    protocol: "ALL" as "ALL" | "TCP" | "UDP" | "ICMP",
    action: "Allow" as "Allow" | "Block",
    description: "",
  });

  // Departments state
  const [departments, setDepartments] = useState<Department[]>(
    [
      {
        id: "1",
        name: "IT Department",
        subnet: "192.168.1.0/24",
        protocol: "TCP",
        action: "Allow",
        description: "Information Technology Department",
        devices: [
          { name: "Server-01" },
          { name: "Workstation-01" },
          { name: "Printer-IT" },
        ],
      },
      {
        id: "2",
        name: "BA Department",
        subnet: "192.168.2.0/24",
        protocol: "TCP",
        description: "Business Analyst Department",
        action: "Allow",
        devices: [
          { name: "Server-02" },
          { name: "Desktop-01" },
          { name: "Desktop-02" },],
      },
    ]
  );

  // Device input state (per department)
  const [deviceInputs, setDeviceInputs] = useState<{ [deptId: string]: string }>(
    {}
  );

  // Connection rules state
  const [connectionForm, setConnectionForm] = useState<ConnectionRule>({
    from: "",
    to: "",
    port: "",
    direction: "Both",
    action: "Allow",
  });
  const [connectionRules, setConnectionRules] = useState<ConnectionRule[]>([]);

  // Add department handler
  const addDepartment = () => {
    if (!form.name || !form.subnet) return;
    setDepartments([
      ...departments,
      {
        id: Date.now().toString(),
        name: form.name,
        subnet: form.subnet,
        protocol: form.protocol,
        action: form.action,
        description: form.description,
        devices: [],
      },
    ]);
    setForm({
      name: "",
      subnet: "",
      protocol: "ALL",
      action: "Allow",
      description: "",
    });
  };

  // Delete department handler
  const deleteDepartment = (id: string) => {
    setDepartments(departments.filter((d) => d.id !== id));
  };

  // Add device handler
  const addDevice = (deptId: string) => {
    const deviceName = deviceInputs[deptId]?.trim();
    if (!deviceName) return;
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId
          ? { ...dept, devices: [...dept.devices, { name: deviceName }] }
          : dept
      )
    );
    setDeviceInputs({ ...deviceInputs, [deptId]: "" });
  };

  // Delete device handler
  const deleteDevice = (deptId: string, deviceName: string) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId
          ? { ...dept, devices: dept.devices.filter((d) => d.name !== deviceName) }
          : dept
      )
    );
  };

  // Add connection rule handler
  const addConnectionRule = () => {
    if (
      !connectionForm.from ||
      !connectionForm.to ||
      !connectionForm.port ||
      isNaN(Number(connectionForm.port))
    ) {
      return; // <-- Add this!
    }
    setConnectionRules([...connectionRules, connectionForm]);
    setConnectionForm({
      from: "",
      to: "",
      port: "",
      direction: "Both",
      action: "Allow",
    });
  };

  // Remove connection rule handler
  const removeConnectionRule = (index: number) => {
    setConnectionRules(connectionRules.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex w-full mb-6 bg-[#ffefdf] rounded-xl p-2 justify-start">
        <button
          className={`px-6 py-2 mx-1 font-semibold text-[15px] rounded-lg transition shadow-sm
            ${deptTab === "setup"
              ? "bg-[#fffaf3] text-[#444] shadow"
              : "bg-transparent text-[#444] opacity-70 hover:opacity-100"}`}
          onClick={() => setDeptTab("setup")}
          style={{ transition: "background 0.2s" }}
        >
          Department Management
        </button>
        <button
          className={`px-6 py-2 mx-1 font-semibold text-[15px] rounded-lg transition shadow-sm
            ${deptTab === "connections"
              ? "bg-[#fffaf3] text-[#444] shadow"
              : "bg-transparent text-[#444] opacity-70 hover:opacity-100"}`}
          onClick={() => setDeptTab("connections")}
          style={{ transition: "background 0.2s" }}
        >
          Inter-Department Connections
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {deptTab === "setup" && (
          <DepartmentSetup
            form={form}
            setForm={setForm}
            departments={departments}
            setDepartments={setDepartments}
            deviceInputs={deviceInputs}
            setDeviceInputs={setDeviceInputs}
            addDepartment={addDepartment}
            deleteDepartment={deleteDepartment}
            addDevice={addDevice}
            deleteDevice={deleteDevice}
          />
        )}
        {deptTab === "connections" && (
          <InterDepartment
            departments={departments}
            connectionForm={connectionForm}
            setConnectionForm={setConnectionForm}
            connectionRules={connectionRules}
            addConnectionRule={addConnectionRule}
            removeConnectionRule={removeConnectionRule}
          />
        )}
      </div>
    </div>
  );
}
