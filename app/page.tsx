"use client";

import Link from "next/link";

export default function Page() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Abang Malaysia HackAttack</h1>
      <p className="mb-4">Welcome to the HackAttack security toolkit.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <div className="border rounded-lg p-6 shadow-md bg-white hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-3">Firewall Management</h2>
          <p className="text-gray-600 mb-4">Create and manage firewall rules to control inbound and outbound network traffic.</p>
          <Link href="/firewall" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block">
            Manage Firewall
          </Link>
        </div>
        
        {/* Additional feature cards can be added here in the future */}
      </div>
    </div>
  );
}