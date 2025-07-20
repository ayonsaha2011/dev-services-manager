// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod services;
mod database;
mod events;

use services::*;
use database::Database;
use events::EventManager;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;

fn main() {
    // Initialize logging with more detailed configuration
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .format_module_path(false)
        .init();
    
    log::info!("🚀 Starting Dev Services Manager application");
    log::info!("📋 Version: {}", env!("CARGO_PKG_VERSION"));
    log::info!("🔧 Build target: {}", std::env::var("TARGET").unwrap_or_else(|_| "unknown".to_string()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_services,
            get_installed_services_count,
            get_service_status,
            start_service,
            stop_service,
            restart_service,
            enable_service,
            disable_service,
            get_service_logs,
            get_system_logs,
            start_multiple_services,
            stop_all_services,
            check_auth_required,
            start_service_with_auth,
            stop_service_with_auth,
            get_service_metrics,
            execute_terminal_command,
            get_current_directory,
            get_service_info,
            get_service_ports,
            remove_service,
            get_tracked_services,
            add_service_to_tracking,
            remove_service_from_tracking,
            is_service_tracked,
            update_service_tracking_status,
            get_all_system_services,
            set_service_config,
            get_service_configs
        ])
        .setup(|app| {
            log::info!("🔧 Setting up application components");
            
            // Initialize database
            let rt = tokio::runtime::Runtime::new().unwrap();
            let db = rt.block_on(async {
                log::info!("🗄️ Initializing database connection");
                match Database::new().await {
                    Ok(db) => {
                        log::info!("✅ Database initialized successfully");
                        db
                    }
                    Err(e) => {
                        log::error!("❌ Failed to initialize database: {}", e);
                        panic!("Database initialization failed: {}", e);
                    }
                }
            });
            
            let db_arc = Arc::new(Mutex::new(db));
            app.manage(db_arc.clone());
            log::info!("📦 Database instance managed in app state");
            
            // Initialize event manager and start monitoring
            log::info!("📡 Initializing event manager");
            let event_manager = EventManager::new(app.handle().clone(), db_arc);
            rt.spawn(async move {
                log::info!("🔄 Starting service monitoring background task");
                event_manager.start_monitoring().await;
            });
            
            log::info!("✅ Dev Services Manager setup completed successfully");
            log::info!("🎯 Application ready to handle requests");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}