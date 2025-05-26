use tauri::{
    tray::{TrayIconBuilder, TrayIcon},
    AppHandle, Manager, WindowEvent, Emitter
};

use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

// Tray state management
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TrayState {
    Active,
    Passive,
    Disabled,
}

impl Default for TrayState {
    fn default() -> Self {
        TrayState::Disabled
    }
}

pub struct TrayManager {
    pub icon: Option<TrayIcon>,
    pub state: TrayState,
    pub is_toggling: bool,
}

impl std::fmt::Debug for TrayManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TrayManager")
            .field("icon", &self.icon.is_some())
            .field("state", &self.state)
            .field("is_toggling", &self.is_toggling)
            .finish()
    }
}

impl Default for TrayManager {
    fn default() -> Self {
        Self {
            icon: None,
            state: TrayState::default(),
            is_toggling: false,
        }
    }
}

// Static variable to store the tray manager
static TRAY_MANAGER: Lazy<Mutex<TrayManager>> = Lazy::new(|| Mutex::new(TrayManager::default()));

pub fn cleanup_tray() {
    let needs_delay = {
        let mut tray_guard = TRAY_MANAGER.lock().unwrap();
        let has_tray = tray_guard.icon.is_some();
        if let Some(tray) = tray_guard.icon.take() {
            // Properly destroy the tray icon
            println!("🧹 Destroying existing tray icon");
            drop(tray);
        }
        tray_guard.state = TrayState::Disabled;
        tray_guard.is_toggling = false;
        has_tray
    }; // Release the lock here
    
    if needs_delay {
        // Longer delay to ensure the system processes the tray icon removal completely
        println!("⏳ Waiting for system to process tray icon removal...");
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
    
    println!("🧹 Tray cleanup completed");
}

pub fn create_tray(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    create_tray_with_state(app_handle, TrayState::Active)
}

pub fn create_tray_with_state(app_handle: &AppHandle, initial_state: TrayState) -> Result<(), Box<dyn std::error::Error>> {
    // Always cleanup existing tray before creating new one to prevent multiple icons
    println!("🔧 About to cleanup existing tray before creating new state: {:?}", initial_state);
    cleanup_tray();
    println!("🔧 Creating new tray icon with state: {:?}", initial_state);
      // Get state info for menu creation
    let (status_text, tooltip_text) = match initial_state {
        TrayState::Active => ("✅ System Status: Active", "🛡️ Security Smile Security Monitor - Active"),
        TrayState::Passive => ("💤 System Status: Passive", "🛡️ Security Smile Security Monitor - Passive"),
        TrayState::Disabled => ("📴 System Status: Disabled", "🛡️ Security Smile Security Monitor - Disabled"),
    };
    
    // Create the menu items
    let show_app = tauri::menu::MenuItem::with_id(app_handle, "show", "🔍 Show Security Smile", true, None::<&str>)?;
    let hide_app = tauri::menu::MenuItem::with_id(app_handle, "hide", "📥 Hide to Tray", true, None::<&str>)?;
    let separator1 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
    let status = tauri::menu::MenuItem::with_id(app_handle, "status", status_text, false, None::<&str>)?;
    let toggle_state = tauri::menu::MenuItem::with_id(app_handle, "toggle_state", "🔄 Toggle Status", true, None::<&str>)?;
    let separator2 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
    let about = tauri::menu::MenuItem::with_id(app_handle, "about", "ℹ️ About Security Smile", true, None::<&str>)?;
    let quit = tauri::menu::MenuItem::with_id(app_handle, "quit", "❌ Quit", true, None::<&str>)?;

    // Create a comprehensive menu
    let menu = tauri::menu::Menu::with_items(app_handle, &[
        &show_app,
        &hide_app,
        &separator1,
        &status,
        &toggle_state,
        &separator2,
        &about,
        &quit,
    ])?;    // Create the tray icon with enhanced functionality
    let app_handle_clone = app_handle.clone();
    let tray = TrayIconBuilder::new()
        .icon(app_handle.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip(tooltip_text)
        .on_menu_event(move |app_handle, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                        println!("Window restored from tray");
                    }
                },
                "hide" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                        // Emit event to React component
                        let _ = app_handle.emit("tray-event", "hide");
                        println!("Window minimized to tray");
                    }
                },                "toggle_state" => {
                    println!("🔄 Toggle state requested from tray menu");
                    
                    // Clone the app handle to avoid borrowing issues
                    let app_handle_clone = app_handle.clone();
                    
                    // Spawn async task to handle the toggle to avoid blocking the menu event
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(50)); // Small delay
                        match toggle_tray_state(&app_handle_clone) {
                            Ok(new_state) => {
                                println!("✅ Successfully toggled tray state to: {:?}", new_state);
                            },
                            Err(e) => {
                                println!("❌ Failed to toggle tray state: {}", e);
                            }
                        }
                    });
                },
                "about" => {
                    // Show an about message
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = app_handle.emit("show-about", ());
                    }
                },
                "quit" => {
                    println!("Quitting application from tray");
                    app_handle.exit(0);
                },
                _ => {}
            }
        }).on_tray_icon_event(|tray, event| {
            match event {
                tauri::tray::TrayIconEvent::Click { 
                    id: _,
                    button: tauri::tray::MouseButton::Left,
                    button_state: _,
                    rect: _,
                    position: _,
                } => {
                    println!("Tray icon left-clicked");
                    // Left click shows/hides the main window
                    let app_handle = tray.app_handle();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        match window.is_visible() {
                            Ok(true) => {
                                let _ = window.hide();
                                let _ = app_handle.emit("tray-event", "hide");
                            },
                            _ => {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.unminimize();
                            }
                        }
                    }
                },
                tauri::tray::TrayIconEvent::DoubleClick { 
                    id: _,
                    button: tauri::tray::MouseButton::Left,
                    rect: _,
                    position: _,
                } => {
                    println!("Tray icon double-clicked");
                    // Double click always shows the window
                    let app_handle = tray.app_handle();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                },
                _ => {}
            }
        })        .build(app_handle)?;
    
    // Store the tray reference and state in our manager
    let mut tray_guard = TRAY_MANAGER.lock().unwrap();
    tray_guard.icon = Some(tray);
    tray_guard.state = initial_state.clone();
    
    // Release the lock before setting up window events
    drop(tray_guard);
    
    println!("✅ Tray icon created successfully with state: {:?}", initial_state);
    
    // Emit state change event to frontend
    let _ = app_handle.emit("tray-state-changed", initial_state.clone());
    
    // Set up window close event handler
    if let Some(window) = app_handle_clone.get_webview_window("main") {
        // Use a cloned handle for the window event handler
        let app_handle_for_event = app_handle_clone.clone();
        
        window.on_window_event(move |event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // Prevent the window from actually closing
                    api.prevent_close();
                    // Instead, hide the window and keep the app running in the background
                    if let Some(window) = app_handle_for_event.get_webview_window("main") {
                        let _ = window.hide();
                        let _ = app_handle_for_event.emit("tray-event", "hide");
                        println!("Window closed - minimized to tray instead");
                    }
                },
                _ => {}
            }
        });
    }
    
    Ok(())
}

