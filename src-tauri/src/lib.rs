// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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
use firewall::common::elevate_at_startup;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // We no longer need to call elevate_at_startup() here since we're using
    // Tauri capabilities for permission management
    
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
            unblock_domain
        ])
        .setup(|app| {
            // Initialize blocked domains list from file synchronously
            let app_handle = app.handle().clone();
            
            // Create runtime inside the setup function
            let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
            
            // Use the runtime to block on the async initialization
            rt.block_on(async {
                if let Err(e) = firewall::domain_blocking::initialize_blocked_domains(app_handle).await {
                    println!("Warning: Failed to initialize blocked domains from file: {}", e);
                    // Continue anyway, using an empty list
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
