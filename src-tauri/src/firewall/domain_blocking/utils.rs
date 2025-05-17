// domain_blocking/utils.rs - Utility functions for domain blocking
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use std::time::{SystemTime, UNIX_EPOCH};
use regex::Regex;
use crate::firewall::common::run_shell_command;

// Enhanced debug logging with timestamps
pub fn log_debug(message: &str) {
    // Get timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    // Print with timestamp and domain blocking prefix
    println!("[{}] [DOMAIN-BLOCKER] {}", timestamp, message);
}

// Validate domain format using regex
pub fn is_valid_domain_format(domain: &str) -> bool {
    // Basic domain validation regex
    // This checks for a typical domain format with at least one dot
    // and valid characters in the domain name
    let domain_regex = Regex::new(r"^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$").unwrap();
    
    let is_valid = domain_regex.is_match(domain);
    if !is_valid {
        log_debug(&format!("Domain validation failed for: {}", domain));
    }
    
    is_valid
}

// Helper function to extract all IPs from nslookup output
pub fn extract_ips_from_nslookup(nslookup_output: &str) -> Vec<String> {
    log_debug("Parsing nslookup output to extract IP addresses");
    log_debug(&format!("Full nslookup output:\n{}", nslookup_output));
    
    let mut ips = Vec::new();
    let mut in_addresses_section = false;
    
    // Parse nslookup output - looking for lines with "Addresses:" and subsequent indented IP addresses
    for line in nslookup_output.lines() {
        let trimmed = line.trim();
        
        // Check if we've found the Addresses section
        if trimmed.starts_with("Addresses:") {
            in_addresses_section = true;
            
            // Extract the first IP address that might appear on the same line
            if let Some(first_ip) = trimmed.strip_prefix("Addresses:").map(|s| s.trim()) {
                if !first_ip.is_empty() && is_valid_ip_format(first_ip) {
                    log_debug(&format!("Found IP address: {}", first_ip));
                    ips.push(first_ip.to_string());
                }
            }
            continue;
        }
        
        // Check if we're in the Addresses section and line contains an indented IP address
        if in_addresses_section && trimmed.len() > 0 {
            // If we hit a line that doesn't look like an IP address, we've exited the Addresses section
            if !is_valid_ip_format(trimmed) && !line.starts_with(" ") {
                in_addresses_section = false;
                continue;
            }
            
            if is_valid_ip_format(trimmed) {
                log_debug(&format!("Found IP address: {}", trimmed));
                ips.push(trimmed.to_string());
            }
            continue;
        }
        
        // Also look for "Address:" (singular) entries which appear in some nslookup output formats
        if trimmed.starts_with("Address:") && !trimmed.contains("192.168.") {
            if let Some(ip) = trimmed.strip_prefix("Address:").map(|s| s.trim()) {
                if is_valid_ip_format(ip) {
                    log_debug(&format!("Found IP address: {}", ip));
                    ips.push(ip.to_string());
                }
            }
        }
    }
    
    if ips.is_empty() {
        log_debug("No IP addresses found in nslookup output");
    } else {
        log_debug(&format!("Extracted {} IP addresses from nslookup", ips.len()));
    }
    
    ips
}

// Helper function to extract IP from ping output (kept for backward compatibility)
pub fn extract_ip_from_ping(ping_output: &str) -> Option<String> {
    log_debug("Parsing ping output to extract IP address");
    log_debug(&format!("Full ping output:\n{}", ping_output));
    
    // Look for lines like "Pinging example.com [93.184.216.34] with 32 bytes of data:"
    for line in ping_output.lines() {
        if line.contains("Pinging") && line.contains("[") && line.contains("]") {
            log_debug(&format!("Found ping line: {}", line));
            
            if let Some(start) = line.find('[') {
                if let Some(end) = line.find(']') {
                    if start < end {
                        let ip = &line[(start + 1)..end];
                        log_debug(&format!("Extracted IP address: {}", ip));
                        return Some(ip.to_string());
                    }
                }
            }
        }
    }
    
    log_debug("Could not extract IP address from ping output");
    None
}

