// firewall/domain_blocking/mod.rs - Module file for domain blocking functionality
pub mod utils;
pub mod monitor;

use tauri::{AppHandle, State, Manager, Emitter};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use crate::firewall::common::{BlockedDomains, run_elevated_powershell};
use utils::log_debug;

// Path to the domains list file
fn get_domains_file_path(app: &AppHandle) -> PathBuf {
    // In Tauri v2, we access app data directory differently
    let app_data_dir = match app.app_handle().path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => {
            log_debug("Failed to get app data directory, using current directory");
            std::env::current_dir().unwrap_or_default()
        }
    };
    
    // Create directory if it doesn't exist
    if !app_data_dir.exists() {
        if let Err(e) = fs::create_dir_all(&app_data_dir) {
            log_debug(&format!("Failed to create app data directory: {}", e));
        }
    }
    
    app_data_dir.join("blocked_domains.json")
}

// Save domains to a file
async fn save_domains_to_file(app: &AppHandle, domains: &Vec<String>) -> Result<(), String> {
    let file_path = get_domains_file_path(app);
    log_debug(&format!("Saving domains to file: {:?}", file_path));
    
    let json = serde_json::to_string_pretty(domains)
        .map_err(|e| format!("Failed to serialize domains: {}", e))?;
    
    File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))
        .and_then(|mut file| {
            file.write_all(json.as_bytes())
                .map_err(|e| format!("Failed to write to file: {}", e))
        })?;
    
    log_debug(&format!("Successfully saved {} domains to file", domains.len()));
    Ok(())
}

// Load domains from a file
async fn load_domains_from_file(app: &AppHandle) -> Result<Vec<String>, String> {
    let file_path = get_domains_file_path(app);
    log_debug(&format!("Loading domains from file: {:?}", file_path));
    
    if !file_path.exists() {
        log_debug("Domains file doesn't exist, returning empty list");
        return Ok(Vec::new());
    }
    
    let mut file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut json = String::new();
    file.read_to_string(&mut json)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let domains: Vec<String> = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to deserialize domains: {}", e))?;
    
    log_debug(&format!("Successfully loaded {} domains from file", domains.len()));
    Ok(domains)
}

