// domain_blocking/monitor.rs - Background monitoring for blocked domain access attempts
use tauri::{AppHandle, Manager, Emitter};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use crate::firewall::common::BlockedDomains;
use crate::network_traffic_analysis::suricata::read_alert_events;
use super::utils::log_debug;

// Structure to track recent access attempts to avoid spam
#[derive(Clone)]
struct AccessAttempt {
    #[allow(dead_code)]
    domain: String,
    #[allow(dead_code)]
    ip: String,
    timestamp: u64,
    count: u32,
}

// Global state for monitoring
lazy_static::lazy_static! {
    static ref MONITOR_ACTIVE: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref RECENT_ATTEMPTS: Arc<Mutex<HashMap<String, AccessAttempt>>> = Arc::new(Mutex::new(HashMap::new()));
}

const NOTIFICATION_COOLDOWN_SECONDS: u64 = 30; // Don't spam notifications for the same domain
const CLEANUP_INTERVAL_SECONDS: u64 = 300; // Clean up old attempts every 5 minutes

/// Start monitoring for blocked domain access attempts
#[tauri::command]
pub async fn start_domain_access_monitor(app: AppHandle) -> Result<(), String> {
    log_debug("Starting domain access monitor");
    
    let mut is_active = MONITOR_ACTIVE.lock().unwrap();
    if *is_active {
        log_debug("Domain access monitor is already running");
        return Ok(());
    }
    *is_active = true;
    drop(is_active);
    
    // Clone the app handle for the background thread
    let app_clone = app.clone();
    
    // Start background monitoring thread
    thread::spawn(move || {
        monitor_domain_access_loop(app_clone);
    });
    
    log_debug("Domain access monitor started successfully");
    Ok(())
}

/// Stop monitoring for blocked domain access attempts
#[tauri::command]
pub async fn stop_domain_access_monitor() -> Result<(), String> {
    log_debug("Stopping domain access monitor");
    
    let mut is_active = MONITOR_ACTIVE.lock().unwrap();
    *is_active = false;
    
    log_debug("Domain access monitor stopped");
    Ok(())
}

/// Check if the domain access monitor is currently running
#[tauri::command]
pub async fn is_domain_access_monitor_active() -> Result<bool, String> {
    let is_active = MONITOR_ACTIVE.lock().unwrap();
    Ok(*is_active)
}

// Background monitoring loop
fn monitor_domain_access_loop(app: AppHandle) {
    log_debug("Domain access monitoring loop started");
    
    let mut last_cleanup = get_current_timestamp();
    
    // Create a Tokio runtime for async operations in this thread
    let rt = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => {
            log_debug(&format!("Failed to create Tokio runtime for monitoring: {}", e));
            return;
        }
    };
    
    while is_monitor_active() {
        // Check for domain access attempts (async)
        if let Err(e) = rt.block_on(check_for_blocked_domain_access(&app)) {
            log_debug(&format!("Error checking for blocked domain access: {}", e));
        }
        
        // Periodic cleanup of old attempts
        let current_time = get_current_timestamp();
        if current_time - last_cleanup > CLEANUP_INTERVAL_SECONDS {
            cleanup_old_attempts();
            // Also cleanup IP-domain cache
            super::utils::cleanup_ip_domain_cache();
            last_cleanup = current_time;
        }
        
        // Sleep for a short interval before checking again
        thread::sleep(Duration::from_secs(5));
    }
    
    log_debug("Domain access monitoring loop stopped");
}

// Check for blocked domain access attempts by analyzing network traffic
async fn check_for_blocked_domain_access(app: &AppHandle) -> Result<(), String> {
    // Get the current list of blocked domains
    let blocked_domains = get_blocked_domains_set(app)?;
    
    if blocked_domains.is_empty() {
        return Ok(()); // No domains to monitor
    }
    
    // Read recent alert events from Suricata
    match read_alert_events() {
        Ok(alerts) => {
            for alert in alerts {
                // Check if this alert involves a blocked domain
                if let Some(dest_ip) = &alert.dest_ip {
                    // Check if this IP belongs to a blocked domain
                    if let Some(domain) = check_ip_against_blocked_domains(app, dest_ip, &blocked_domains).await {
                        handle_blocked_domain_access(app, &domain, dest_ip, &alert)?;
                    }
                }
            }
        },
        Err(_) => {
            // Suricata might not be running or no alerts available
            // This is normal, so we don't log an error
        }
    }
    
    Ok(())
}

// Get the current set of blocked domains
fn get_blocked_domains_set(app: &AppHandle) -> Result<HashSet<String>, String> {
    let state = app.state::<BlockedDomains>();
    let domains = state.domains.lock().unwrap();
    Ok(domains.iter().cloned().collect())
}

// Check if an IP address belongs to any blocked domain
async fn check_ip_against_blocked_domains(
    app: &AppHandle,
    ip: &str, 
    blocked_domains: &HashSet<String>
) -> Option<String> {
    // Use the cached IP-to-domain mapping function
    super::utils::check_ip_against_blocked_domains_cached(app, ip, blocked_domains).await
}

