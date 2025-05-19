import SecurityDashboard from "./components/SecurityDashboard";

export default function Page() {
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

      <div className="max-w-5xl mx-auto bg-[#ffeede] p-6 sm:p-8 rounded-xl shadow-md flex flex-col md:flex-row items-center gap-6 relative mt-8">
        <img
          src="/homePicture.png"
          alt="Security Status"
          className="w-full md:w-1/3 rounded-md object-contain border border-gray-300 shadow-md"
        />

        <div className="flex-1 flex flex-col justify-between w-full">
          <div>
            <p className="text-gray-600">Hello, your system so far is</p>
            <h2 className="text-2xl font-bold text-black mt-4">Optimal</h2>

            <div className="mt-6 w-full">
              <div className="relative w-full h-4 rounded-full overflow-hidden bg-gray-300 shadow-inner">
                <div
                  className="absolute inset-0 animate-gradient-move bg-[length:200%_100%] bg-gradient-to-r from-red-500 via-yellow-300 via-blue-400 to-green-500 rounded-full blur-[1px]"
                  style={{ animationDuration: "8s" }}
                />
                <div
                  className="absolute top-1/2 left-0 w-1.5 h-6 bg-gray-900 rounded-full z-10 transform -translate-y-1/2"
                  style={{ left: "90%" }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                <span>Critical</span>
                <span>Warning</span>
                <span>Stable</span>
                <span>Optimal</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-md shadow-md w-fit">
              Generate Full Report
            </button>
          </div>
        </div>
      </div>

      <img
        src="/fun.gif"
        alt="Fun animation"
        className="fixed bottom-4 right-4 w-24 h-24 z-50 rounded-lg shadow-lg"
      />

      <SecurityDashboard />
    </div>
  );
}