// Initialize the domains list from file - public function for the app setup
pub async fn initialize_blocked_domains(app: AppHandle) -> Result<(), String> {
    log_debug("Initializing domains list from file");
    
    match load_domains_from_file(&app).await {
        Ok(domains) => {
            // Get the BlockedDomains state from the app
            let state = app.state::<BlockedDomains>();
            let mut state_domains = state.domains.lock().unwrap();
            *state_domains = domains;
            log_debug(&format!("Initialized domains list with {} domains", state_domains.len()));
            Ok(())
        },
        Err(e) => {
            log_debug(&format!("Failed to initialize domains list: {}", e));
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_blocked_domains(state: State<'_, BlockedDomains>) -> Result<Vec<String>, String> {
    log_debug("Fetching list of blocked domains...");
    
    let domains = state.domains.lock().unwrap();
    let domains_clone = domains.clone();
    
    log_debug(&format!("Found {} blocked domains", domains_clone.len()));
    Ok(domains_clone)
}

#[tauri::command]
pub async fn block_domain(
    app: AppHandle,
    domain: String,
    state: State<'_, BlockedDomains>
) -> Result<(), String> {
    log_debug(&format!("Starting domain blocking process for: {}", domain));
    
    // Validate domain format
    if !utils::is_valid_domain_format(&domain) {
        let error_msg = format!("Invalid domain format: {}", domain);
        log_debug(&error_msg);
        return Err(error_msg);
    }
    
    // Create rule names for both inbound and outbound rules
    let outbound_rule_prefix = format!("Block-Domain-Outbound-{}", domain);
    let inbound_rule_prefix = format!("Block-Domain-Inbound-{}", domain);
    log_debug(&format!("Creating firewall rules with prefixes: {} and {}", outbound_rule_prefix, inbound_rule_prefix));
      // First, try to resolve the domain to IP addresses (multiple IPs)
    log_debug(&format!("Attempting to resolve domain {} to IP addresses...", domain));
    let ip_result = utils::resolve_domain_to_ips(&app, &domain).await;
    
    // If primary resolution fails, try alternative methods
    let ip_addresses = match ip_result {
        Ok(ips) => {
            log_debug(&format!("Successfully resolved domain to {} IP addresses", ips.len()));
            ips
        },
        Err(err) => {
            // Try alternative resolution methods
            log_debug(&format!("Primary resolution failed: {}. Trying alternative methods...", err));
            match utils::try_alternative_resolution(&app, &domain).await {
                Ok(ips) => {
                    log_debug(&format!("Alternative resolution succeeded with {} IP addresses", ips.len()));
                    ips
                },
                Err(alt_err) => {
                    // If all resolution methods fail, return error
                    let error_msg = format!("Failed to resolve domain {} to IP: Primary: {}, Alternative: {}", 
                                            domain, err, alt_err);
                    log_debug(&error_msg);
                    return Err(error_msg);
                }
            }
        }
    };
    
    if ip_addresses.is_empty() {
        let error_msg = format!("No IP addresses found for domain: {}", domain);
        log_debug(&error_msg);
        return Err(error_msg);
    }
    
    log_debug(&format!("Creating firewall rules for {} IP addresses associated with {}", ip_addresses.len(), domain));
    
    // Build a PowerShell script with all the firewall commands
    let mut ps_script = String::new();
    let mut rule_count = 0;
    
    // Add PowerShell error handling
    ps_script.push_str("$ErrorActionPreference = 'Stop'\n");
    ps_script.push_str("try {\n");
    
    // Add commands for each IP address
    for (index, ip_address) in ip_addresses.iter().enumerate() {
        // Create unique rule names for each IP address
        let outbound_rule_name = if ip_addresses.len() > 1 {
            format!("{}-{}", outbound_rule_prefix, index + 1)
        } else {
            outbound_rule_prefix.clone()
        };
        
        let inbound_rule_name = if ip_addresses.len() > 1 {
            format!("{}-{}", inbound_rule_prefix, index + 1)
        } else {
            inbound_rule_prefix.clone()
        };
        
        // Create the description strings for the firewall rules
        let outbound_description = format!("Blocks outgoing connections to domain: {} (IP: {})", domain, ip_address);
        let inbound_description = format!("Blocks incoming connections from domain: {} (IP: {})", domain, ip_address);
        
        // Add outbound rule command using PowerShell
        ps_script.push_str(&format!(
            "    netsh advfirewall firewall add rule name=\"{}\" dir=out action=block enable=yes protocol=any description=\"{}\" remoteip={}\n",
            outbound_rule_name, outbound_description, ip_address
        ));
        rule_count += 1;
        
        // Add inbound rule command using PowerShell
        ps_script.push_str(&format!(
            "    netsh advfirewall firewall add rule name=\"{}\" dir=in action=block enable=yes protocol=any description=\"{}\" remoteip={}\n",
            inbound_rule_name, inbound_description, ip_address
        ));
        rule_count += 1;
    }
    
    // Close the try block and add error handling
    ps_script.push_str("    Write-Host \"Successfully created all firewall rules\"\n");
    ps_script.push_str("} catch {\n");
    ps_script.push_str("    Write-Host \"Error creating firewall rules: $_\"\n");
    ps_script.push_str("    exit 1\n");
    ps_script.push_str("}\n");
    
    log_debug(&format!("Executing PowerShell script with {} firewall rules", rule_count));
    log_debug(&format!("PowerShell script:\n{}", ps_script));    // Execute all commands in a single elevated PowerShell session
    match run_elevated_powershell(&app, &ps_script).await {
        Ok(_) => {
            log_debug(&format!("Successfully created {} firewall rules for domain: {}", rule_count, domain));
            
            // Update our state
            {
                let mut domains = state.domains.lock().unwrap();
                if !domains.contains(&domain) {
                    log_debug(&format!("Adding domain {} to blocked domains list", domain));
                    domains.push(domain.clone());
                } else {
                    log_debug(&format!("Domain {} already in blocked domains list", domain));
                }
            } // Drop the lock before async operation
            
            // Save domains to file
            let domains_clone = { state.domains.lock().unwrap().clone() };
            if let Err(e) = save_domains_to_file(&app, &domains_clone).await {
                log_debug(&format!("Failed to save domains to file: {}", e));
                // Continue anyway - the domain is blocked but not persisted
            }
              log_debug(&format!("Domain blocking completed. Created {} firewall rules for domain {}", 
                          rule_count, domain));
              // Show notification to user that domain was blocked
            log_debug(&format!("Triggering notification for blocked domain: {}", domain));
            if let Err(e) = app.emit("domain-blocked-notification", &domain) {
                log_debug(&format!("Failed to emit domain blocked event: {}", e));
            }
            
            // // Also trigger a popup alert for critical security notification
            // log_debug(&format!("Creating popup alert for blocked domain: {}", domain));
            // let popup_title = "🚫 Domain Blocked";
            // let popup_message = format!(
            //     "Security Alert: Access to \"{}\" has been blocked.\n\nThis domain was identified as potentially malicious and has been added to your firewall rules.\n\nYour system is now protected from this threat.", 
            //     domain
            // );
            
            // // Use the app's invoke system to call our popup alert command
            // if let Err(e) = app.emit("create-popup-alert", serde_json::json!({
            //     "title": popup_title,
            //     "message": popup_message,
            //     "alertType": "blocked"
            // })) {
            //     log_debug(&format!("Failed to trigger popup alert: {}", e));
            // }
            
            Ok(())
        },
        Err(e) => {
            let error_msg = format!("Failed to create firewall rules for domain {}: {}", domain, e);
            log_debug(&error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn unblock_domain(
    app: AppHandle,
    domain: String,
    state: State<'_, BlockedDomains>
) -> Result<(), String> {
    log_debug(&format!("Starting domain unblocking process for: {}", domain));
    
    // Base rule names for both inbound and outbound rules
    let outbound_rule_prefix = format!("Block-Domain-Outbound-{}", domain);
    let inbound_rule_prefix = format!("Block-Domain-Inbound-{}", domain);
    log_debug(&format!("Attempting to remove firewall rules with prefixes: {} and {}", outbound_rule_prefix, inbound_rule_prefix));
    
    // Build a PowerShell script with all the deletion commands
    let mut ps_script = String::new();
    
    // Add PowerShell error handling
    ps_script.push_str("$ErrorActionPreference = 'Continue' # Continue on errors since some rules might not exist\n");
    ps_script.push_str("$removed_count = 0\n\n");
    
    // Add base rule deletion commands (in case there's only one IP)
    ps_script.push_str(&format!(
        "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
        outbound_rule_prefix
    ));
    
    ps_script.push_str(&format!(
        "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
        inbound_rule_prefix
    ));
    
    // Add numbered rule deletion commands (up to a reasonable limit)
    for i in 1..20 { // Try up to 20 numbered rules
        let numbered_outbound_rule = format!("{}-{}", outbound_rule_prefix, i);
        let numbered_inbound_rule = format!("{}-{}", inbound_rule_prefix, i);
        
        ps_script.push_str(&format!(
            "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
            numbered_outbound_rule
        ));
        
        ps_script.push_str(&format!(
            "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
            numbered_inbound_rule
        ));
    }
    
    // Add legacy rule deletion command just in case
    let old_rule_name = format!("Block-Domain-{}", domain);
    ps_script.push_str(&format!(
        "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
        old_rule_name
    ));
    
    // Add a summary at the end
    ps_script.push_str("\nWrite-Host \"Removed $removed_count firewall rules for domain: ");
    ps_script.push_str(&domain);
    ps_script.push_str("\"\n");
    
    log_debug(&format!("Executing PowerShell script to remove firewall rules for domain: {}", domain));
    log_debug(&format!("PowerShell script:\n{}", ps_script));
    
    // Execute all deletion commands in a single elevated PowerShell session
    match run_elevated_powershell(&app, &ps_script).await {
        Ok(output) => {
            log_debug(&format!("PowerShell output: {}", output));
            
            // Check if any rules were actually removed
            if output.contains("Removed 0 firewall rules") {
                log_debug(&format!("No firewall rules found for domain {}", domain));
                // Continue anyway to update the state
            } else {
                log_debug(&format!("Successfully removed firewall rules for domain: {}", domain));
            }
            
            // Update our state
            let before_count;
            let after_count;
            {
                let mut domains = state.domains.lock().unwrap();
                before_count = domains.len();
                domains.retain(|d| d != &domain);
                after_count = domains.len();
            } // Drop the lock before async operation
            
            if before_count > after_count {
                log_debug(&format!("Removed domain {} from blocked domains list", domain));
                
                // Save updated domains to file
                let domains_clone = { state.domains.lock().unwrap().clone() };
                if let Err(e) = save_domains_to_file(&app, &domains_clone).await {
                    log_debug(&format!("Failed to save domains to file: {}", e));
                    // Continue anyway - the domain is unblocked but the change is not persisted
                }
            } else {
                log_debug(&format!("Domain {} was not found in the blocked domains list", domain));
            }
            
            log_debug("Domain unblocking completed successfully");
            Ok(())
        },
        Err(e) => {
            let error_msg = format!("Failed to remove firewall rules for domain {}: {}", domain, e);
            log_debug(&error_msg);
            
            // Even if the commands failed, we should still try to update the domain list
            // in case some rules were removed successfully
            let mut domains = state.domains.lock().unwrap();
            domains.retain(|d| d != &domain);
            
            Err(error_msg)
        }
    }
}