use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::io::Write;
use chrono::{DateTime, Utc};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Service {
    pub name: String,
    pub service_name: String,
    pub status: ServiceStatus,
    pub enabled: bool,
    pub uptime: Option<String>,
    pub last_started: Option<DateTime<Utc>>,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ServiceStatus {
    Running,
    Stopped,
    Failed,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceLogs {
    pub service_name: String,
    pub logs: Vec<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemLogs {
    pub service_name: String,
    pub system_logs: Vec<String>,
    pub kernel_logs: Vec<String>,
    pub boot_logs: Vec<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceOperation {
    pub success: bool,
    pub message: String,
    pub service: Option<Service>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub service_name: String,
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub memory_total: u64,
    pub network_in: u64,
    pub network_out: u64,
    pub disk_read: u64,
    pub disk_write: u64,
    pub process_count: u32,
    pub open_files: u32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalCommand {
    pub command: String,
    pub output: String,
    pub exit_code: i32,
    pub timestamp: DateTime<Utc>,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalSession {
    pub commands: Vec<TerminalCommand>,
    pub current_directory: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthRequest {
    pub requires_auth: bool,
    pub message: String,
}

// Define available services - Now dynamically discovered from system
fn get_service_definitions() -> Vec<(String, String, u32)> {
    // This function is now deprecated in favor of dynamic discovery
    // Keeping empty for backward compatibility
    vec![]
}

fn get_service_descriptions() -> HashMap<String, String> {
    // This function is now deprecated in favor of dynamic discovery
    // Keeping empty for backward compatibility
    let descriptions = HashMap::new();
    descriptions
}

fn check_service_status(service_name: &str) -> Result<ServiceStatus> {
    log::debug!("🔍 Checking status for service: {}", service_name);
    
    let output = Command::new("systemctl")
        .args(&["is-active", service_name])
        .output()?;

    let status = match output.stdout.as_slice() {
        b"active\n" => {
            log::debug!("✅ Service {} is running", service_name);
            ServiceStatus::Running
        },
        b"inactive\n" => {
            log::debug!("⏹️ Service {} is stopped", service_name);
            ServiceStatus::Stopped
        },
        b"failed\n" => {
            log::warn!("❌ Service {} has failed", service_name);
            ServiceStatus::Failed
        },
        _ => {
            log::warn!("❓ Service {} status unknown", service_name);
            ServiceStatus::Unknown
        },
    };
    
    Ok(status)
}

fn check_service_enabled(service_name: &str) -> bool {
    log::debug!("🔍 Checking if service {} is enabled", service_name);
    
    let result = Command::new("systemctl")
        .args(&["is-enabled", service_name])
        .output();
    
    match result {
        Ok(output) => {
            let enabled = output.status.success();
            log::debug!("{} Service {} is {}", 
                if enabled { "✅" } else { "❌" }, 
                service_name, 
                if enabled { "enabled" } else { "disabled" }
            );
            enabled
        }
        Err(e) => {
            log::warn!("⚠️ Failed to check if service {} is enabled: {}", service_name, e);
            false
        }
    }
}

fn execute_sudo_command(args: &[&str], password: Option<String>, is_sudo: bool) -> Result<std::process::Output, String> {
    let command_str = args.join(" ");
    log::debug!("🔧 Executing command: {}", command_str);
    
    if password.is_some() || is_sudo {
        let pwd = password.unwrap_or_default();
        log::debug!("🔐 Using password authentication for command");
        // Use sudo with password
        let mut child = Command::new("sudo")
            .arg("-S") // Read password from stdin
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                log::error!("❌ Failed to spawn sudo command: {}", e);
                format!("Failed to spawn sudo command: {}", e)
            })?;

        if let Some(stdin) = child.stdin.as_mut() {
            writeln!(stdin, "{}", pwd)
                .map_err(|e| {
                    log::error!("❌ Failed to write password: {}", e);
                    format!("Failed to write password: {}", e)
                })?;
        }

        let output = child.wait_with_output()
            .map_err(|e| {
                log::error!("❌ Failed to execute command: {}", e);
                format!("Failed to execute command: {}", e)
            })?;
            
        log::debug!("✅ Command executed successfully (exit code: {})", output.status);
        Ok(output)
    } else {
        log::debug!("👤 Trying user-level command first");
        // Try without sudo first for user services
        let user_result = Command::new("systemctl")
            .arg("--user")
            .args(&args[1..]) // Skip "systemctl" from args
            .output();

        match user_result {
            Ok(output) if output.status.success() => {
                log::debug!("✅ User-level command executed successfully");
                Ok(output)
            }
            _ => {
                log::warn!("⚠️ User-level command failed, authentication required for system service");
                Err("Authentication required for system service management".to_string())
            }
        }
    }
}

fn find_service_name(service_name: &str) -> Result<String, String> {
    log::debug!("🔍 Finding systemd service name for: {}", service_name);
    
    // For dynamic discovery, we assume the service name is already the systemd service name
    // or we append .service if it's not already there
    let systemd_service = if service_name.ends_with(".service") {
        service_name.to_string()
    } else {
        format!("{}.service", service_name)
    };
    
    log::debug!("🔍 Checking if service exists: {}", systemd_service);
    
    // Verify the service exists in the system
    if is_service_installed(&systemd_service) {
        log::debug!("✅ Service found: {}", systemd_service);
        Ok(systemd_service)
    } else {
        log::error!("❌ Service not found: {}", systemd_service);
        Err(format!("Service '{}' not found in system", service_name))
    }
}

fn is_service_installed(service_name: &str) -> bool {
    log::debug!("🔍 Checking if service is installed: {}", service_name);
    
    // Check if service file exists
    let output = Command::new("systemctl")
        .args(&["list-unit-files", service_name])
        .output();
    
    match output {
        Ok(result) => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            let installed = stdout.contains(service_name) && !stdout.contains("0 unit files listed");
            log::debug!("{} Service {} is {}", 
                if installed { "✅" } else { "❌" }, 
                service_name, 
                if installed { "installed" } else { "not installed" }
            );
            installed
        }
        Err(e) => {
            log::warn!("⚠️ Failed to check if service {} is installed: {}", service_name, e);
            false
        }
    }
}

fn get_service_uptime(service_name: &str) -> Option<String> {
    log::debug!("⏱️ Getting uptime for service: {}", service_name);
    
    let output = Command::new("systemctl")
        .args(&["show", service_name, "-p", "ActiveEnterTimestamp", "--value"])
        .output()
        .ok()?;

    let timestamp_str = String::from_utf8(output.stdout).ok()?;
    if timestamp_str.trim().is_empty() || timestamp_str.trim() == "n/a" {
        log::debug!("⏱️ No uptime data available for service: {}", service_name);
        return None;
    }

    log::debug!("⏱️ Service {} uptime: {}", service_name, timestamp_str.trim());
    Some(timestamp_str.trim().to_string())
}

#[tauri::command]
pub async fn get_services(limit: Option<u32>, show_all: Option<bool>) -> Result<Vec<Service>, String> {
    log::info!("📋 Getting services list (limit: {:?}, show_all: {:?})", limit, show_all);
    
    // Get all system services dynamically
    let all_system_services = get_all_system_services().await?;
    log::debug!("🔍 Found {} total system services", all_system_services.len());
    
    let mut services = Vec::new();

    // Convert to Service objects
    for service_json in all_system_services {
        if let (Some(name), Some(service_name), Some(status_str), Some(enabled)) = (
            service_json.get("name").and_then(|v| v.as_str()),
            service_json.get("service_name").and_then(|v| v.as_str()),
            service_json.get("status").and_then(|v| v.as_str()),
            service_json.get("enabled").and_then(|v| v.as_bool())
        ) {
            let status = match status_str {
                "enabled" | "static" => ServiceStatus::Stopped, // Most static services are stopped by default
                "disabled" => ServiceStatus::Stopped,
                _ => ServiceStatus::Unknown,
            };

            let description = service_json.get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("System service")
                .to_string();

            services.push(Service {
                name: name.to_string(),
                service_name: service_name.to_string(),
                status,
                enabled,
                uptime: None,
                last_started: None,
                description,
            });
        }
    }

    // Sort by name for consistency
    services.sort_by(|a, b| a.name.cmp(&b.name));

    // Apply limit if not showing all
    let should_show_all = show_all.unwrap_or(false);
    let service_limit = if should_show_all { 
        services.len() 
    } else { 
        limit.unwrap_or(6) as usize 
    };

    let result_services: Vec<Service> = services.into_iter().take(service_limit).collect();
    log::info!("✅ Returning {} services", result_services.len());
    
    Ok(result_services)
}

#[tauri::command]
pub async fn get_installed_services_count() -> Result<u32, String> {
    let all_system_services = get_all_system_services().await?;
    Ok(all_system_services.len() as u32)
}

// Internal function for use by event system
pub async fn get_service_status_internal(service_name: &str) -> Result<Service, String> {
    let systemd_service = find_service_name(service_name)?;

    let status = check_service_status(&systemd_service)
        .map_err(|e| format!("Failed to check status: {}", e))?;
    let enabled = check_service_enabled(&systemd_service);
    let uptime = get_service_uptime(&systemd_service);
    
    // Generate description based on service name
    let description = generate_service_description(service_name);

    Ok(Service {
        name: service_name.to_string(),
        service_name: systemd_service.clone(),
        status,
        enabled,
        uptime,
        last_started: None,
        description,
    })
}

// Helper function to get service information from systemd
fn get_service_info_from_systemd(service_name: &str) -> Option<String> {
    // Try to get service description from systemd
    let output = Command::new("systemctl")
        .args(&["show", service_name, "--property=Description", "--value"])
        .output()
        .ok()?;

    if output.status.success() {
        let description = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !description.is_empty() && description != "n/a" {
            return Some(description);
        }
    }
    
    None
}

// Helper function to generate service descriptions dynamically
fn generate_service_description(service_name: &str) -> String {
    // First try to get description from systemd
    if let Some(systemd_desc) = get_service_info_from_systemd(&format!("{}.service", service_name)) {
        return systemd_desc;
    }
    
    // Fallback to pattern-based description
    let lower_name = service_name.to_lowercase();
    
    if lower_name.contains("db") || lower_name.contains("sql") || lower_name.contains("mysql") || lower_name.contains("postgres") {
        "Database service".to_string()
    } else if lower_name.contains("web") || lower_name.contains("http") || lower_name.contains("nginx") || lower_name.contains("apache") {
        "Web server".to_string()
    } else if lower_name.contains("cache") || lower_name.contains("redis") || lower_name.contains("memcache") {
        "Cache service".to_string()
    } else if lower_name.contains("mq") || lower_name.contains("queue") || lower_name.contains("kafka") || lower_name.contains("rabbit") {
        "Message queue service".to_string()
    } else if lower_name.contains("monitor") || lower_name.contains("metric") || lower_name.contains("prometheus") || lower_name.contains("grafana") {
        "Monitoring service".to_string()
    } else if lower_name.contains("backup") || lower_name.contains("sync") || lower_name.contains("rsync") {
        "Backup service".to_string()
    } else if lower_name.contains("vpn") || lower_name.contains("wireguard") || lower_name.contains("openvpn") {
        "VPN service".to_string()
    } else if lower_name.contains("dns") || lower_name.contains("bind") || lower_name.contains("unbound") {
        "DNS service".to_string()
    } else if lower_name.contains("dhcp") || lower_name.contains("network") {
        "Network service".to_string()
    } else if lower_name.contains("mail") || lower_name.contains("smtp") || lower_name.contains("imap") || lower_name.contains("pop") {
        "Mail service".to_string()
    } else if lower_name.contains("ftp") || lower_name.contains("sftp") || lower_name.contains("file") {
        "File transfer service".to_string()
    } else if lower_name.contains("print") || lower_name.contains("cups") {
        "Printing service".to_string()
    } else if lower_name.contains("bluetooth") || lower_name.contains("audio") || lower_name.contains("pulse") {
        "Audio/Bluetooth service".to_string()
    } else if lower_name.contains("ssh") || lower_name.contains("telnet") {
        "Remote access service".to_string()
    } else if lower_name.contains("cron") || lower_name.contains("at") || lower_name.contains("timer") {
        "Scheduling service".to_string()
    } else if lower_name.contains("log") || lower_name.contains("syslog") || lower_name.contains("journal") {
        "Logging service".to_string()
    } else if lower_name.contains("time") || lower_name.contains("ntp") || lower_name.contains("chrony") {
        "Time synchronization service".to_string()
    } else if lower_name.contains("firewall") || lower_name.contains("iptables") || lower_name.contains("ufw") {
        "Firewall service".to_string()
    } else if lower_name.contains("backup") || lower_name.contains("restore") {
        "Backup service".to_string()
    } else if lower_name.contains("update") || lower_name.contains("upgrade") || lower_name.contains("apt") {
        "Package management service".to_string()
    } else {
        format!("System service: {}", service_name)
    }
}

#[tauri::command]
pub async fn get_service_status(service_name: String) -> Result<Service, String> {
    get_service_status_internal(&service_name).await
}

#[tauri::command]
pub async fn start_service(service_name: String) -> Result<ServiceOperation, String> {
    log::info!("🚀 Starting service: {}", service_name);
    
    let systemd_service = match find_service_name(&service_name) {
        Ok(service) => {
            log::debug!("✅ Found systemd service: {}", service);
            service
        }
        Err(e) => {
            log::error!("❌ Failed to find service: {}", e);
            return Err(e);
        }
    };

    // Check if already running
    if let Ok(ServiceStatus::Running) = check_service_status(&systemd_service) {
        log::info!("ℹ️ Service {} is already running", service_name);
        return Ok(ServiceOperation {
            success: true,
            message: format!("{} is already running", service_name),
            service: None,
        });
    }

    log::debug!("🔧 Attempting to start service: {}", systemd_service);
    
    // Try user service first, fallback to system service with sudo
    let user_output = Command::new("systemctl")
        .args(&["--user", "start", &systemd_service])
        .output();
    
    let output = match user_output {
        Ok(out) if out.status.success() => {
            log::debug!("✅ User-level start command succeeded");
            out
        }
        _ => {
            log::debug!("⚠️ User-level start failed, trying with sudo");
            match Command::new("sudo")
                .args(&["systemctl", "start", &systemd_service])
                .output() {
                Ok(out) => out,
                Err(e) => {
                    log::error!("❌ Failed to execute start command: {}", e);
                    return Err(format!("Failed to execute command: {}", e));
                }
            }
        }
    };

    if output.status.success() {
        log::info!("✅ Service {} started successfully", service_name);
        
        // Get updated service info
        let service = match get_service_status(service_name.clone()).await {
            Ok(service) => service,
            Err(e) => {
                log::warn!("⚠️ Failed to get updated service status: {}", e);
                return Err(format!("Failed to get updated status: {}", e));
            }
        };

        Ok(ServiceOperation {
            success: true,
            message: format!("{} started successfully", service_name),
            service: Some(service),
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        log::error!("❌ Failed to start service {}: {}", service_name, error);
        Ok(ServiceOperation {
            success: false,
            message: format!("Failed to start {}: {}", service_name, error),
            service: None,
        })
    }
}

#[tauri::command]
pub async fn stop_service(service_name: String) -> Result<ServiceOperation, String> {
    let systemd_service = find_service_name(&service_name)?;

    // Check if already stopped
    if let Ok(ServiceStatus::Stopped) = check_service_status(&systemd_service) {
        return Ok(ServiceOperation {
            success: true,
            message: format!("{} is already stopped", service_name),
            service: None,
        });
    }

    let output = Command::new("sudo")
        .args(&["systemctl", "stop", &systemd_service])
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    if output.status.success() {
        let service = get_service_status(service_name.clone()).await
            .map_err(|e| format!("Failed to get updated status: {}", e))?;

        Ok(ServiceOperation {
            success: true,
            message: format!("{} stopped successfully", service_name),
            service: Some(service),
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Ok(ServiceOperation {
            success: false,
            message: format!("Failed to stop {}: {}", service_name, error),
            service: None,
        })
    }
}

#[tauri::command]
pub async fn restart_service(service_name: String) -> Result<ServiceOperation, String> {
    let systemd_service = find_service_name(&service_name)?;

    let output = Command::new("sudo")
        .args(&["systemctl", "restart", &systemd_service])
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    if output.status.success() {
        let service = get_service_status(service_name.clone()).await
            .map_err(|e| format!("Failed to get updated status: {}", e))?;

        Ok(ServiceOperation {
            success: true,
            message: format!("{} restarted successfully", service_name),
            service: Some(service),
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Ok(ServiceOperation {
            success: false,
            message: format!("Failed to restart {}: {}", service_name, error),
            service: None,
        })
    }
}

#[tauri::command]
pub async fn enable_service(service_name: String) -> Result<ServiceOperation, String> {
    let systemd_service = find_service_name(&service_name)?;

    let output = Command::new("sudo")
        .args(&["systemctl", "enable", &systemd_service])
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    if output.status.success() {
        let service = get_service_status(service_name.clone()).await
            .map_err(|e| format!("Failed to get updated status: {}", e))?;

        Ok(ServiceOperation {
            success: true,
            message: format!("{} enabled for auto-start", service_name),
            service: Some(service),
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Ok(ServiceOperation {
            success: false,
            message: format!("Failed to enable {}: {}", service_name, error),
            service: None,
        })
    }
}

#[tauri::command]
pub async fn disable_service(service_name: String) -> Result<ServiceOperation, String> {
    let systemd_service = find_service_name(&service_name)?;

    let output = Command::new("sudo")
        .args(&["systemctl", "disable", &systemd_service])
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    if output.status.success() {
        let service = get_service_status(service_name.clone()).await
            .map_err(|e| format!("Failed to get updated status: {}", e))?;

        Ok(ServiceOperation {
            success: true,
            message: format!("{} disabled from auto-start", service_name),
            service: Some(service),
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Ok(ServiceOperation {
            success: false,
            message: format!("Failed to disable {}: {}", service_name, error),
            service: None,
        })
    }
}

#[tauri::command]
pub async fn get_service_logs(service_name: String, lines: Option<u32>) -> Result<ServiceLogs, String> {
    let systemd_service = find_service_name(&service_name)?;

    let lines_arg = format!("{}", lines.unwrap_or(50));
    
    let output = Command::new("journalctl")
        .args(&["-u", &systemd_service, "--no-pager", "-n", &lines_arg, "--since", "1 hour ago"])
        .output()
        .map_err(|e| format!("Failed to get logs: {}", e))?;

    let logs_text = String::from_utf8_lossy(&output.stdout);
    let logs: Vec<String> = logs_text.lines().map(|s| s.to_string()).collect();

    Ok(ServiceLogs {
        service_name,
        logs,
        timestamp: Utc::now(),
    })
}

#[tauri::command]
pub async fn get_system_logs(service_name: String, lines: Option<u32>) -> Result<SystemLogs, String> {
    let systemd_service = find_service_name(&service_name)?;
    let lines_count = lines.unwrap_or(50);
    let lines_arg = format!("{}", lines_count);
    
    // Get system logs related to the service
    let system_logs_output = Command::new("journalctl")
        .args(&["--system", "-n", &lines_arg, "--since", "1 hour ago"])
        .output()
        .map_err(|e| format!("Failed to get system logs: {}", e))?;
    
    // Get kernel logs that might be related to the service
    let kernel_logs_output = Command::new("dmesg")
        .args(&["-T"])
        .output();
    
    // Get boot logs
    let boot_logs_output = Command::new("journalctl")
        .args(&["-b", "0", "-n", "100", "--no-pager"])
        .output();
    
    let system_logs_text = String::from_utf8_lossy(&system_logs_output.stdout);
    let system_logs: Vec<String> = system_logs_text
        .lines()
        .filter(|line| line.contains(&service_name) || line.contains(&systemd_service))
        .map(|s| s.to_string())
        .collect();
    
    let kernel_logs: Vec<String> = match kernel_logs_output {
        Ok(output) => {
            let kernel_logs_text = String::from_utf8_lossy(&output.stdout);
            kernel_logs_text
                .lines()
                .filter(|line| {
                    let lower_line = line.to_lowercase();
                    lower_line.contains(&service_name.to_lowercase()) || 
                    lower_line.contains("error") || 
                    lower_line.contains("warning") ||
                    lower_line.contains("fail")
                })
                .take(20) // Limit kernel logs to avoid noise
                .map(|s| s.to_string())
                .collect()
        }
        Err(_) => Vec::new(),
    };
    
    let boot_logs: Vec<String> = match boot_logs_output {
        Ok(output) => {
            let boot_logs_text = String::from_utf8_lossy(&output.stdout);
            boot_logs_text
                .lines()
                .filter(|line| line.contains(&service_name) || line.contains(&systemd_service))
                .take(10) // Limit boot logs
                .map(|s| s.to_string())
                .collect()
        }
        Err(_) => Vec::new(),
    };
    
    Ok(SystemLogs {
        service_name,
        system_logs,
        kernel_logs,
        boot_logs,
        timestamp: Utc::now(),
    })
}

#[tauri::command]
pub async fn start_multiple_services(service_names: Vec<String>) -> Result<Vec<ServiceOperation>, String> {
    let mut results = Vec::new();

    for service_name in service_names {
        let result = start_service(service_name).await;
        match result {
            Ok(operation) => results.push(operation),
            Err(e) => results.push(ServiceOperation {
                success: false,
                message: e,
                service: None,
            }),
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn stop_all_services() -> Result<Vec<ServiceOperation>, String> {
    let services = get_services(None, Some(true)).await?;
    let mut results = Vec::new();

    for service in services {
        if service.status == ServiceStatus::Running {
            let result = stop_service(service.name).await;
            match result {
                Ok(operation) => results.push(operation),
                Err(e) => results.push(ServiceOperation {
                    success: false,
                    message: e,
                    service: None,
                }),
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn check_auth_required(service_name: String) -> Result<AuthRequest, String> {
    let systemd_service = find_service_name(&service_name)?;

    // Try to check if we can manage this service without sudo
    let user_check = Command::new("systemctl")
        .args(&["--user", "is-active", &systemd_service])
        .output();

    match user_check {
        Ok(output) if output.status.success() => {
            Ok(AuthRequest {
                requires_auth: false,
                message: "Service can be managed without authentication".to_string(),
            })
        }
        _ => {
            Ok(AuthRequest {
                requires_auth: true,
                message: "Administrator privileges required to manage system services".to_string(),
            })
        }
    }
}

#[tauri::command]
pub async fn start_service_with_auth(service_name: String, password: Option<String>) -> Result<ServiceOperation, String> {
    let systemd_service = find_service_name(&service_name)?;

    // Check if already running
    if let Ok(ServiceStatus::Running) = check_service_status(&systemd_service) {
        return Ok(ServiceOperation {
            success: true,
            message: format!("{} is already running", service_name),
            service: None,
        });
    }

    let args = ["systemctl", "start", &systemd_service];
    let output = execute_sudo_command(&args, password, true)?;

    if output.status.success() {
        let service = get_service_status(service_name.clone()).await
            .map_err(|e| format!("Failed to get updated status: {}", e))?;

        Ok(ServiceOperation {
            success: true,
            message: format!("{} started successfully", service_name),
            service: Some(service),
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Ok(ServiceOperation {
            success: false,
            message: format!("Failed to start {}: {}", service_name, error),
            service: None,
        })
    }
}

#[tauri::command]
pub async fn stop_service_with_auth(service_name: String, password: Option<String>) -> Result<ServiceOperation, String> {
    let systemd_service = find_service_name(&service_name)?;

    let args = ["systemctl", "stop", &systemd_service];
    let output = execute_sudo_command(&args, password, true)?;

    if output.status.success() {
        let service = get_service_status(service_name.clone()).await
            .map_err(|e| format!("Failed to get updated status: {}", e))?;

        Ok(ServiceOperation {
            success: true,
            message: format!("{} stopped successfully", service_name),
            service: Some(service),
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Ok(ServiceOperation {
            success: false,
            message: format!("Failed to stop {}: {}", service_name, error),
            service: None,
        })
    }
}

#[tauri::command]
pub async fn get_service_metrics(service_name: String) -> Result<SystemMetrics, String> {
    let systemd_service = find_service_name(&service_name)?;
    
    // Get CPU and memory usage for the service and all its child processes
    let mut cpu_usage = 0.0;
    let mut memory_usage = 0;
    let mut process_count = 0;
    let mut open_files = 0;
    let mut network_in = 0;
    let mut network_out = 0;
    let mut disk_read = 0;
    let mut disk_write = 0;
    
    // Get all PIDs for the service (including child processes)
    let mut all_pids = Vec::new();
    
    // Get main PID
    let pid_output = Command::new("systemctl")
        .args(&["show", "--property=MainPID", &systemd_service])
        .output()
        .map_err(|e| format!("Failed to get service PID: {}", e))?;
    
    if let Ok(pid_str) = String::from_utf8(pid_output.stdout) {
        for line in pid_str.lines() {
            if line.starts_with("MainPID=") {
                if let Ok(pid) = line.replace("MainPID=", "").parse::<u32>() {
                    if pid > 0 {
                        all_pids.push(pid);
                    }
                }
            }
        }
    }
    
    // Get cgroup PIDs for more comprehensive tracking
    if let Ok(cgroup_output) = Command::new("systemctl")
        .args(&["show", "--property=ControlGroup", &systemd_service])
        .output()
    {
        if let Ok(cgroup_str) = String::from_utf8(cgroup_output.stdout) {
            for line in cgroup_str.lines() {
                if line.starts_with("ControlGroup=") {
                    let cgroup_path = line.replace("ControlGroup=", "");
                    if !cgroup_path.is_empty() && cgroup_path != "/" {
                        // Try to get PIDs from cgroup
                        let cgroup_procs_path = format!("/sys/fs/cgroup{}/cgroup.procs", cgroup_path);
                        if let Ok(procs_content) = std::fs::read_to_string(&cgroup_procs_path) {
                            for pid_line in procs_content.lines() {
                                if let Ok(pid) = pid_line.trim().parse::<u32>() {
                                    if pid > 0 && !all_pids.contains(&pid) {
                                        all_pids.push(pid);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // If no PIDs found, try alternative method
    if all_pids.is_empty() {
        if let Ok(pgrep_output) = Command::new("pgrep")
            .args(&["-f", &service_name])
            .output()
        {
            if let Ok(pgrep_str) = String::from_utf8(pgrep_output.stdout) {
                for pid_line in pgrep_str.lines() {
                    if let Ok(pid) = pid_line.trim().parse::<u32>() {
                        if pid > 0 {
                            all_pids.push(pid);
                        }
                    }
                }
            }
        }
    }
    
    // Aggregate metrics from all PIDs
    for pid in &all_pids {
        // Get CPU and memory from ps
        if let Ok(ps_output) = Command::new("ps")
            .args(&["-p", &pid.to_string(), "-o", "pcpu,rss,nlwp"])
            .output()
        {
            if let Ok(ps_str) = String::from_utf8(ps_output.stdout) {
                let lines: Vec<&str> = ps_str.lines().collect();
                if lines.len() > 1 {
                    let fields: Vec<&str> = lines[1].split_whitespace().collect();
                    if fields.len() >= 3 {
                        cpu_usage += fields[0].parse::<f32>().unwrap_or(0.0);
                        memory_usage += fields[1].parse::<u64>().unwrap_or(0) * 1024; // RSS is in KB
                        process_count += fields[2].parse::<u32>().unwrap_or(0);
                    }
                }
            }
        }
        
        // Get open files count
        if let Ok(lsof_output) = Command::new("lsof")
            .args(&["-p", &pid.to_string()])
            .output()
        {
            if let Ok(lsof_str) = String::from_utf8(lsof_output.stdout) {
                open_files += lsof_str.lines().count().saturating_sub(1) as u32; // Subtract header line
            }
        }
        
        // Get network stats for this PID
        let proc_net_path = format!("/proc/{}/net/dev", pid);
        if let Ok(net_content) = std::fs::read_to_string(&proc_net_path) {
            for line in net_content.lines().skip(2) {
                let fields: Vec<&str> = line.split_whitespace().collect();
                if fields.len() >= 10 && !fields[0].starts_with("lo:") {
                    network_in += fields[1].parse::<u64>().unwrap_or(0);
                    network_out += fields[9].parse::<u64>().unwrap_or(0);
                }
            }
        }
        
        // Get disk I/O stats for this PID
        let proc_io_path = format!("/proc/{}/io", pid);
        if let Ok(io_content) = std::fs::read_to_string(&proc_io_path) {
            for line in io_content.lines() {
                if line.starts_with("read_bytes: ") {
                    disk_read += line.replace("read_bytes: ", "").parse::<u64>().unwrap_or(0);
                } else if line.starts_with("write_bytes: ") {
                    disk_write += line.replace("write_bytes: ", "").parse::<u64>().unwrap_or(0);
                }
            }
        }
    }
    
    // Get system memory total for percentage calculation
    let mut memory_total = 0;
    if let Ok(meminfo) = std::fs::read_to_string("/proc/meminfo") {
        for line in meminfo.lines() {
            if line.starts_with("MemTotal:") {
                if let Some(kb_str) = line.split_whitespace().nth(1) {
                    if let Ok(kb) = kb_str.parse::<u64>() {
                        memory_total = kb * 1024; // Convert KB to bytes
                        break;
                    }
                }
            }
        }
    }
    
    Ok(SystemMetrics {
        service_name,
        cpu_usage,
        memory_usage,
        memory_total,
        network_in,
        network_out,
        disk_read,
        disk_write,
        process_count,
        open_files,
        timestamp: Utc::now(),
    })
}

#[tauri::command]
pub async fn execute_terminal_command(command: String, working_dir: Option<String>) -> Result<TerminalCommand, String> {
    log::info!("💻 Executing terminal command: {}", command);
    log::debug!("📁 Working directory: {:?}", working_dir);
    
    let start_time = std::time::Instant::now();
    let timestamp = Utc::now();
    
    // Parse command into parts
    let parts: Vec<&str> = command.trim().split_whitespace().collect();
    if parts.is_empty() {
        log::warn!("⚠️ Empty command received");
        return Err("Empty command".to_string());
    }
    
    log::debug!("🔧 Command parts: {:?}", parts);
    
    let mut cmd = Command::new(parts[0]);
    if parts.len() > 1 {
        cmd.args(&parts[1..]);
    }
    
    // Set working directory if provided
    if let Some(dir) = working_dir {
        log::debug!("📁 Setting working directory: {}", dir);
        cmd.current_dir(dir);
    }
    
    // Execute command
    log::debug!("🚀 Executing command with output capture");
    let output = match cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output() {
        Ok(output) => {
            log::debug!("✅ Command executed successfully (exit code: {})", 
                       output.status.code().unwrap_or(-1));
            output
        }
        Err(e) => {
            log::error!("❌ Failed to execute command: {}", e);
            return Err(format!("Failed to execute command: {}", e));
        }
    };
    
    let duration = start_time.elapsed();
    log::debug!("⏱️ Command execution time: {:?}", duration);
    
    // Combine stdout and stderr
    let mut combined_output = String::from_utf8_lossy(&output.stdout).to_string();
    if !output.stderr.is_empty() {
        if !combined_output.is_empty() {
            combined_output.push('\n');
        }
        combined_output.push_str(&String::from_utf8_lossy(&output.stderr));
    }
    
    let output_length = combined_output.len();
    log::debug!("📄 Command output length: {} characters", output_length);
    
    let result = TerminalCommand {
        command,
        output: combined_output,
        exit_code: output.status.code().unwrap_or(-1),
        timestamp,
        duration_ms: duration.as_millis() as u64,
    };
    
    log::info!("✅ Terminal command completed in {}ms", result.duration_ms);
    Ok(result)
}

#[tauri::command]
pub async fn get_current_directory() -> Result<String, String> {
    Ok(std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub async fn get_service_info(service_name: String) -> Result<serde_json::Value, String> {
    let systemd_service = find_service_name(&service_name)?;
    
    // Try to get version information from the service
    let mut info = serde_json::json!({
        "name": service_name,
        "systemd_service": systemd_service
    });
    
    // Try to get version from common commands
    let version_commands = vec![
        format!("{} --version", service_name),
        format!("{} -v", service_name),
        format!("{} version", service_name),
    ];
    
    for cmd in version_commands {
        if let Ok(output) = Command::new("sh")
            .arg("-c")
            .arg(&cmd)
            .output()
        {
            if output.status.success() {
                let version_output = String::from_utf8_lossy(&output.stdout);
                if !version_output.trim().is_empty() {
                    // Extract version number from output
                    if let Some(version_line) = version_output.lines().next() {
                        info["version"] = serde_json::Value::String(version_line.trim().to_string());
                        break;
                    }
                }
            }
        }
    }
    
    Ok(info)
}

#[tauri::command]
pub async fn get_service_ports(service_name: String) -> Result<Vec<String>, String> {
    let mut ports = Vec::new();
    
    // Try to find ports using netstat and lsof
    let commands = vec![
        format!("netstat -tulpn | grep {}", service_name),
        format!("lsof -i -P | grep {}", service_name),
        format!("ss -tulpn | grep {}", service_name),
    ];
    
    for cmd in commands {
        if let Ok(output) = Command::new("sh")
            .arg("-c")
            .arg(&cmd)
            .output()
        {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                for line in output_str.lines() {
                    // Extract port numbers from the output using simple string parsing
                    if let Some(colon_pos) = line.find(':') {
                        let after_colon = &line[colon_pos + 1..];
                        if let Some(space_pos) = after_colon.find(' ') {
                            let port_str = &after_colon[..space_pos];
                            if let Ok(_) = port_str.parse::<u16>() {
                                let port = port_str.to_string();
                                if !ports.contains(&port) {
                                    ports.push(port);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Limit to first 10 ports to avoid overwhelming the UI
    ports.truncate(10);
    Ok(ports)
}





#[tauri::command]
pub async fn remove_service(service_name: String, password: String) -> Result<String, String> {
    // Validate service name for security
    if !service_name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err("Invalid service name".to_string());
    }

    // First stop the service if it's running
    let _ = tokio::process::Command::new("sudo")
        .args(&["-S", "systemctl", "stop", &service_name])
        .stdin(std::process::Stdio::piped())
        .output()
        .await;

    // Disable the service
    let _ = tokio::process::Command::new("sudo")
        .args(&["-S", "systemctl", "disable", &service_name])
        .stdin(std::process::Stdio::piped())
        .output()
        .await;

    // Remove the package
    let mut cmd = tokio::process::Command::new("sudo");
    cmd.args(&["-S", "apt", "remove", "--purge", "-y", &service_name]);
    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to start removal: {}", e))?;

    // Send password to sudo
    if let Some(stdin) = child.stdin.as_mut() {
        use tokio::io::AsyncWriteExt;
        stdin.write_all(password.as_bytes()).await
            .map_err(|e| format!("Failed to write password: {}", e))?;
        stdin.write_all(b"\n").await
            .map_err(|e| format!("Failed to write newline: {}", e))?;
    }

    let output = child.wait_with_output().await
        .map_err(|e| format!("Failed to wait for removal: {}", e))?;

    if output.status.success() {
        Ok(format!("Successfully removed {}", service_name))
    } else {
        Err(format!("Removal failed: {}", 
            String::from_utf8_lossy(&output.stderr)))
    }
}



fn get_service_category(service_name: &str) -> &'static str {
    let lower_name = service_name.to_lowercase();
    
    // Web Servers & Proxies
    if lower_name.contains("nginx") || lower_name.contains("apache") || lower_name.contains("httpd") || 
       lower_name.contains("lighttpd") || lower_name.contains("caddy") || lower_name.contains("traefik") ||
       lower_name.contains("haproxy") || lower_name.contains("envoy") || lower_name.contains("kong") ||
       lower_name.contains("openresty") || lower_name.contains("cherokee") {
        return "Web Server";
    }
    
    // Database Services
    if lower_name.contains("mysql") || lower_name.contains("postgresql") || lower_name.contains("mariadb") || 
       lower_name.contains("sqlite") || lower_name.contains("oracle") || lower_name.contains("sqlserver") ||
       lower_name.contains("cockroachdb") || lower_name.contains("timescaledb") || lower_name.contains("clickhouse") {
        return "Database";
    }
    
    // NoSQL Databases
    if lower_name.contains("mongodb") || lower_name.contains("cassandra") || lower_name.contains("couchdb") ||
       lower_name.contains("neo4j") || lower_name.contains("redis") || lower_name.contains("memcached") ||
       lower_name.contains("hazelcast") || lower_name.contains("ignite") {
        return "NoSQL Database";
    }
    
    // Cache Services
    if lower_name.contains("cache") || lower_name.contains("redis") || lower_name.contains("memcache") ||
       lower_name.contains("hazelcast") || lower_name.contains("ignite") {
        return "Cache";
    }
    
    // Container & Orchestration
    if lower_name.contains("docker") || lower_name.contains("containerd") || lower_name.contains("kubernetes") ||
       lower_name.contains("rancher") || lower_name.contains("nomad") || lower_name.contains("mesos") ||
       lower_name.contains("swarm") || lower_name.contains("podman") || lower_name.contains("buildah") ||
       lower_name.contains("skopeo") || lower_name.contains("cri-o") {
        return "Container";
    }
    
    // Message Brokers & Queues
    if lower_name.contains("kafka") || lower_name.contains("rabbitmq") || lower_name.contains("activemq") ||
       lower_name.contains("artemis") || lower_name.contains("pulsar") || lower_name.contains("nats") ||
       lower_name.contains("mosquitto") || lower_name.contains("emqx") || lower_name.contains("vernemq") ||
       lower_name.contains("mq") || lower_name.contains("queue") {
        return "Message Broker";
    }
    
    // Monitoring & Observability
    if lower_name.contains("prometheus") || lower_name.contains("grafana") || lower_name.contains("jaeger") ||
       lower_name.contains("zipkin") || lower_name.contains("datadog") || lower_name.contains("newrelic") ||
       lower_name.contains("splunk") || lower_name.contains("logstash") || lower_name.contains("filebeat") ||
       lower_name.contains("metricbeat") || lower_name.contains("packetbeat") || lower_name.contains("heartbeat") ||
       lower_name.contains("monitor") || lower_name.contains("metric") {
        return "Monitoring";
    }
    
    // CI/CD & Development
    if lower_name.contains("jenkins") || lower_name.contains("gitlab") || lower_name.contains("github-runner") ||
       lower_name.contains("teamcity") || lower_name.contains("bamboo") || lower_name.contains("drone") ||
       lower_name.contains("concourse") || lower_name.contains("gocd") || lower_name.contains("spinnaker") ||
       lower_name.contains("argocd") || lower_name.contains("tekton") {
        return "CI/CD";
    }
    
    // Security & Identity
    if lower_name.contains("keycloak") || lower_name.contains("ldap") || lower_name.contains("kerberos") ||
       lower_name.contains("saml") || lower_name.contains("oauth") || lower_name.contains("cert-manager") ||
       lower_name.contains("letsencrypt") || lower_name.contains("fail2ban") || lower_name.contains("clamav") ||
       lower_name.contains("snort") || lower_name.contains("vault") {
        return "Security";
    }
    
    // Network & Communication
    if lower_name.contains("openvpn") || lower_name.contains("wireguard") || lower_name.contains("strongswan") ||
       lower_name.contains("freeradius") || lower_name.contains("dnsmasq") || lower_name.contains("bind9") ||
       lower_name.contains("unbound") || lower_name.contains("dhcpd") || lower_name.contains("ntpd") ||
       lower_name.contains("chronyd") || lower_name.contains("dns") || lower_name.contains("vpn") {
        return "Network";
    }
    
    // Storage & Backup
    if lower_name.contains("minio") || lower_name.contains("ceph") || lower_name.contains("glusterfs") ||
       lower_name.contains("nfs") || lower_name.contains("samba") || lower_name.contains("rsync") ||
       lower_name.contains("duplicati") || lower_name.contains("restic") || lower_name.contains("borg") ||
       lower_name.contains("rclone") || lower_name.contains("backup") || lower_name.contains("sync") {
        return "Storage";
    }
    
    // Search & Analytics
    if lower_name.contains("elasticsearch") || lower_name.contains("solr") || lower_name.contains("opensearch") ||
       lower_name.contains("meilisearch") || lower_name.contains("typesense") || lower_name.contains("algolia") ||
       lower_name.contains("sphinx") || lower_name.contains("lucene") || lower_name.contains("kibana") ||
       lower_name.contains("search") {
        return "Search";
    }
    
    // Runtime & Application Servers
    if lower_name.contains("tomcat") || lower_name.contains("jetty") || lower_name.contains("wildfly") ||
       lower_name.contains("glassfish") || lower_name.contains("weblogic") || lower_name.contains("websphere") ||
       lower_name.contains("jboss") || lower_name.contains("spring") || lower_name.contains("django") ||
       lower_name.contains("rails") || lower_name.contains("nodejs") || lower_name.contains("node") {
        return "Runtime";
    }
    
    // Queue & Stream Processing
    if lower_name.contains("storm") || lower_name.contains("flink") || lower_name.contains("spark") ||
       lower_name.contains("beam") || lower_name.contains("heron") || lower_name.contains("samza") ||
       lower_name.contains("flume") || lower_name.contains("sqoop") || lower_name.contains("oozie") ||
       lower_name.contains("airflow") || lower_name.contains("hive") {
        return "Stream Processing";
    }
    
    // Machine Learning & AI
    if lower_name.contains("tensorflow") || lower_name.contains("pytorch") || lower_name.contains("jupyter") ||
       lower_name.contains("mlflow") || lower_name.contains("kubeflow") || lower_name.contains("tensorboard") ||
       lower_name.contains("wandb") || lower_name.contains("dvc") || lower_name.contains("polyaxon") ||
       lower_name.contains("sagemaker") || lower_name.contains("ai") || lower_name.contains("ml") {
        return "Machine Learning";
    }
    
    // Media & Content
    if lower_name.contains("ffmpeg") || lower_name.contains("gstreamer") || lower_name.contains("vlc") ||
       lower_name.contains("plex") || lower_name.contains("emby") || lower_name.contains("jellyfin") ||
       lower_name.contains("kodi") || lower_name.contains("sonarr") || lower_name.contains("radarr") ||
       lower_name.contains("lidarr") || lower_name.contains("media") {
        return "Media";
    }
    
    // Development Tools
    if lower_name.contains("vscode") || lower_name.contains("intellij") || lower_name.contains("eclipse") ||
       lower_name.contains("atom") || lower_name.contains("sublime") || lower_name.contains("vim") ||
       lower_name.contains("emacs") || lower_name.contains("neovim") || lower_name.contains("helix") ||
       lower_name.contains("kakoune") || lower_name.contains("editor") || lower_name.contains("ide") {
        return "Development Tools";
    }
    
    // System Services
    if lower_name.contains("cron") || lower_name.contains("systemd") || lower_name.contains("udev") ||
       lower_name.contains("dbus") || lower_name.contains("avahi") || lower_name.contains("cups") ||
       lower_name.contains("bluetooth") || lower_name.contains("wifi") || lower_name.contains("network") ||
       lower_name.contains("firewall") || lower_name.contains("ssh") || lower_name.contains("telnet") ||
       lower_name.contains("ftp") || lower_name.contains("sftp") || lower_name.contains("rsyslog") ||
       lower_name.contains("syslog") || lower_name.contains("logrotate") || lower_name.contains("anacron") ||
       lower_name.contains("atd") || lower_name.contains("systemd-timesyncd") || lower_name.contains("time") ||
       lower_name.contains("ntp") || lower_name.contains("chrony") || lower_name.contains("log") ||
       lower_name.contains("print") || lower_name.contains("audio") || lower_name.contains("pulse") ||
       lower_name.contains("mail") || lower_name.contains("smtp") || lower_name.contains("imap") ||
       lower_name.contains("pop") || lower_name.contains("update") || lower_name.contains("upgrade") ||
       lower_name.contains("apt") || lower_name.contains("package") {
        return "System";
    }
    
    // Version Control
    if lower_name.contains("git") {
        return "Version Control";
    }
    
    // Programming Languages
    if lower_name.contains("python") || lower_name.contains("ruby") || lower_name.contains("php") ||
       lower_name.contains("java") || lower_name.contains("go") || lower_name.contains("rust") ||
       lower_name.contains("c++") || lower_name.contains("c#") || lower_name.contains("dotnet") {
        return "Programming Language";
    }
    
    // Default category
    "Other"
}

// Database-related commands
use crate::database::{Database, TrackedService};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;

#[tauri::command]
pub async fn get_tracked_services(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<TrackedService>, String> {
    let db = db.lock().await;
    db.get_tracked_services()
        .await
        .map_err(|e| format!("Failed to get tracked services: {}", e))
}

#[tauri::command]
pub async fn add_service_to_tracking(
    db: State<'_, Arc<Mutex<Database>>>,
    name: String,
    display_name: String,
    description: Option<String>,
    category: String,
) -> Result<TrackedService, String> {
    let db = db.lock().await;
    db.add_tracked_service(&name, &display_name, description.as_deref(), &category)
        .await
        .map_err(|e| format!("Failed to add service to tracking: {}", e))
}

#[tauri::command]
pub async fn remove_service_from_tracking(
    db: State<'_, Arc<Mutex<Database>>>,
    name: String,
) -> Result<(), String> {
    let db = db.lock().await;
    db.remove_tracked_service(&name)
        .await
        .map_err(|e| format!("Failed to remove service from tracking: {}", e))
}

#[tauri::command]
pub async fn is_service_tracked(
    db: State<'_, Arc<Mutex<Database>>>,
    name: String,
) -> Result<bool, String> {
    let db = db.lock().await;
    db.is_service_tracked(&name)
        .await
        .map_err(|e| format!("Failed to check if service is tracked: {}", e))
}

#[tauri::command]
pub async fn update_service_tracking_status(
    db: State<'_, Arc<Mutex<Database>>>,
    name: String,
    enabled: bool,
) -> Result<(), String> {
    let db = db.lock().await;
    db.update_service_enabled(&name, enabled)
        .await
        .map_err(|e| format!("Failed to update service tracking status: {}", e))
}

#[tauri::command]
pub async fn get_all_system_services() -> Result<Vec<serde_json::Value>, String> {
    let output = Command::new("systemctl")
        .args(&["list-unit-files", "--type=service", "--no-pager", "--plain"])
        .output()
        .map_err(|e| format!("Failed to list services: {}", e))?;

    if !output.status.success() {
        return Err(format!("Failed to get services: {}", 
            String::from_utf8_lossy(&output.stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut services = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 && parts[0].ends_with(".service") {
            let name = parts[0].replace(".service", "");
            let status = parts[1];
            
            // Skip template services and some system services
            if name.contains("@") || 
               name.starts_with("systemd-") ||
               name.starts_with("dbus-") ||
               name.starts_with("user@") ||
               name.starts_with("session-") ||
               name.starts_with("user-runtime-dir") ||
               name.starts_with("user-slice") ||
               name.starts_with("user-") ||
               name.starts_with("systemd-user-sessions") ||
               name.starts_with("systemd-logind") ||
               name.starts_with("systemd-udevd") ||
               name.starts_with("systemd-resolved") ||
               name.starts_with("systemd-timesyncd") ||
               name.starts_with("systemd-random-seed") ||
               name.starts_with("systemd-machine-id-commit") ||
               name.starts_with("systemd-journald") ||
               name.starts_with("systemd-journal-flush") ||
               name.starts_with("systemd-journal-catalog-update") ||
               name.starts_with("systemd-journal-remote") ||
               name.starts_with("systemd-journal-upload") ||
               name.starts_with("systemd-journal-gatewayd") ||
               name.starts_with("systemd-journal-export") ||
               name.starts_with("systemd-journal-import") ||
               name.starts_with("systemd-journal-verify") ||
               name.starts_with("systemd-journal-rotate") ||
               name.starts_with("systemd-journal-remote") ||
               name.starts_with("systemd-journal-upload") ||
               name.starts_with("systemd-journal-gatewayd") ||
               name.starts_with("systemd-journal-export") ||
               name.starts_with("systemd-journal-import") ||
               name.starts_with("systemd-journal-verify") ||
               name.starts_with("systemd-journal-rotate") {
                continue;
            }
            
            // Get real-time status
            let real_status = check_service_status(&format!("{}.service", name))
                .unwrap_or(ServiceStatus::Unknown);
            
            let status_str = match real_status {
                ServiceStatus::Running => "running",
                ServiceStatus::Stopped => "stopped",
                ServiceStatus::Failed => "failed",
                ServiceStatus::Unknown => "unknown",
            };
            
            // Get description based on service name
            let description = generate_service_description(&name);
            
            services.push(serde_json::json!({
                "name": name,
                "service_name": parts[0],
                "status": status_str,
                "enabled_status": status,
                "category": get_service_category(&name),
                "enabled": status == "enabled" || status == "static",
                "description": description
            }));
        }
    }

    // Sort by name
    services.sort_by(|a, b| {
        a.get("name").unwrap().as_str().unwrap()
            .cmp(b.get("name").unwrap().as_str().unwrap())
    });

    Ok(services)
}

#[tauri::command]
pub async fn set_service_config(
    db: State<'_, Arc<Mutex<Database>>>,
    service_name: String,
    config_key: String,
    config_value: String,
    config_type: String,
) -> Result<(), String> {
    let db = db.lock().await;
    db.set_service_config(&service_name, &config_key, &config_value, &config_type)
        .await
        .map_err(|e| format!("Failed to set service config: {}", e))
}

#[tauri::command]
pub async fn get_service_configs(
    db: State<'_, Arc<Mutex<Database>>>,
    service_name: String,
) -> Result<Vec<crate::database::ServiceConfig>, String> {
    let db = db.lock().await;
    db.get_service_configs(&service_name)
        .await
        .map_err(|e| format!("Failed to get service configs: {}", e))
}
