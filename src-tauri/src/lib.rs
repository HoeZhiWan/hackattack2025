// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod network_traffic_analysis;
mod firewall;

use firewall::{
    FirewallState, 
    BlockedDomains,
    get_firewall_rules, 
    add_firewall_rule, 
    remove_firewall_rule, 
    enable_disable_rule,
    get_blocked_domains,
    block_domain,
    unblock_domain
};

use network_traffic_analysis::suricata::{
    is_suricata_active,
    run_suricata,
    kill_suricata,
    read_alert_events_from_eve
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    /*
    std::thread::spawn(|| {
        network_traffic_analysis::packet_analysis::suricata::run_suricata().expect("Failed to run Suricata");
    });
    */
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .manage(FirewallState::default())
        .manage(BlockedDomains::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_firewall_rules,
            add_firewall_rule,
            remove_firewall_rule,
            enable_disable_rule,
            get_blocked_domains,
            block_domain,
            unblock_domain,
            is_suricata_active,
            run_suricata,
            kill_suricata,
            read_alert_events_from_eve
        ])
        .setup(|_app| {
            // Prefix with underscore to indicate intentionally unused variable
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
