"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm shadow-md z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <Image 
              src="/logo.png"       // path from the public folder
              alt="HackAttack Logo" // alt text for accessibility
              width={164}            // adjust size as needed
              height={164}
              className="object-contain"
            />
          </Link>

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