// Function to resolve domain to multiple IPs with detailed logging
pub async fn resolve_domain_to_ips(app: &AppHandle, domain: &str) -> Result<Vec<String>, String> {
    log_debug(&format!("Resolving domain {} to IP addresses using nslookup command", domain));
    
    // Use nslookup as the primary resolution method
    let nslookup_output = match run_shell_command(app, "cmd", vec!["/c", &format!("nslookup {}", domain)]).await {
        Ok(output) => output,
        Err(e) => {
            let error_msg = format!("Failed to execute nslookup command: {}", e);
            log_debug(&error_msg);
            return Err(error_msg);
        }
    };
    
    // Extract all IPs from the output
    let ips = extract_ips_from_nslookup(&nslookup_output);
    
    if !ips.is_empty() {
        return Ok(ips);
    }
    
    // Fallback to ping if nslookup doesn't find any IPs
    log_debug(&format!("Falling back to ping for domain {}", domain));
    match resolve_domain_to_ip(app, domain).await {
        Ok(ip) => Ok(vec![ip]),
        Err(e) => Err(e)
    }
}

// Original function kept for compatibility
pub async fn resolve_domain_to_ip(app: &AppHandle, domain: &str) -> Result<String, String> {
    log_debug(&format!("Resolving domain {} to IP address using ping command", domain));
    
    // Use the new run_shell_command to see full output
    let ip_output = match run_shell_command(app, "ping", vec!["-n", "1", "-4", domain]).await {
        Ok(output) => output,
        Err(e) => {
            let error_msg = format!("Failed to execute ping command: {}", e);
            log_debug(&error_msg);
            return Err(error_msg);
        }
    };
    
    // Try to extract IP from the output
    if let Some(ip) = extract_ip_from_ping(&ip_output) {
        // Validate the IP format (basic check)
        if is_valid_ip_format(&ip) {
            return Ok(ip);
        } else {
            let error_msg = format!("Extracted IP has invalid format: {}", ip);
            log_debug(&error_msg);
            return Err(error_msg);
        }
    }
    
    Err(format!("Could not resolve domain {} to IP address", domain))
}

// Basic IP validation for both IPv4 and IPv6
fn is_valid_ip_format(ip: &str) -> bool {
    // IPv4 validation
    let ipv4_regex = Regex::new(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$").unwrap();
    
    // IPv6 validation (simplified pattern)
    let ipv6_regex = Regex::new(r"^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$").unwrap();
    
    // Check if it's a valid IPv4 address
    if ipv4_regex.is_match(ip) {
        // Further validate IPv4 octets
        let octets: Vec<&str> = ip.split('.').collect();
        if octets.len() != 4 {
            log_debug(&format!("IPv4 should have 4 octets, found {}: {}", octets.len(), ip));
            return false;
        }
        
        for octet in octets {
            if let Ok(value) = octet.parse::<u8>() {
                // Valid octet
                if value > 255 {
                    log_debug(&format!("Invalid IPv4 octet value (>255): {}", octet));
                    return false;
                }
            } else {
                log_debug(&format!("Invalid IPv4 octet value: {}", octet));
                return false;
            }
        }
        
        return true;
    }
    
    // Check if it's a valid IPv6 address
    if ipv6_regex.is_match(ip) {
        return true;
    }
    
    // If we got here, it's neither a valid IPv4 nor IPv6
    log_debug(&format!("IP format validation failed: {}", ip));
    false
}

// Try alternative domain resolution methods (updated to return multiple IPs)
pub async fn try_alternative_resolution(app: &AppHandle, domain: &str) -> Result<Vec<String>, String> {
    log_debug(&format!("Trying alternative resolution for domain: {}", domain));
    
    // Try ping as an alternative
    log_debug(&format!("Running ping command for domain: {}", domain));
    
    // Use the new run_shell_command to see full output
    let ping_output = match run_shell_command(app, "ping", vec!["-n", "1", "-4", domain]).await {
        Ok(output) => output,
        Err(e) => {
            let error_msg = format!("Failed to execute ping command: {}", e);
            log_debug(&error_msg);
            return Err(error_msg);
        }
    };
    
    // Try to extract IP from the output
    if let Some(ip) = extract_ip_from_ping(&ping_output) {
        // Validate the IP format (basic check)
        if is_valid_ip_format(&ip) {
            log_debug(&format!("Successfully resolved domain using ping: {}", ip));
            return Ok(vec![ip]);
        }
    }
    
    log_debug(&format!("Failed to resolve domain using alternative methods: {}", domain));
    Err(format!("Could not resolve domain using alternative methods: {}", domain))
}