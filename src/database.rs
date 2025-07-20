use sqlx::{Pool, Sqlite, SqlitePool, Row};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackedService {
    pub id: i64,
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub category: String,
    pub enabled: bool,
    pub auto_start: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub service_name: String,
    pub config_key: String,
    pub config_value: String,
    pub config_type: String, // string, number, boolean, json
}

pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new() -> Result<Self, sqlx::Error> {
        log::info!("🗄️ Initializing database connection");
        
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("dev-services-manager");
        
        log::debug!("📁 Data directory: {:?}", data_dir);
        
        // Create directory if it doesn't exist
        match std::fs::create_dir_all(&data_dir) {
            Ok(_) => log::debug!("✅ Data directory created/verified"),
            Err(e) => {
                log::error!("❌ Failed to create data directory: {}", e);
                return Err(sqlx::Error::Configuration(format!("Failed to create data directory: {}", e).into()));
            }
        }
        
        let db_path = data_dir.join("services.db");
        let database_url = format!("sqlite://{}?mode=rwc", db_path.display());
        
        log::debug!("🔗 Database URL: {}", database_url);
        
        let pool = match SqlitePool::connect(&database_url).await {
            Ok(pool) => {
                log::info!("✅ Database connection pool created successfully");
                pool
            }
            Err(e) => {
                log::error!("❌ Failed to create database connection pool: {}", e);
                return Err(e);
            }
        };
        
        let db = Database { pool };
        
        log::info!("🔄 Running database migrations");
        match db.run_migrations().await {
            Ok(_) => log::info!("✅ Database migrations completed successfully"),
            Err(e) => {
                log::error!("❌ Database migration failed: {}", e);
                return Err(e);
            }
        }
        
        log::info!("✅ Database initialization completed");
        Ok(db)
    }
    
    async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        log::debug!("🔄 Creating tracked_services table");
        
        // Create tracked_services table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tracked_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL DEFAULT 'Other',
                enabled BOOLEAN NOT NULL DEFAULT 1,
                auto_start BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&self.pool)
        .await?;
        
        log::debug!("🔄 Creating service_configs table");
        
        // Create service_configs table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS service_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_name TEXT NOT NULL,
                config_key TEXT NOT NULL,
                config_value TEXT NOT NULL,
                config_type TEXT NOT NULL DEFAULT 'string',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(service_name, config_key),
                FOREIGN KEY(service_name) REFERENCES tracked_services(name)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;
        
        log::debug!("🔄 Creating database indexes");
        
        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_tracked_services_category ON tracked_services(category)")
            .execute(&self.pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_tracked_services_enabled ON tracked_services(enabled)")
            .execute(&self.pool)
            .await?;
        
        log::debug!("✅ Database migrations completed");
        Ok(())
    }
    
    pub async fn add_tracked_service(
        &self,
        name: &str,
        display_name: &str,
        description: Option<&str>,
        category: &str,
    ) -> Result<TrackedService, sqlx::Error> {
        log::info!("➕ Adding service to tracking: {} ({})", display_name, name);
        log::debug!("📝 Service details - category: {}, description: {:?}", category, description);
        
        let now = Utc::now();
        
        let row = sqlx::query(
            r#"
            INSERT INTO tracked_services (name, display_name, description, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(name)
        .bind(display_name)
        .bind(description)
        .bind(category)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .fetch_one(&self.pool)
        .await?;
        
        let service = TrackedService {
            id: row.get("id"),
            name: row.get("name"),
            display_name: row.get("display_name"),
            description: row.get("description"),
            category: row.get("category"),
            enabled: row.get("enabled"),
            auto_start: row.get("auto_start"),
            created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .unwrap()
                .with_timezone(&Utc),
        };
        
        log::info!("✅ Service added to tracking with ID: {}", service.id);
        Ok(service)
    }
    
    pub async fn remove_tracked_service(&self, name: &str) -> Result<(), sqlx::Error> {
        log::info!("🗑️ Removing service from tracking: {}", name);
        
        // First remove associated configs
        log::debug!("🗑️ Removing associated configs for service: {}", name);
        sqlx::query("DELETE FROM service_configs WHERE service_name = ?")
            .bind(name)
            .execute(&self.pool)
            .await?;
        
        // Then remove the service
        log::debug!("🗑️ Removing service from tracked_services: {}", name);
        sqlx::query("DELETE FROM tracked_services WHERE name = ?")
            .bind(name)
            .execute(&self.pool)
            .await?;
        
        log::info!("✅ Service removed from tracking: {}", name);
        Ok(())
    }
    
    pub async fn get_tracked_services(&self) -> Result<Vec<TrackedService>, sqlx::Error> {
        log::debug!("📋 Getting all tracked services");
        
        let rows = sqlx::query("SELECT * FROM tracked_services ORDER BY display_name")
            .fetch_all(&self.pool)
            .await?;
        
        let services: Vec<TrackedService> = rows
            .into_iter()
            .map(|row| TrackedService {
                id: row.get("id"),
                name: row.get("name"),
                display_name: row.get("display_name"),
                description: row.get("description"),
                category: row.get("category"),
                enabled: row.get("enabled"),
                auto_start: row.get("auto_start"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            })
            .collect();
        
        log::debug!("✅ Retrieved {} tracked services", services.len());
        Ok(services)
    }
    
    pub async fn is_service_tracked(&self, name: &str) -> Result<bool, sqlx::Error> {
        log::debug!("🔍 Checking if service is tracked: {}", name);
        
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tracked_services WHERE name = ?")
            .bind(name)
            .fetch_one(&self.pool)
            .await?;
        
        let tracked = count > 0;
        log::debug!("{} Service {} is {}", 
            if tracked { "✅" } else { "❌" }, 
            name, 
            if tracked { "tracked" } else { "not tracked" }
        );
        
        Ok(tracked)
    }
    
    pub async fn update_service_enabled(&self, name: &str, enabled: bool) -> Result<(), sqlx::Error> {
        log::info!("🔄 Updating service enabled status: {} -> {}", name, enabled);
        
        let now = Utc::now();
        
        sqlx::query("UPDATE tracked_services SET enabled = ?, updated_at = ? WHERE name = ?")
            .bind(enabled)
            .bind(now.to_rfc3339())
            .bind(name)
            .execute(&self.pool)
            .await?;
        
        log::info!("✅ Service enabled status updated: {} = {}", name, enabled);
        Ok(())
    }
    
    pub async fn set_service_config(
        &self,
        service_name: &str,
        config_key: &str,
        config_value: &str,
        config_type: &str,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO service_configs (service_name, config_key, config_value, config_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(service_name, config_key) DO UPDATE SET
                config_value = excluded.config_value,
                config_type = excluded.config_type,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(service_name)
        .bind(config_key)
        .bind(config_value)
        .bind(config_type)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    pub async fn get_service_configs(&self, service_name: &str) -> Result<Vec<ServiceConfig>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT service_name, config_key, config_value, config_type FROM service_configs WHERE service_name = ?"
        )
        .bind(service_name)
        .fetch_all(&self.pool)
        .await?;
        
        let configs = rows
            .into_iter()
            .map(|row| ServiceConfig {
                service_name: row.get("service_name"),
                config_key: row.get("config_key"),
                config_value: row.get("config_value"),
                config_type: row.get("config_type"),
            })
            .collect();
        
        Ok(configs)
    }
}