// domain_blocking/utils.rs - Utility functions for domain blocking
use tauri::AppHandle;
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

// Helper function to extract IP from ping output
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

// Function to resolve domain to IP with detailed logging
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

// Basic IP validation
fn is_valid_ip_format(ip: &str) -> bool {
    // Simple IPv4 validation
    let ip_regex = Regex::new(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$").unwrap();
    
    if !ip_regex.is_match(ip) {
        log_debug(&format!("IP format validation failed: {}", ip));
        return false;
    }
    
    // Check each octet
    let octets: Vec<&str> = ip.split('.').collect();
    if octets.len() != 4 {
        log_debug(&format!("IP should have 4 octets, found {}: {}", octets.len(), ip));
        return false;
    }
    
    for octet in octets {
        if let Ok(_) = octet.parse::<u8>() {
            // Valid octet
        } else {
            log_debug(&format!("Invalid IP octet value: {}", octet));
            return false;
        }
    }
    
    true
}

// Try alternative domain resolution methods
pub async fn try_alternative_resolution(app: &AppHandle, domain: &str) -> Result<String, String> {
    log_debug(&format!("Trying alternative resolution for domain: {}", domain));
    
    // Try nslookup as an alternative
    log_debug(&format!("Running nslookup command for domain: {}", domain));
    
    // Use the new run_shell_command to see full output
    let nslookup_output = match run_shell_command(app, "cmd", vec!["/c", &format!("nslookup {}", domain)]).await {
        Ok(output) => output,
        Err(e) => {
            let error_msg = format!("Failed to execute nslookup command: {}", e);
            log_debug(&error_msg);
            return Err(error_msg);
        }
    };
    
    // Parse nslookup output - looking for lines like "Address: 93.184.216.34"
    for line in nslookup_output.lines() {
        if line.contains("Address:") && !line.contains("127.0.0.1") {
            if let Some(ip_part) = line.split_whitespace().nth(1) {
                if is_valid_ip_format(ip_part) {
                    log_debug(&format!("Successfully resolved domain using nslookup: {}", ip_part));
                    return Ok(ip_part.to_string());
                }
            }
        }
    }
    
    log_debug(&format!("Failed to resolve domain using alternative methods: {}", domain));
    Err(format!("Could not resolve domain using alternative methods: {}", domain))
}