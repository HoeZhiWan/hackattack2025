fn main() {
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rustc-link-search=native=C:\\Program Files\\Npcap\\Lib\\x64");
        println!("cargo:rustc-link-lib=wpcap");
        println!("cargo:rustc-link-lib=Packet");
    }
    #[cfg(not(target_os = "windows"))]
    {
        // On Linux/macOS, libpcap is usually in the default linker path
        println!("cargo:rustc-link-lib=pcap");
    }
    tauri_build::build()
}
