use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::time::{interval, Duration};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::database::Database;
use crate::services::{get_service_status_internal, ServiceStatus as ServiceStatusEnum};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServiceEvent {
    StatusChanged {
        service_name: String,
        old_status: String,
        new_status: String,
        timestamp: String,
    },
    ServiceAdded {
        service_name: String,
        status: String,
        timestamp: String,
    },
    ServiceRemoved {
        service_name: String,
        timestamp: String,
    },
    ServicesRefreshed {
        count: usize,
        timestamp: String,
    },
    DatabaseUpdated {
        operation: String,
        service_name: String,
        timestamp: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatusInfo {
    pub name: String,
    pub status: ServiceStatusEnum,
    pub enabled: bool,
    pub last_check: String,
}

pub struct EventManager {
    app_handle: AppHandle,
    database: Arc<Mutex<Database>>,
    last_known_statuses: Arc<Mutex<Vec<ServiceStatusInfo>>>,
}

impl EventManager {
    pub fn new(app_handle: AppHandle, database: Arc<Mutex<Database>>) -> Self {
        log::info!("📡 Creating new EventManager instance");
        Self {
            app_handle,
            database,
            last_known_statuses: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn start_monitoring(&self) {
        log::info!("🔄 Starting service monitoring system");
        
        let app_handle = self.app_handle.clone();
        let database = self.database.clone();
        let last_known_statuses = self.last_known_statuses.clone();

        tokio::spawn(async move {
            log::info!("🔄 Service monitoring background task started");
            let mut interval = interval(Duration::from_secs(5)); // Check every 5 seconds
            
            loop {
                interval.tick().await;
                
                if let Err(e) = Self::check_service_changes(
                    &app_handle,
                    &database,
                    &last_known_statuses,
                ).await {
                    log::error!("❌ Error checking service changes: {}", e);
                }
            }
        });

        log::info!("✅ Service monitoring started - checking every 5 seconds");
    }

    async fn check_service_changes(
        app_handle: &AppHandle,
        database: &Arc<Mutex<Database>>,
        last_known_statuses: &Arc<Mutex<Vec<ServiceStatusInfo>>>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::debug!("🔍 Checking for service status changes");
        
        // Get tracked services from database
        let tracked_services = {
            let db = database.lock().await;
            match db.get_tracked_services().await {
                Ok(services) => {
                    log::debug!("📋 Retrieved {} tracked services from database", services.len());
                    services
                }
                Err(e) => {
                    log::error!("❌ Failed to get tracked services from database: {}", e);
                    return Err(Box::new(e));
                }
            }
        };

        let mut current_statuses = Vec::new();
        let timestamp = chrono::Utc::now().to_rfc3339();

        // Check status for each tracked and enabled service
        let enabled_services: Vec<_> = tracked_services.iter().filter(|ts| ts.enabled).collect();
        log::debug!("🔍 Checking status for {} enabled tracked services", enabled_services.len());
        
        for tracked_service in enabled_services {
            log::debug!("🔍 Checking status for service: {}", tracked_service.name);
            
            match get_service_status_internal(&tracked_service.name).await {
                Ok(service) => {
                    log::debug!("✅ Service {} status: {:?}", service.name, service.status);
                    current_statuses.push(ServiceStatusInfo {
                        name: service.name.clone(),
                        status: service.status.clone(),
                        enabled: service.enabled,
                        last_check: timestamp.clone(),
                    });
                }
                Err(e) => {
                    log::warn!("⚠️ Failed to get status for service {}: {}", tracked_service.name, e);
                    // Add with unknown status
                    current_statuses.push(ServiceStatusInfo {
                        name: tracked_service.name.clone(),
                        status: ServiceStatusEnum::Unknown,
                        enabled: false,
                        last_check: timestamp.clone(),
                    });
                }
            }
        }

        // Compare with last known statuses
        let mut last_statuses = last_known_statuses.lock().await;
        log::debug!("🔄 Comparing {} current statuses with {} last known statuses", 
                   current_statuses.len(), last_statuses.len());
        
        for current in &current_statuses {
            if let Some(last) = last_statuses.iter().find(|s| s.name == current.name) {
                // Check if status changed
                if last.status != current.status {
                    log::info!("🔄 Service {} status changed: {:?} -> {:?}", 
                             current.name, last.status, current.status);
                    
                    let event = ServiceEvent::StatusChanged {
                        service_name: current.name.clone(),
                        old_status: format!("{:?}", last.status),
                        new_status: format!("{:?}", current.status),
                        timestamp: timestamp.clone(),
                    };
                    
                    if let Err(e) = app_handle.emit("service-event", &event) {
                        log::error!("❌ Failed to emit service status change event: {}", e);
                    } else {
                        log::debug!("📡 Emitted status change event for service: {}", current.name);
                    }
                }
            } else {
                // New service detected
                log::info!("🆕 New tracked service detected: {}", current.name);
                
                let event = ServiceEvent::ServiceAdded {
                    service_name: current.name.clone(),
                    status: format!("{:?}", current.status),
                    timestamp: timestamp.clone(),
                };
                
                if let Err(e) = app_handle.emit("service-event", &event) {
                    log::error!("❌ Failed to emit service added event: {}", e);
                } else {
                    log::debug!("📡 Emitted service added event for: {}", current.name);
                }
            }
        }

        // Check for removed services
        for last in last_statuses.iter() {
            if !current_statuses.iter().any(|s| s.name == last.name) {
                log::info!("🗑️ Service removed from tracking: {}", last.name);
                
                let event = ServiceEvent::ServiceRemoved {
                    service_name: last.name.clone(),
                    timestamp: timestamp.clone(),
                };
                
                if let Err(e) = app_handle.emit("service-event", &event) {
                    log::error!("❌ Failed to emit service removed event: {}", e);
                } else {
                    log::debug!("📡 Emitted service removed event for: {}", last.name);
                }
            }
        }

        // Update last known statuses
        *last_statuses = current_statuses;
        log::debug!("✅ Service status check completed successfully");

        Ok(())
    }
}