// Handle a detected blocked domain access attempt
fn handle_blocked_domain_access(
    app: &AppHandle,
    domain: &str,
    ip: &str,
    alert: &crate::network_traffic_analysis::suricata::AlertEvent
) -> Result<(), String> {
    use tauri::Manager;
    use crate::firewall::common::NotificationState;
    
    let current_time = get_current_timestamp();
    let access_key = format!("{}:{}", domain, ip);
    
    // Get notification settings for cooldown
    let notification_state = app.state::<NotificationState>();
    let settings = notification_state.settings.lock().unwrap();
    let cooldown_seconds = settings.cooldown_seconds;
    drop(settings); // Release the lock
    
    // Check if we've recently notified about this domain
    let mut recent_attempts = RECENT_ATTEMPTS.lock().unwrap();
      let should_notify = match recent_attempts.get(&access_key) {
        Some(attempt) => {
            let last_timestamp = attempt.timestamp;
            // Update the attempt count
            let mut updated_attempt = attempt.clone();
            updated_attempt.count += 1;
            updated_attempt.timestamp = current_time;
            recent_attempts.insert(access_key.clone(), updated_attempt);
            
            // Only notify if enough time has passed since last notification
            current_time - last_timestamp > cooldown_seconds
        },
        None => {
            // First time accessing this domain
            recent_attempts.insert(access_key, AccessAttempt {
                domain: domain.to_string(),
                ip: ip.to_string(),
                timestamp: current_time,
                count: 1,
            });
            true
        }
    };
    
    drop(recent_attempts);
    
    if should_notify {
        send_blocked_domain_notification(app, domain, ip, alert)?;
    }
    
    Ok(())
}

// Send notification for blocked domain access
fn send_blocked_domain_notification(
    app: &AppHandle,
    domain: &str,
    ip: &str,
    alert: &crate::network_traffic_analysis::suricata::AlertEvent
) -> Result<(), String> {
    use tauri::Manager;
    use crate::firewall::common::NotificationState;
    
    log_debug(&format!("Preparing to send blocked domain access notification for: {} ({})", domain, ip));
    
    // Get notification settings
    let notification_state = app.state::<NotificationState>();
    let settings = notification_state.settings.lock().unwrap();
    
    if !settings.enabled {
        log_debug("Notifications are disabled, skipping notification");
        return Ok(());
    }
    
    let delay_seconds = settings.domain_blocked_delay_seconds;
    drop(settings); // Release the lock
    
    // Clone values for the async task
    let app_clone = app.clone();
    let domain_clone = domain.to_string();
    let ip_clone = ip.to_string();
    let alert_clone = alert.clone();
    
    // Send notification after delay using tokio spawn
    tauri::async_runtime::spawn(async move {
        if delay_seconds > 0 {
            log_debug(&format!("Waiting {} seconds before sending notification for domain: {}", delay_seconds, domain_clone));
            tokio::time::sleep(tokio::time::Duration::from_secs(delay_seconds)).await;
        }
        
        log_debug(&format!("Sending blocked domain access notification for: {} ({})", domain_clone, ip_clone));
        
        // Show system tray notification only
        if let Err(e) = app_clone.emit("domain-access-blocked-notification", serde_json::json!({
            "domain": domain_clone,
            "ip": ip_clone,
            "timestamp": alert_clone.timestamp,
            "signature": alert_clone.signature
        })) {
            log_debug(&format!("Failed to emit domain access blocked event: {}", e));
        } else {
            log_debug(&format!("Successfully sent domain access blocked notification for: {}", domain_clone));
        }
    });
    
    Ok(())
}

// Utility functions
fn is_monitor_active() -> bool {
    let is_active = MONITOR_ACTIVE.lock().unwrap();
    *is_active
}

fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn cleanup_old_attempts() {
    let current_time = get_current_timestamp();
    let mut recent_attempts = RECENT_ATTEMPTS.lock().unwrap();
    
    // Remove attempts older than 10 minutes
    recent_attempts.retain(|_, attempt| {
        current_time - attempt.timestamp < 600
    });
      log_debug(&format!("Cleaned up old access attempts, {} entries remaining", recent_attempts.len()));
}

#[allow(dead_code)]
fn format_timestamp(timestamp: &str) -> String {
    // Try to parse and format the timestamp nicely
    if let Ok(parsed) = chrono::DateTime::parse_from_rfc3339(timestamp) {
        parsed.format("%Y-%m-%d %H:%M:%S").to_string()
    } else {
        timestamp.to_string()
    }
}

// Alternative approach: Monitor firewall logs for blocked connections
#[allow(dead_code)]
pub async fn monitor_firewall_logs_for_blocked_domains(_app: AppHandle) -> Result<(), String> {
    log_debug("Starting firewall log monitoring for blocked domains");
    
    // This would monitor Windows Firewall logs for blocked connections
    // and correlate them with blocked domains
    
    // Implementation would involve:
    // 1. Parsing Windows Firewall logs (typically in C:\Windows\System32\LogFiles\Firewall\pfirewall.log)
    // 2. Looking for DROP actions that match IPs of blocked domains
    // 3. Sending notifications when matches are found
    
    // For now, we'll use the Suricata-based approach above
    Ok(())
}
