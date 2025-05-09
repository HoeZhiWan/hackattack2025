// common.rs - Shared types and utilities for the firewall module
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::vec::Vec;
use thiserror::Error;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

// Define a custom error type for our firewall operations
#[derive(Debug, Error)]
pub enum FirewallError {
    #[error("Failed to access Windows Firewall: {0}")]
    AccessError(String),
    
    #[error("Failed to create firewall rule: {0}")]
    RuleCreationError(String),
    
    #[error("Failed to remove firewall rule: {0}")]
    RuleRemovalError(String),
    
    #[error("Failed to fetch firewall rules: {0}")]
    RuleFetchError(String),
    
    #[error("Command execution error: {0}")]
    CommandError(String),
    
    #[error("Parse error: {0}")]
    ParseError(String),
    
    #[error("Domain resolution error: {0}")]
    DomainResolutionError(String),
}

// Serialize firewall rules for the frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FirewallRuleInfo {
    pub name: String,
    pub description: String,
    pub application_path: Option<String>,
    pub port: Option<u16>,
    pub protocol: String,
    pub direction: String,
    pub action: String,
    pub enabled: bool,
}

// Manage the firewall state
pub struct FirewallState {
    pub rules: Mutex<Vec<FirewallRuleInfo>>,
}

impl Default for FirewallState {
    fn default() -> Self {
        FirewallState {
            rules: Mutex::new(Vec::new()),
        }
    }
}

// Domain blocking state
pub struct BlockedDomains {
    pub domains: Mutex<Vec<String>>,
}

impl Default for BlockedDomains {
    fn default() -> Self {
        BlockedDomains {
            domains: Mutex::new(Vec::new()),
        }
    }
}

// Function to run netsh commands and capture output using tauri-plugin-shell
pub async fn run_netsh_command(app: &AppHandle, args: Vec<&str>) -> Result<String, FirewallError> {
    // Log the command being executed for debugging
    let full_command = format!("netsh {}", args.join(" "));
    println!("Executing command: {}", full_command);
    
    let output = app.shell()
        .command("netsh")
        .args(args)
        .output()
        .await
        .map_err(|e| {
            println!("Command execution failed: {}", e);
            FirewallError::CommandError(format!("Failed to execute command: {}", e))
        })?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    if !output.status.success() {
        println!("Command failed with exit code: {:?}", output.status.code());
        println!("Command stdout: {}", stdout);
        println!("Command stderr: {}", stderr);
        return Err(FirewallError::CommandError(format!("Command failed: {}", stderr)));
    }
    
    println!("Command executed successfully");
    if !stdout.trim().is_empty() {
        println!("Command output: {}", stdout);
    }
    
    Ok(stdout)
}

// Helper function to run general shell commands (like ping) and display their output
pub async fn run_shell_command(app: &AppHandle, command: &str, args: Vec<&str>) -> Result<String, FirewallError> {
    // Log the command being executed for debugging
    let full_command = format!("{} {}", command, args.join(" "));
    println!("[SHELL] Executing command: {}", full_command);
    
    let output = app.shell()
        .command(command)
        .args(args)
        .output()
        .await
        .map_err(|e| {
            println!("[SHELL] Command execution failed: {}", e);
            FirewallError::CommandError(format!("Failed to execute command: {}", e))
        })?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    println!("[SHELL] Command exit code: {:?}", output.status.code());
    
    // Always show command output for debugging - both stdout and stderr
    if !stdout.trim().is_empty() {
        println!("[SHELL] Command stdout:\n{}", stdout);
    }
    
    if !stderr.trim().is_empty() {
        println!("[SHELL] Command stderr:\n{}", stderr);
    }
    
    // Return the stdout even if the command doesn't succeed
    // (like ping to non-existent host), we still want to see the output
    Ok(stdout)
}