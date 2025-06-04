use std::sync::{Arc, Mutex};
use std::fmt;
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use serde::{Serialize, Deserialize};
use std::fs;

#[derive(Debug)]
pub enum FirewallError {
    CommandError(String),
    ParseError(String),
    AdminRequired(String),
}

impl fmt::Display for FirewallError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FirewallError::CommandError(msg) => write!(f, "Command Error: {}", msg),
            FirewallError::ParseError(msg) => write!(f, "Parse Error: {}", msg),
            FirewallError::AdminRequired(msg) => write!(f, "Admin Required: {}", msg),
        }
    }
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub domain_blocked_delay_seconds: u64,
    pub cooldown_seconds: u64,
    pub enabled: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        NotificationSettings {
            domain_blocked_delay_seconds: 2,
            cooldown_seconds: 30,
            enabled: true,
        }
    }
}

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
pub async fn run_netsh_command(app: &AppHandle, args: Vec<&str>) -> Result<String, FirewallError> {
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

pub async fn run_shell_command(app: &AppHandle, cmd: &str, args: Vec<&str>) -> Result<String, String> {
    let output = app.shell()
        .command(cmd)
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Command execution failed: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
      if !output.status.success() {
        let _stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Command failed with exit code: {:?}", output.status.code()));
    }
    
    Ok(stdout)
}

pub async fn run_elevated_powershell(app: &AppHandle, script: &str) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }
    
    let script_path = app_data_dir.join("firewall_commands.ps1");
    
    fs::write(&script_path, format!(
        "# Firewall commands script\n{}\n\nWrite-Host \"Commands executed successfully.\"",
        script
    ))
    .map_err(|e| format!("Failed to write script file: {}", e))?;
    
    let powershell_command = format!(
        "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -WindowStyle Hidden -File \"{}\"' -Verb RunAs -Wait -WindowStyle Hidden",
        script_path.to_string_lossy().replace("\\", "\\\\")
    );
    
    let output = app.shell()
        .command("powershell")
        .args(["-WindowStyle", "Hidden", "-Command", &powershell_command])
        .output()
        .await
        .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;
    
    let _ = fs::remove_file(script_path);
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("PowerShell execution failed: {}", stderr));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

pub async fn run_elevated_netsh_command(app: &AppHandle, args: Vec<&str>) -> Result<String, FirewallError> {
    let netsh_cmd = format!("netsh {}", args.join(" "));
    let script = format!("{};", netsh_cmd);

    match run_elevated_powershell(app, &script).await {
        Ok(stdout) => Ok(stdout),
        Err(e) => {
            let err_msg = format!("Elevated netsh command failed: {}\nCommand: {}", e, netsh_cmd);
            Err(FirewallError::CommandError(err_msg))
        }
    }
}

pub fn elevate_at_startup() {
}