// Function to toggle tray state
pub fn toggle_tray_state(app_handle: &AppHandle) -> Result<TrayState, Box<dyn std::error::Error>> {
    println!("🔄 Toggle tray state requested");
    
    // Check if we're already toggling to prevent race conditions
    {
        let mut tray_guard = TRAY_MANAGER.lock().unwrap();
        if tray_guard.is_toggling {
            println!("⚠️ Tray toggle already in progress, ignoring request");
            return Ok(tray_guard.state.clone());
        }
        tray_guard.is_toggling = true;
        println!("🔒 Set is_toggling flag to true");
    }
    
    let current_state = {
        let tray_guard = TRAY_MANAGER.lock().unwrap();
        tray_guard.state.clone()
    };
    
    let new_state = match current_state {
        TrayState::Active => TrayState::Passive,
        TrayState::Passive => TrayState::Active,
        TrayState::Disabled => TrayState::Active, // If disabled, activate it
    };
      println!("🔄 Toggling tray state from {:?} to {:?}", current_state, new_state);
    
    // Try to update tray in place first (more reliable than recreating)
    let result = match update_tray_state_in_place(app_handle, new_state.clone()) {
        Ok(_) => {
            println!("✅ Successfully updated tray state in place to: {:?}", new_state);
            Ok(new_state)
        },
        Err(e) => {
            println!("⚠️ In-place update failed, falling back to recreation: {}", e);
            // Fallback to recreation if in-place update fails
            match create_tray_with_state(app_handle, new_state.clone()) {
                Ok(_) => {
                    println!("✅ Successfully recreated tray with new state: {:?}", new_state);
                    
                    // Emit state change event to frontend
                    let _ = app_handle.emit("tray-state-changed", new_state.clone());
                    println!("📡 Emitted tray-state-changed event with state: {:?}", new_state);
                    
                    Ok(new_state)
                },
                Err(e) => {
                    println!("❌ Failed to recreate tray with new state: {}", e);
                    Err(e)
                }
            }
        }
    };
    
    // Reset the toggling flag
    {
        let mut tray_guard = TRAY_MANAGER.lock().unwrap();
        tray_guard.is_toggling = false;
        println!("🔓 Reset is_toggling flag to false");
    }
    
    result
}

// Function to set specific tray state
pub fn set_tray_state(app_handle: &AppHandle, state: TrayState) -> Result<(), Box<dyn std::error::Error>> {
    println!("Setting tray state to: {:?}", state);
    create_tray_with_state(app_handle, state.clone())?;
    let _ = app_handle.emit("tray-state-changed", state);
    Ok(())
}

// Function to get current tray state
pub fn get_tray_state() -> TrayState {
    let tray_guard = TRAY_MANAGER.lock().unwrap();
    tray_guard.state.clone()
}

// Function to check if tray is active
pub fn is_tray_active() -> bool {
    let tray_guard = TRAY_MANAGER.lock().unwrap();
    tray_guard.icon.is_some()
}

// Function to update tray tooltip (useful for showing status)
pub fn update_tray_tooltip(message: &str) -> Result<(), String> {
    let tray_guard = TRAY_MANAGER.lock().unwrap();
    if let Some(tray) = tray_guard.icon.as_ref() {
        tray.set_tooltip(Some(message)).map_err(|e| e.to_string())?;
        println!("Updated tray tooltip: {}", message);
        Ok(())
    } else {
        Err("Tray icon not initialized".to_string())
    }
}

// Function to update existing tray in place (more reliable than recreating)
pub fn update_tray_state_in_place(app_handle: &AppHandle, new_state: TrayState) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔄 Updating tray state in place to: {:?}", new_state);
    
    let mut tray_guard = TRAY_MANAGER.lock().unwrap();
    
    if let Some(tray) = tray_guard.icon.as_ref() {
        // Get state info for menu and tooltip updates
        let (status_text, tooltip_text) = match new_state {
        TrayState::Active => ("✅ System Status: Active", "🛡️ Security Smile Security Monitor - Active"),
        TrayState::Passive => ("💤 System Status: Passive", "🛡️ Security Smile Security Monitor - Passive"),
        TrayState::Disabled => ("📴 System Status: Disabled", "🛡️ Security Smile Security Monitor - Disabled"),
        };
        
        // Update tooltip
        let _ = tray.set_tooltip(Some(tooltip_text));
        
        // Create updated menu
        let show_app = tauri::menu::MenuItem::with_id(app_handle, "show", "🔍 Show Security Smile", true, None::<&str>)?;
        let hide_app = tauri::menu::MenuItem::with_id(app_handle, "hide", "📥 Hide to Tray", true, None::<&str>)?;
        let separator1 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
        let status = tauri::menu::MenuItem::with_id(app_handle, "status", status_text, false, None::<&str>)?;
        let toggle_state = tauri::menu::MenuItem::with_id(app_handle, "toggle_state", "🔄 Toggle Status", true, None::<&str>)?;
        let separator2 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
        let about = tauri::menu::MenuItem::with_id(app_handle, "about", "ℹ️ About Security Smile", true, None::<&str>)?;
        let quit = tauri::menu::MenuItem::with_id(app_handle, "quit", "❌ Quit", true, None::<&str>)?;

        let menu = tauri::menu::Menu::with_items(app_handle, &[
            &show_app,
            &hide_app,
            &separator1,
            &status,
            &toggle_state,
            &separator2,
            &about,
            &quit,
        ])?;
        
        // Update the menu
        let _ = tray.set_menu(Some(menu));
        
        // Update the state
        tray_guard.state = new_state.clone();
        
        println!("✅ Updated tray state in place to: {:?}", new_state);
        
        // Emit state change event to frontend
        let _ = app_handle.emit("tray-state-changed", new_state.clone());
        
        Ok(())
    } else {
        // If no tray exists, create a new one
        drop(tray_guard);
        create_tray_with_state(app_handle, new_state)
    }
}
