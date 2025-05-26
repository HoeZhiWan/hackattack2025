import React from "react";

interface Department {
  id: string;
  name: string;
}
interface ConnectionRule {
  from: string;
  to: string;
  port: string;
  direction: "Both" | "Inbound" | "Outbound";
  action: "Allow" | "Block";
}

interface InterDepartmentProps {
  departments: Department[];
  connectionForm: ConnectionRule;
  setConnectionForm: any;
  connectionRules: ConnectionRule[];
  addConnectionRule: () => void;
  removeConnectionRule: (index: number) => void;
}

const InterDepartment: React.FC<InterDepartmentProps> = ({
  departments,
  connectionForm,
  setConnectionForm,
  connectionRules,
  addConnectionRule,
  removeConnectionRule,
}) => {
  // You can add logic here if needed

  return (
    <div>
      {/* Add Inter-Department Connection Rule */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-purple-200 flex items-center space-x-2">
          <span className="text-purple-600 text-2xl">+</span>
          <span className="text-purple-900 font-semibold text-lg">
            Add Inter-Department Connection Rule
          </span>
        </div>
        <div className="p-6 space-y-4">
          {/* First row: From & To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-bold">From Departments</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-purple-500"
                value={connectionForm.from}
                onChange={(e) =>
                  setConnectionForm({ ...connectionForm, from: e.target.value })
                }
              >
                <option value="" className="text-gray-500">
                  Select department
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="font-bold">To Departments</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-purple-500"
                value={connectionForm.to}
                onChange={(e) =>
                  setConnectionForm({ ...connectionForm, to: e.target.value })
                }
              >
                <option value="" className="text-gray-500">
                  Select department
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Second row: Port, Direction, Action */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="font-bold">Port</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-purple-500"
                value={connectionForm.port}
                onChange={(e) =>
                  setConnectionForm({ ...connectionForm, port: e.target.value })
                }
                placeholder="Port"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <label className="font-bold">Direction</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-purple-500"
                value={connectionForm.direction}
                onChange={(e) =>
                  setConnectionForm({
                    ...connectionForm,
                    direction: e.target.value as "Both" | "Inbound" | "Outbound",
                  })
                }
              >
                <option value="Both">Both</option>
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="font-bold">Action</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-purple-500"
                value={connectionForm.action}
                onChange={(e) =>
                  setConnectionForm({
                    ...connectionForm,
                    action: e.target.value as "Allow" | "Block",
                  })
                }
              >
                <option value="Allow">Allow</option>
                <option value="Block">Block</option>
              </select>
            </div>
          </div>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold flex items-center"
            onClick={addConnectionRule}
          >
            <span className="text-2xl mr-2">+</span>
            Add Connection Rule
          </button>
        </div>
      </div>

      {/* Inter-Department Connection Rules List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          Inter-Department Connection Rules
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-semibold">FROM</th>
                <th className="px-4 py-2 text-left font-semibold">TO</th>
                <th className="px-4 py-2 text-left font-semibold">PORT</th>
                <th className="px-4 py-2 text-left font-semibold">DIRECTION</th>
                <th className="px-4 py-2 text-left font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {connectionRules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-400">
                    No inter-department connection rules configured
                  </td>
                </tr>
              ) : (
                connectionRules.map((rule, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{rule.from}</td>
                    <td className="px-4 py-2">{rule.to}</td>
                    <td className="px-4 py-2">{rule.port}</td>
                    <td className="px-4 py-2">{rule.direction}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          rule.action === "Allow"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {rule.action}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InterDepartment;