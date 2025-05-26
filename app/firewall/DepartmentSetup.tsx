import React from "react";

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
interface DepartmentSetupProps {
  form: any;
  setForm: any;
  departments: Department[];
  setDepartments: any;
  deviceInputs: { [deptId: string]: string };
  setDeviceInputs: any;
  addDepartment: () => void;
  deleteDepartment: (id: string) => void;
  addDevice: (deptId: string) => void;
  deleteDevice: (deptId: string, deviceName: string) => void;
}

const DepartmentSetup: React.FC<DepartmentSetupProps> = ({
  form,
  setForm,
  departments,
  setDepartments,
  deviceInputs,
  setDeviceInputs,
  addDepartment,
  deleteDepartment,
  addDevice,
  deleteDevice,
}) => {
  return (
    <div>
      {/* Add New Department */}
      <div className="bg-green-50 border border-green-200 rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-green-200 flex items-center space-x-2">
          <span className="text-green-600 text-2xl">+</span>
          <span className="text-green-900 font-semibold text-lg">
            Add New Department
          </span>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-bold">Department Name *</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-green-500"
                placeholder="Enter department name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="font-bold">Subnet *</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-green-500"
                placeholder="192.168.1.0/24"
                value={form.subnet}
                onChange={(e) => setForm({ ...form, subnet: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-bold">Protocol</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-green-500"
                value={form.protocol}
                onChange={(e) =>
                  setForm({
                    ...form,
                    protocol: e.target.value as
                      | "ALL"
                      | "TCP"
                      | "UDP"
                      | "ICMP",
                  })
                }
              >
                <option value="ALL">ALL</option>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="ICMP">ICMP</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="font-bold">Action</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-green-500"
                value={form.action}
                onChange={(e) =>
                  setForm({ ...form, action: e.target.value as "Allow" | "Block" })
                }
              >
                <option value="Allow">Allow</option>
                <option value="Block">Block</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-green-500"
              placeholder="Enter department description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <button
            onClick={addDepartment}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold flex items-center"
          >
            <span className="text-2xl mr-2">+</span>
            Add Department
          </button>
        </div>
      </div>

      {/* Department List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="border border-gray-200 rounded-lg shadow bg-white"
          >
            {/* Header */}
            <div className="bg-blue-50 rounded-t-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* You can use an icon here if you want */}
                {/* <svg className="w-5 h-5 text-blue-600" ... /> */}
                <span className="text-blue-900 font-semibold text-lg">
                  {dept.name}
                </span>
              </div>
              <button
                className="hover:bg-red-50 border border-transparent hover:border-red-200 rounded p-1"
                onClick={() => deleteDepartment(dept.id)}
                title="Delete Department"
              >
                <img
                  src="/delete.png"
                  alt="Delete"
                  style={{ width: 18, height: 18 }}
                />
              </button>
            </div>
            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Subnet:
                </span>
                <span className="text-sm text-gray-600 ml-2">
                  {dept.subnet}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Protocol:
                </span>
                <span className="text-sm text-gray-600 ml-2">
                  {dept.protocol}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Description:
                </span>
                <span className="text-sm text-gray-600 ml-2">
                  {dept.description || (
                    <span className="italic text-gray-400">No description</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Action:</span>
                <span
                  className={`inline-block ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    dept.action === "Allow"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {dept.action}
                </span>
              </div>
              {/* Devices */}
              <div>
                <span className="text-sm font-medium text-gray-700">Devices:</span>
                <div className="mt-2 space-y-2">
                  {dept.devices.map((device) => (
                    <div
                      key={device.name}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1"
                    >
                      <span className="text-gray-800">{device.name}</span>
                      <button
                        className="hover:bg-red-50 rounded p-1"
                        onClick={() => deleteDevice(dept.id, device.name)}
                        title="Delete Device"
                      >
                        <img
                          src="/delete.png"
                          alt="Delete"
                          style={{ width: 14, height: 14 }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Add device input */}
                <div className="flex mt-3">
                  <input
                    className="flex-1 border border-gray-300 rounded px-2 py-1 mr-2 text-sm"
                    placeholder="Add device"
                    value={deviceInputs[dept.id] || ""}
                    onChange={(e) =>
                      setDeviceInputs({ ...deviceInputs, [dept.id]: e.target.value })
                    }
                  />
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    onClick={() => addDevice(dept.id)}
                  >
                    + Add Device
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentSetup;