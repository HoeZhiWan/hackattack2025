use tauri::{
    tray::{TrayIconBuilder, TrayIcon},
    AppHandle, Manager, WindowEvent, Emitter
};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

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

static TRAY_MANAGER: Lazy<Mutex<TrayManager>> = Lazy::new(|| Mutex::new(TrayManager::default()));

pub fn cleanup_tray() {
    let needs_delay = {
        let mut tray_guard = TRAY_MANAGER.lock().unwrap();
        let has_tray = tray_guard.icon.is_some();        if let Some(tray) = tray_guard.icon.take() {
            drop(tray);
        }
        tray_guard.state = TrayState::Disabled;
        tray_guard.is_toggling = false;
        has_tray
    };
      if needs_delay {
        std::thread::sleep(std::time::Duration::from_millis(250));    }
}

pub fn create_tray(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    create_tray_with_state(app_handle, TrayState::Active)
}

pub fn create_tray_with_state(app_handle: &AppHandle, initial_state: TrayState) -> Result<(), Box<dyn std::error::Error>> {
    cleanup_tray();

    let (status_text, tooltip_text) = match initial_state {
        TrayState::Active => ("✅ System Status: Active", "🛡️ Security Smile Security Monitor - Active"),
        TrayState::Passive => ("💤 System Status: Passive", "🛡️ Security Smile Security Monitor - Passive"),
        TrayState::Disabled => ("📴 System Status: Disabled", "🛡️ Security Smile Security Monitor - Disabled"),
    };
    
    let show_app = tauri::menu::MenuItem::with_id(app_handle, "show", "🔍 Show Security Smile", true, None::<&str>)?;
    let hide_app = tauri::menu::MenuItem::with_id(app_handle, "hide", "📥 Hide to Tray", true, None::<&str>)?;
    let separator1 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
    let status = tauri::menu::MenuItem::with_id(app_handle, "status", status_text, false, None::<&str>)?;
    let toggle_state = tauri::menu::MenuItem::with_id(app_handle, "toggle_state", "🔄 Toggle Status", true, None::<&str>)?;
    let separator2 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
    let about = tauri::menu::MenuItem::with_id(app_handle, "about", "ℹ️ About Security Smile", true, None::<&str>)?;
    let quit = tauri::menu::MenuItem::with_id(app_handle, "quit", "❌ Quit", true, None::<&str>)?;

    let menu = tauri::menu::Menu::with_items(app_handle, &[
        &show_app, &hide_app, &separator1, &status, &toggle_state, &separator2, &about, &quit,
    ])?;

    let app_handle_clone = app_handle.clone();
    let tray = TrayIconBuilder::new()
        .icon(app_handle.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip(tooltip_text)
        .on_menu_event(move |app_handle, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app_handle.get_webview_window("main") {                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                },
                "hide" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                        let _ = app_handle.emit("tray-event", "hide");
                    }
                },                "toggle_state" => {
                    let app_handle_clone = app_handle.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(50));
                        let _ = toggle_tray_state(&app_handle_clone);
                    });
                },
                "about" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = app_handle.emit("show-about", ());
                    }
                },                "quit" => {
                    app_handle.exit(0);
                },
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            match event {                tauri::tray::TrayIconEvent::Click { 
                    button: tauri::tray::MouseButton::Left, .. 
                } => {
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
                },                tauri::tray::TrayIconEvent::DoubleClick { 
                    button: tauri::tray::MouseButton::Left, .. 
                } => {
                    let app_handle = tray.app_handle();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                },
                _ => {}
            }
        })
        .build(app_handle)?;
    
    let mut tray_guard = TRAY_MANAGER.lock().unwrap();
    tray_guard.icon = Some(tray);
    tray_guard.state = initial_state.clone();    drop(tray_guard);
    
    let _ = app_handle.emit("tray-state-changed", initial_state.clone());
    
    if let Some(window) = app_handle_clone.get_webview_window("main") {
        let app_handle_for_event = app_handle_clone.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();                if let Some(window) = app_handle_for_event.get_webview_window("main") {
                    let _ = window.hide();
                    let _ = app_handle_for_event.emit("tray-event", "hide");
                }
            }
        });
    }
    
    Ok(())
}

