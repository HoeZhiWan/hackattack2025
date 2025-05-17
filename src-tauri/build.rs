fn main() {
    println!("cargo:rustc-link-search=native=C:\\Program Files\\Npcap\\Lib\\x64");
    println!("cargo:rustc-link-lib=wpcap");
    println!("cargo:rustc-link-lib=Packet");
    tauri_build::build()
}
