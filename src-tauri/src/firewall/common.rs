// common.rs - Shared types and utilities for the firewall
use std::sync::{Arc, Mutex};
use std::fmt;
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;

// Custom error type for firewall operations
#[derive(Debug)]
pub enum FirewallError {
    CommandError(String),
    ParseError(String),
    AdminRequired(String),
}

// Implement Display trait for FirewallError
impl fmt::Display for FirewallError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FirewallError::CommandError(msg) => write!(f, "Command Error: {}", msg),
            FirewallError::ParseError(msg) => write!(f, "Parse Error: {}", msg),
            FirewallError::AdminRequired(msg) => write!(f, "Admin Required: {}", msg),
        }
    }
}

// Structure to hold a single firewall rule
#[derive(Debug, Clone, Serialize, Deserialize)]
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

// State for managing firewall rules
pub struct FirewallState {
    pub rules: Arc<Mutex<Vec<FirewallRuleInfo>>>,
}

impl Default for FirewallState {
    fn default() -> Self {
        FirewallState {
            rules: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

// State for managing blocked domains
pub struct BlockedDomains {
    pub domains: Arc<Mutex<Vec<String>>>,
}

impl Default for BlockedDomains {
    fn default() -> Self {
        BlockedDomains {
            domains: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

// Structure to hold notification settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub domain_blocked_delay_seconds: u64,
    pub cooldown_seconds: u64,
    pub enabled: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        NotificationSettings {
            domain_blocked_delay_seconds: 2, // Default 2 seconds delay
            cooldown_seconds: 30, // 30 seconds between same domain notifications
            enabled: true,
        }
    }
}

// State for managing notification settings
pub struct NotificationState {
    pub settings: Arc<Mutex<NotificationSettings>>,
}

impl Default for NotificationState {
    fn default() -> Self {
        NotificationState {
            settings: Arc::new(Mutex::new(NotificationSettings::default())),
        }
    }
}

// Function to run netsh commands
pub async fn run_netsh_command(app: &AppHandle, args: Vec<&str>) -> Result<String, FirewallError> {
    // Display the command being run
    println!("[NETSH] Running: netsh {}", args.join(" "));

    let output = app.shell()
        .command("netsh")
        .args(args)
        .output()
        .await
        .map_err(|e| FirewallError::CommandError(e.to_string()))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    if !output.status.success() {
        let err_msg = if !stderr.trim().is_empty() {
            format!("Command failed: {}", stderr.trim())
        } else if !stdout.trim().is_empty() {
            format!("Command failed (no stderr): {}", stdout.trim())
        } else {
            "Command failed: Unknown error (no output)".to_string()
        };
        return Err(FirewallError::CommandError(err_msg));
    }
    
    Ok(stdout)
}

// Function to run shell commands
pub async fn run_shell_command(app: &AppHandle, cmd: &str, args: Vec<&str>) -> Result<String, String> {
    let output = app.shell()
        .command(cmd)
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Command execution failed: {}", e))?;
    
    // Simple response processing
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        println!("[SHELL] Command exit code: {:?}", output.status.code());
        println!("[SHELL] Command stdout: {}", stdout);
        if !stderr.is_empty() {
            println!("[SHELL] Command stderr: {}", stderr);
        }
        return Err(format!("Command failed with exit code: {:?}", output.status.code()));
    }
    
    Ok(stdout)
}

// Function to run a PowerShell command as administrator with a single UAC prompt
pub async fn run_elevated_powershell(app: &AppHandle, script: &str) -> Result<String, String> {
    // Create a temporary PowerShell script file
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }
    
    let script_path = app_data_dir.join("firewall_commands.ps1");
    
    // Write the script content
    fs::write(&script_path, format!(
        "# Firewall commands script\n{}\n\nWrite-Host \"Commands executed successfully.\"",
        script
    ))
    .map_err(|e| format!("Failed to write script file: {}", e))?;
      // Command to run the script with elevation and hidden window
    let powershell_command = format!(
        "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -WindowStyle Hidden -File \"{}\"' -Verb RunAs -Wait -WindowStyle Hidden",
        script_path.to_string_lossy().replace("\\", "\\\\")
    );
    
    println!("Running elevated PowerShell: {}", powershell_command);
      // Run the elevation command with hidden window
    let output = app.shell()
        .command("powershell")
        .args(["-WindowStyle", "Hidden", "-Command", &powershell_command])
        .output()
        .await
        .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;
    
    // Clean up the script file
    let _ = fs::remove_file(script_path);
    
    // Check execution result
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        println!("[POWERSHELL] Command exit code: {:?}", output.status.code());
        println!("[POWERSHELL] Command stderr: {}", stderr);
        return Err(format!("PowerShell execution failed: {}", stderr));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    println!("[POWERSHELL] Command stdout: {}", stdout);
    
    Ok(stdout)
}

// Function to run elevated netsh commands
pub async fn run_elevated_netsh_command(app: &AppHandle, args: Vec<&str>) -> Result<String, FirewallError> {
    let netsh_cmd = format!("netsh {}", args.join(" "));
    let script = format!("{};", netsh_cmd);
    println!("[ELEVATED NETSH] Running: {}", netsh_cmd);

    match run_elevated_powershell(app, &script).await {
        Ok(stdout) => Ok(stdout),
        Err(e) => {
            let err_msg = format!("Elevated netsh command failed: {}\nCommand: {}", e, netsh_cmd);
            println!("[ELEVATED NETSH] Error: {}", err_msg);
            Err(FirewallError::CommandError(err_msg))
        }
    }
}

// Function to check if elevated permissions are required and elevate if needed
pub fn elevate_at_startup() {
    // This can be expanded as needed for your application
    println!("Checking if elevated permissions are needed...");
}