pub fn toggle_tray_state(app_handle: &AppHandle) -> Result<TrayState, Box<dyn std::error::Error>> {
    {
        let mut tray_guard = TRAY_MANAGER.lock().unwrap();
        if tray_guard.is_toggling {
            return Ok(tray_guard.state.clone());
        }
        tray_guard.is_toggling = true;
    }
    
    let current_state = {
        let tray_guard = TRAY_MANAGER.lock().unwrap();
        tray_guard.state.clone()
    };
    
    let new_state = match current_state {
        TrayState::Active => TrayState::Passive,
        TrayState::Passive => TrayState::Active,        TrayState::Disabled => TrayState::Active,
    };    let result = match update_tray_state_in_place(app_handle, new_state.clone()) {
        Ok(_) => Ok(new_state),
        Err(_) => {
            match create_tray_with_state(app_handle, new_state.clone()) {
                Ok(_) => {
                    let _ = app_handle.emit("tray-state-changed", new_state.clone());
                    Ok(new_state)
                },
                Err(e) => Err(e)
            }
        }
    };
    
    {
        let mut tray_guard = TRAY_MANAGER.lock().unwrap();
        tray_guard.is_toggling = false;
    }
    
    result
}

pub fn set_tray_state(app_handle: &AppHandle, state: TrayState) -> Result<(), Box<dyn std::error::Error>> {
    create_tray_with_state(app_handle, state.clone())?;
    let _ = app_handle.emit("tray-state-changed", state);
    Ok(())
}

pub fn get_tray_state() -> TrayState {
    let tray_guard = TRAY_MANAGER.lock().unwrap();
    tray_guard.state.clone()
}

pub fn is_tray_active() -> bool {
    let tray_guard = TRAY_MANAGER.lock().unwrap();
    tray_guard.icon.is_some()
}

pub fn update_tray_tooltip(message: &str) -> Result<(), String> {
    let tray_guard = TRAY_MANAGER.lock().unwrap();
    if let Some(tray) = tray_guard.icon.as_ref() {
        tray.set_tooltip(Some(message)).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Tray icon not initialized".to_string())
    }
}

pub fn update_tray_state_in_place(app_handle: &AppHandle, new_state: TrayState) -> Result<(), Box<dyn std::error::Error>> {
    let mut tray_guard = TRAY_MANAGER.lock().unwrap();
    
    if let Some(tray) = tray_guard.icon.as_ref() {
        let (status_text, tooltip_text) = match new_state {
            TrayState::Active => ("✅ System Status: Active", "🛡️ Security Smile Security Monitor - Active"),
            TrayState::Passive => ("💤 System Status: Passive", "🛡️ Security Smile Security Monitor - Passive"),
            TrayState::Disabled => ("📴 System Status: Disabled", "🛡️ Security Smile Security Monitor - Disabled"),
        };
        
        let _ = tray.set_tooltip(Some(tooltip_text));
        
        let show_app = tauri::menu::MenuItem::with_id(app_handle, "show", "🔍 Show Security Smile", true, None::<&str>)?;
        let hide_app = tauri::menu::MenuItem::with_id(app_handle, "hide", "📥 Hide to Tray", true, None::<&str>)?;
        let separator1 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
        let status = tauri::menu::MenuItem::with_id(app_handle, "status", status_text, false, None::<&str>)?;
        let toggle_state = tauri::menu::MenuItem::with_id(app_handle, "toggle_state", "🔄 Toggle Status", true, None::<&str>)?;
        let separator2 = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
        let about = tauri::menu::MenuItem::with_id(app_handle, "about", "ℹ️ About Security Smile", true, None::<&str>)?;
        let quit = tauri::menu::MenuItem::with_id(app_handle, "quit", "❌ Quit", true, None::<&str>)?;

        let menu = tauri::menu::Menu::with_items(app_handle, &[
            &show_app, &hide_app, &separator1, &status, &toggle_state, &separator2, &about, &quit,
        ])?;
          let _ = tray.set_menu(Some(menu));
        tray_guard.state = new_state.clone();
        
        let _ = app_handle.emit("tray-state-changed", new_state.clone());
        
        Ok(())
    } else {
        drop(tray_guard);
        create_tray_with_state(app_handle, new_state)
    }
}
