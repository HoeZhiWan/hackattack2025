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

use firewall::common::{NotificationState, NotificationSettings};

use firewall::domain_blocking::monitor::{
    start_domain_access_monitor,
    stop_domain_access_monitor,
    is_domain_access_monitor_active
};
use tauri::{
    AppHandle
};

use network_traffic_analysis::suricata::{
    is_suricata_active,
    run_suricata,
    kill_suricata,
    read_alert_events,
    extract_and_handle_events
};

use network_traffic_analysis::report::{
    read_flow_report,
    generate_flow_report,
};

use assistant::{
    ask_ai
};


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Simple notification function
#[tauri::command]
async fn send_notification(title: String, message: String, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    
    match app.notification()
        .builder()
        .title(&title)
        .body(&message)
        .show() {
        Ok(_) => {
            println!("Notification sent: {} - {}", title, message);
            Ok(())
        },
        Err(e) => {
            println!("Failed to send notification: {}", e);
            Err(format!("Failed to send notification: {}", e))
        }
    }
}

// Domain blocking notification system
#[tauri::command]
async fn show_domain_blocked_notification(
    domain: String, 
    app: AppHandle,
    state: tauri::State<'_, NotificationState>
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    use tokio::time::{sleep, Duration};
    
    // Get notification settings
    let delay_seconds = {
        let settings = state.settings.lock().unwrap();
        if !settings.enabled {
            println!("Notifications are disabled, skipping notification for domain: {}", domain);
            return Ok(());
        }
        settings.domain_blocked_delay_seconds
    };
    
    // Add delay before showing notification
    if delay_seconds > 0 {
        println!("Waiting {} seconds before showing notification for domain: {}", delay_seconds, domain);
        sleep(Duration::from_secs(delay_seconds)).await;
    }
    
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

// Create popup alert window
#[tauri::command]
async fn create_popup_alert(
    title: String, 
    message: String, 
    alert_type: String,
    app: AppHandle
) -> Result<(), String> {
    use tauri::{WebviewWindowBuilder, WebviewUrl};
    
    // Create a unique window label
    let window_label = format!("popup-alert-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis());
    
    // Encode the data as query parameters
    let encoded_title = urlencoding::encode(&title);
    let encoded_message = urlencoding::encode(&message);
    let encoded_type = urlencoding::encode(&alert_type);
    
    let popup_url = format!(
        "http://localhost:3000/popup-alert?title={}&message={}&type={}", 
        encoded_title, encoded_message, encoded_type
    );
    
    match WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(popup_url.parse().unwrap())
    )
    .title(&format!("Alert: {}", title))
    .inner_size(400.0, 300.0)
    .min_inner_size(350.0, 250.0)
    .max_inner_size(600.0, 500.0)
    .center()
    .resizable(true)
    .always_on_top(true)
    .skip_taskbar(false)
    .focused(true)
    .build() {
        Ok(window) => {
            println!("Popup alert window created: {}", window_label);
            Ok(())
        },
        Err(e) => {
            println!("Failed to create popup window: {}", e);
            Err(format!("Failed to create popup window: {}", e))
        }
    }
}

// Get notification settings
#[tauri::command]
async fn get_notification_settings(
    state: tauri::State<'_, NotificationState>
) -> Result<NotificationSettings, String> {
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

// Set notification settings
#[tauri::command]
async fn set_notification_settings(
    new_settings: NotificationSettings,
    state: tauri::State<'_, NotificationState>
) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    *settings = new_settings;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // We no longer need to call elevate_at_startup() here since we're using
    // Tauri capabilities for permission management
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())        .manage(FirewallState::default())
        .manage(BlockedDomains::default())
        .manage(NotificationState::default())
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
            read_alert_events,
            extract_and_handle_events,
            ask_ai,
            send_notification,
            show_domain_blocked_notification,            read_flow_report,
            generate_flow_report,
            create_popup_alert,
            get_notification_settings,
            set_notification_settings
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
