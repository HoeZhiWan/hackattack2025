// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod network_traffic_analysis;
mod firewall;
mod tray;
mod assistant;

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
use tauri::{
    AppHandle
};

use network_traffic_analysis::suricata::{
    is_suricata_active,
    run_suricata,
    kill_suricata,
    read_alert_events_from_eve
};

use assistant::{
    ask_ai
};


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Domain blocking notification system
#[tauri::command]
async fn show_domain_blocked_notification(domain: String, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    
    let title = "🚫 Domain Blocked";
    let body = format!("Domain {} has been blocked by HackAttack. Click to learn more.", domain);
    
    // Show system notification
    match app.notification()
        .builder()
        .title(title)
        .body(&body)
        .show() {
        Ok(_) => {
            println!("Notification sent for blocked domain: {}", domain);
            Ok(())
        },
        Err(e) => {
            println!("Failed to send notification: {}", e);
            Err(format!("Failed to send notification: {}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // We no longer need to call elevate_at_startup() here since we're using
    // Tauri capabilities for permission management
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(FirewallState::default())
        .manage(BlockedDomains::default())        .invoke_handler(tauri::generate_handler![
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
            read_alert_events_from_eve,
            ask_ai,
            show_domain_blocked_notification
        ]).setup(|app| {
            // Initialize blocked domains list from file synchronously
            let app_handle = app.handle().clone();
            
            // Create runtime inside the setup function
            let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
            
            // Use the runtime to block on the async initialization
            rt.block_on(async {
                if let Err(e) = firewall::domain_blocking::initialize_blocked_domains(app_handle.clone()).await {
                    println!("Warning: Failed to initialize blocked domains from file: {}", e);
                    // Continue anyway, using an empty list
                }            
            });              // Set up the system tray
            let app_handle = app.handle();
            // Clean up any existing tray first
            tray::cleanup_tray();
            tray::create_tray(app_handle)?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
