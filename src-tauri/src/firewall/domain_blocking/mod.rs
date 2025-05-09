// firewall/domain_blocking/mod.rs - Module file for domain blocking functionality
mod utils;

use tauri::{AppHandle, State};
use crate::firewall::common::{BlockedDomains, run_shell_command};
use utils::{log_debug, resolve_domain_to_ip, try_alternative_resolution};

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
    
    // Block outgoing connections to the domain
    let rule_name = format!("Block-Domain-{}", domain);
    log_debug(&format!("Creating firewall rule with name: {}", rule_name));
    
    // First, try to resolve the domain to an IP address
    log_debug(&format!("Attempting to resolve domain {} to IP address...", domain));
    let ip_result = resolve_domain_to_ip(&app, &domain).await;
    
    // If primary resolution fails, try alternative methods
    let ip_address = match ip_result {
        Ok(ip) => {
            log_debug(&format!("Successfully resolved domain to IP: {}", ip));
            ip
        },
        Err(err) => {
            // Try alternative resolution methods
            log_debug(&format!("Primary resolution failed: {}. Trying alternative methods...", err));
            match try_alternative_resolution(&app, &domain).await {
                Ok(ip) => {
                    log_debug(&format!("Alternative resolution succeeded with IP: {}", ip));
                    ip
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
    
    // Create the description string for the firewall rule
    let description = format!("Blocks connections to domain: {}", domain);
    
    // Build command with correct syntax using name=value format
    // This is crucial - Windows Firewall requires this exact format
    let netsh_command = format!(
        "advfirewall firewall add rule name=\"{}\" dir=out action=block enable=yes protocol=any description=\"{}\" remoteip={}",
        rule_name, description, ip_address
    );
    
    log_debug(&format!("Executing firewall command to block domain {} using IP {}", domain, ip_address));
    log_debug(&format!("Full command: netsh {}", netsh_command));
    
    // Execute as a single command string
    // Store the formatted string in a variable to extend its lifetime
    let full_command = format!("netsh {}", netsh_command);
    let args = vec!["/c", &full_command];
    match run_shell_command(&app, "cmd", args).await {
        Ok(_) => {
            log_debug(&format!("Successfully created firewall rule to block domain: {}", domain));
            
            // Update our state
            let mut domains = state.domains.lock().unwrap();
            if !domains.contains(&domain) {
                log_debug(&format!("Adding domain {} to blocked domains list", domain));
                domains.push(domain);
            } else {
                log_debug(&format!("Domain {} already in blocked domains list", domain));
            }
            
            log_debug("Domain blocking completed successfully");
            Ok(())
        },
        Err(e) => {
            let error_msg = format!("Failed to block domain {}: {}", domain, e);
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
    
    let rule_name = format!("Block-Domain-{}", domain);
    log_debug(&format!("Attempting to remove firewall rule: {}", rule_name));
    
    // Remove the rule using the correct syntax
    let netsh_command = format!(
        "advfirewall firewall delete rule name=\"{}\"",
        rule_name
    );
    
    log_debug(&format!("Full command: netsh {}", netsh_command));
    
    // Execute as a single command string
    // Store the formatted string in a variable to extend its lifetime
    let full_command = format!("netsh {}", netsh_command);
    let args = vec!["/c", &full_command];
    match run_shell_command(&app, "cmd", args).await {
        Ok(_) => {
            log_debug(&format!("Successfully removed firewall rule for domain: {}", domain));
            
            // Update our state
            let mut domains = state.domains.lock().unwrap();
            let before_count = domains.len();
            domains.retain(|d| d != &domain);
            let after_count = domains.len();
            
            if before_count > after_count {
                log_debug(&format!("Removed domain {} from blocked domains list", domain));
            } else {
                log_debug(&format!("Domain {} was not found in the blocked domains list", domain));
            }
            
            log_debug("Domain unblocking completed successfully");
            Ok(())
        },
        Err(e) => {
            let error_msg = format!("Failed to unblock domain {}: {}", domain, e);
            log_debug(&error_msg);
            Err(error_msg)
        }
    }
}