use tauri::{
    menu,
    tray::TrayIconBuilder,
    AppHandle, Manager, Window, WindowEvent, Emitter
};

pub fn create_tray(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Create the menu items (show/hide app and quit)
    let show_app = tauri::menu::MenuItem::with_id(app_handle, "show", "Show App", true, None::<&str>)?;
    let hide_app = tauri::menu::MenuItem::with_id(app_handle, "hide", "Hide to Tray", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app_handle)?;
    let quit = tauri::menu::MenuItem::with_id(app_handle, "quit", "Quit", true, None::<&str>)?;
    
    // Create a simple menu
    let menu = tauri::menu::Menu::with_items(app_handle, &[
        &show_app,
        &hide_app,
        &separator,
        &quit,
    ])?;    // Create the tray icon with basic functionality
    let app_handle_clone = app_handle.clone();
    let tray = TrayIconBuilder::new()
        .icon(app_handle.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("HackAttack")
        .on_menu_event(move |app_handle, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                },                "hide" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                        // Emit event to React component
                        let _ = app_handle.emit("tray-event", "hide");
                    }
                },
                "quit" => {
                    app_handle.exit(0);
                },
                _ => {}
            }
        })
        .build(app_handle)
        .expect("Failed to create tray icon");
    
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
                    }
                },
                _ => {}
            }
        });
    }
    
    Ok(())
}
