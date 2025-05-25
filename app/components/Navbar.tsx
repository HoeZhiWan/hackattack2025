"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminClicks, setAdminClicks] = useState(0);
  
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Count clicks for admin menu
    const newClickCount = adminClicks + 1;
    setAdminClicks(newClickCount);
    
    // Reset click count after 3 seconds
    setTimeout(() => setAdminClicks(0), 3000);
    
    // Navigate to admin page after 3 clicks
    if (newClickCount >= 3) {
      router.push('/admin');
      setAdminClicks(0); // Reset after triggering
    } else if (newClickCount === 1) {
      // For single click, go to home normally
      router.push('/');
    }
    // For 2 clicks, just wait for the potential third click
  };
  return (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm shadow-md z-50">
      <div className="flex justify-between items-center h-14 sm:h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo - Always on the left */}
          <div className="relative flex-shrink-0">            <Image 
              src="/logo.png"       // path from the public folder
              alt="HackAttack Logo" // alt text for accessibility
              width={140}            // adjusted for better mobile responsiveness
              height={140}
              className="object-contain cursor-pointer hover:opacity-80 transition-opacity w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36"
              onClick={handleLogoClick}
              title={`Admin menu: ${adminClicks}/3 clicks`}
            />
            {adminClicks > 0 && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {adminClicks}
              </div>
            )}          </div>

          {/* Navigation Links - Always on the right for desktop */}
          <div className="hidden md:flex space-x-1 lg:space-x-2 xl:space-x-3 flex-shrink-0">
            <NavLink href="/" current={pathname === "/"}>Home</NavLink>
            <NavLink href="/firewall" current={pathname === "/firewall"}>Firewall</NavLink>
            <NavLink href="/domain-blocker" current={pathname === "/domain-blocker"}>Domain Blocker</NavLink>
            <NavLink href="/network-traffic-analysis" current={pathname === "/network-traffic-analysis"}>Network Traffic Analysis</NavLink>
            
            {/* Add more navigation links here as your app grows */}          </div>
          
          {/* Mobile menu button - Always on the right for mobile */}
          <div className="md:hidden flex-shrink-0"><button className="group flex items-center px-3 py-2 sm:px-4 sm:py-3 border-2 rounded-lg text-[#FF4E00] border-[#FF4E00] hover:bg-[#FF4E00] hover:text-white transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md">
              <svg className="h-3 w-3 sm:h-4 sm:w-4 fill-current transition-transform duration-300 group-hover:rotate-90" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <title>Menu</title>
                <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
              </svg>            </button>
          </div>
      </div>
    </nav>
  );
}

// Helper component for navigation links
function NavLink({ href, children, current }: { href: string; children: React.ReactNode; current: boolean }) {
  return (
    <Link 
      href={href} 
      className={`relative px-2 py-2 md:px-3 md:py-2 lg:px-4 lg:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 ${
        current 
          ? 'bg-gradient-to-r from-[#935D4B] to-[#7A4A3A] text-white shadow-lg ring-2 ring-[#935D4B]/30' 
          : 'text-[#FF4E00] hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:text-[#E63E00] hover:shadow-md active:scale-95'
      } before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-transparent before:to-transparent hover:before:from-orange-200/20 hover:before:to-orange-300/20 before:transition-all before:duration-300 whitespace-nowrap`}
    >
      <span className="relative z-10">{children}</span>
    </Link>
  );
}