"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ChatAssistant from "./components/ChatAssistant";
import SecurityDashboard from "./components/SecurityDashboard";
import { CheckCircle } from "lucide-react";

export default function Page() {
  const [showAssistant, setShowAssistant] = useState(false);
  const pathname = usePathname();

  // Auto-close chat on route change
  useEffect(() => {
    setShowAssistant(false);
  }, [pathname]);

  return (
    <div className="relative min-h-screen bg-[#FEDCC1] overflow-x-auto">
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat bg-fixed opacity-40"
        style={{
          backgroundImage: "url('/forest.jpg')",
          filter: "brightness(1.0) contrast(1.05)",
        }}
      />

      {/* Card container */}
      <div className="max-w-6xl mx-auto mt-14 px-6 md:px-12 py-10 rounded-3xl bg-white/30 backdrop-blur-2xl shadow-2xl ring-1 ring-white/20 relative z-10 flex flex-col md:flex-row gap-10 items-center border border-white/20">
        {/* Profile Icon in corner */}
        <div className="absolute top-100 right-100 md:top-12 md:right-12 bg-white/70 p-2 rounded-full shadow-md backdrop-blur-md">
          <img
            src="/profileIcon1.png" // Replace with your actual profile icon path
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
          />
        </div>

        {/* Left: Image */}
        <div className="w-full md:w-1/3">
          <img
            src="/homePicture.png"
            alt="Security Status"
            className="w-full rounded-2xl object-contain shadow-xl border border-[#2D0E30]"
          />
        </div>

        {/* Right: Content */}
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          <div>
            <p className="text-black/80 text-base">Greetings! Your system's status is</p>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle className="text-green-400 w-6 h-6" />
              <h2 className="text-4xl font-extrabold text-green tracking-tight">Optimal</h2>
            </div>

            {/* Fancy Progress Bar */}
            <div className="mt-6">
              <div className="relative w-full h-5 bg-gradient-to-r from-red-600 via-yellow-400 via-blue-500 to-green-500 rounded-full overflow-hidden shadow-inner">
                <div
                  className="absolute top-1/2 w-3 h-7 bg-white rounded-full shadow-xl animate-pulse ring-2 ring-green-300"
                  style={{ left: "90%", transform: "translateY(-50%)" }}
                />
              </div>
              <div className="flex justify-between text-xs text-black mt-2 px-1">
                <span>Critical</span>
                <span>Warning</span>
                <span>Stable</span>
                <span className="font-semibold">Optimal</span>
              </div>
            </div>
          </div>            
          {/* Buttons */}
          <div className="flex flex-wrap gap-4 mt-2">
            <button 
              className="relative bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-gray-400 hover:to-gray-500 text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 group cursor-not-allowed"
              disabled
              title="Feature coming soon"
            >
              <span className="group-hover:opacity-50">Generate Full Report</span>
              <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-xs text-white/90 font-medium">Coming Soon</span>
              </div>
            </button>
            <button
              onClick={() => setShowAssistant(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold px-6 py-2 rounded-xl shadow-md backdrop-blur-lg transition-transform transform hover:scale-105"
            >
              Open AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Floating Chat Assistant Drawer */}
      <ChatAssistant isOpen={showAssistant} onClose={() => setShowAssistant(false)} />

      {/* Security Dashboard */}
      <div className="mt-10">
        <SecurityDashboard />
      </div>


      {/* Floating Fun GIF */}
      <img
        src="/fun.gif"
        alt="Fun animation"
        className="fixed bottom-4 right-4 w-24 h-24 z-50 rounded-xl shadow-lg backdrop-blur-lg"
      />
    </div>
  );
}
