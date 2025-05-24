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
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">          <div className="relative">
            <Image 
              src="/logo.png"       // path from the public folder
              alt="HackAttack Logo" // alt text for accessibility
              width={164}            // adjust size as needed
              height={164}
              className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
              title={`Admin menu: ${adminClicks}/3 clicks`}
            />
            {adminClicks > 0 && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {adminClicks}
              </div>
            )}
          </div>

          <div className="hidden md:flex space-x-8">
            <NavLink href="/" current={pathname === "/"}>Home</NavLink>
            <NavLink href="/firewall" current={pathname === "/firewall"}>Firewall</NavLink>
            <NavLink href="/domain-blocker" current={pathname === "/domain-blocker"}>Domain Blocker</NavLink>
            <NavLink href="/network-traffic-analysis" current={pathname === "/network-traffic-analysis"}>Network Traffic Analysis</NavLink>
            <NavLink href="/security-assistant" current={pathname === "/security-assistant"}>  Security Assistant </NavLink>
            {/* Add more navigation links here as your app grows */}
          </div>
          
          {/* Mobile menu button - could be expanded with a dropdown in the future */}
          <div className="md:hidden">
            <button className="flex items-center px-3 py-2 border rounded text-gray-500 border-gray-500 hover:text-gray-700 hover:border-gray-700">
              <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <title>Menu</title>
                <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
              </svg>
            </button>
          </div>
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
      className={`px-4 py-2 rounded-md text-sm font-medium ${
        current 
          ? 'bg-[#935D4B] text-white' 
          : 'text-[#FF4E00] hover:bg-orange-100 hover:text-[#FF4E00]'
      }`}
    >
      {children}
    </Link>
  );
}