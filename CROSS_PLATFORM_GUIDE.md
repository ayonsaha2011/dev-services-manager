# Cross-Platform Implementation Guide

## Platform Detection and Abstraction

### 1. Service Manager Trait

```rust
// src/platform/mod.rs
pub trait ServiceManager {
    async fn get_services(&self) -> Result<Vec<Service>, ServiceError>;
    async fn start_service(&self, name: &str) -> Result<ServiceOperation, ServiceError>;
    async fn stop_service(&self, name: &str) -> Result<ServiceOperation, ServiceError>;
    async fn get_service_status(&self, name: &str) -> Result<ServiceStatus, ServiceError>;
    async fn get_logs(&self, name: &str, lines: u32) -> Result<Vec<String>, ServiceError>;
}

// Platform-specific implementations
pub mod linux;
pub mod windows;
pub mod macos;

pub fn get_service_manager() -> Box<dyn ServiceManager> {
    match std::env::consts::OS {
        "linux" => Box::new(linux::SystemdManager::new()),
        "windows" => Box::new(windows::WindowsServiceManager::new()),
        "macos" => Box::new(macos::LaunchctlManager::new()),
        _ => panic!("Unsupported platform"),
    }
}
```

### 2. Linux Implementation (Current)

```rust
// src/platform/linux.rs
pub struct SystemdManager;

impl ServiceManager for SystemdManager {
    async fn start_service(&self, name: &str) -> Result<ServiceOperation, ServiceError> {
        let output = Command::new("sudo")
            .args(&["systemctl", "start", &format!("{}.service", name)])
            .output()?;
        
        if output.status.success() {
            Ok(ServiceOperation {
                success: true,
                message: format!("Started {}", name),
                service: None,
            })
        } else {
            Err(ServiceError::CommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string()
            ))
        }
    }

    async fn get_logs(&self, name: &str, lines: u32) -> Result<Vec<String>, ServiceError> {
        let output = Command::new("journalctl")
            .args(&["-u", &format!("{}.service", name), "-n", &lines.to_string()])
            .output()?;
        
        Ok(String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|s| s.to_string())
            .collect())
    }
}
```

### 3. Windows Implementation

```rust
// src/platform/windows.rs
pub struct WindowsServiceManager;

impl ServiceManager for WindowsServiceManager {
    async fn start_service(&self, name: &str) -> Result<ServiceOperation, ServiceError> {
        // Method 1: Using sc.exe
        let output = Command::new("sc")
            .args(&["start", name])
            .output()?;
            
        // Method 2: Using PowerShell
        let ps_command = format!("Start-Service -Name '{}'", name);
        let output = Command::new("powershell")
            .args(&["-Command", &ps_command])
            .output()?;
            
        if output.status.success() {
            Ok(ServiceOperation {
                success: true,
                message: format!("Started {}", name),
                service: None,
            })
        } else {
            Err(ServiceError::CommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string()
            ))
        }
    }

    async fn get_service_status(&self, name: &str) -> Result<ServiceStatus, ServiceError> {
        let ps_command = format!(
            "Get-Service -Name '{}' | Select-Object -ExpandProperty Status", 
            name
        );
        let output = Command::new("powershell")
            .args(&["-Command", &ps_command])
            .output()?;
            
        let status_str = String::from_utf8_lossy(&output.stdout).trim();
        match status_str {
            "Running" => Ok(ServiceStatus::Running),
            "Stopped" => Ok(ServiceStatus::Stopped),
            "StartPending" | "StopPending" => Ok(ServiceStatus::Unknown),
            _ => Ok(ServiceStatus::Failed),
        }
    }

    async fn get_logs(&self, name: &str, lines: u32) -> Result<Vec<String>, ServiceError> {
        // Windows Event Log approach
        let ps_command = format!(
            "Get-WinEvent -FilterHashtable @{{LogName='System'; ProviderName='{}'}} -MaxEvents {} | Format-Table -Wrap",
            name, lines
        );
        let output = Command::new("powershell")
            .args(&["-Command", &ps_command])
            .output()?;
            
        Ok(String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|s| s.to_string())
            .collect())
    }
}
```

### 4. macOS Implementation

```rust
// src/platform/macos.rs
pub struct LaunchctlManager;

impl ServiceManager for LaunchctlManager {
    async fn start_service(&self, name: &str) -> Result<ServiceOperation, ServiceError> {
        // Method 1: Homebrew services
        let output = Command::new("brew")
            .args(&["services", "start", name])
            .output()?;
            
        if output.status.success() {
            return Ok(ServiceOperation {
                success: true,
                message: format!("Started {} via Homebrew", name),
                service: None,
            });
        }
        
        // Method 2: launchctl for system services
        let service_path = format!("com.{}.{}", name, name);
        let output = Command::new("launchctl")
            .args(&["load", "-w", &format!("/Library/LaunchDaemons/{}.plist", service_path)])
            .output()?;
            
        if output.status.success() {
            Ok(ServiceOperation {
                success: true,
                message: format!("Started {}", name),
                service: None,
            })
        } else {
            Err(ServiceError::CommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string()
            ))
        }
    }

    async fn get_service_status(&self, name: &str) -> Result<ServiceStatus, ServiceError> {
        // Check Homebrew services first
        let output = Command::new("brew")
            .args(&["services", "list"])
            .output()?;
            
        let services_list = String::from_utf8_lossy(&output.stdout);
        for line in services_list.lines() {
            if line.contains(name) {
                if line.contains("started") {
                    return Ok(ServiceStatus::Running);
                } else if line.contains("stopped") {
                    return Ok(ServiceStatus::Stopped);
                }
            }
        }
        
        // Check launchctl
        let output = Command::new("launchctl")
            .args(&["list"])
            .output()?;
            
        let list_output = String::from_utf8_lossy(&output.stdout);
        if list_output.contains(name) {
            Ok(ServiceStatus::Running)
        } else {
            Ok(ServiceStatus::Stopped)
        }
    }

    async fn get_logs(&self, name: &str, lines: u32) -> Result<Vec<String>, ServiceError> {
        // macOS unified logging
        let output = Command::new("log")
            .args(&[
                "show",
                "--predicate", &format!("process == \"{}\"", name),
                "--last", "1h",
                "--style", "syslog"
            ])
            .output()?;
            
        let logs: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .take(lines as usize)
            .map(|s| s.to_string())
            .collect();
            
        Ok(logs)
    }
}
```

## Platform-Specific Service Definitions

### Service Name Mappings

```rust
// src/platform/service_definitions.rs
use std::collections::HashMap;

pub fn get_platform_services() -> HashMap<String, PlatformService> {
    match std::env::consts::OS {
        "linux" => get_linux_services(),
        "windows" => get_windows_services(),
        "macos" => get_macos_services(),
        _ => HashMap::new(),
    }
}

fn get_linux_services() -> HashMap<String, PlatformService> {
    let mut services = HashMap::new();
    services.insert("docker".to_string(), PlatformService {
        system_name: "docker.service".to_string(),
        display_name: "Docker".to_string(),
        description: "Container runtime platform".to_string(),
        manager_type: ServiceManagerType::Systemd,
    });
    services.insert("mysql".to_string(), PlatformService {
        system_name: "mysql.service".to_string(),
        display_name: "MySQL".to_string(),
        description: "MySQL database server".to_string(),
        manager_type: ServiceManagerType::Systemd,
    });
    services
}

fn get_windows_services() -> HashMap<String, PlatformService> {
    let mut services = HashMap::new();
    services.insert("docker".to_string(), PlatformService {
        system_name: "com.docker.service".to_string(),
        display_name: "Docker Desktop Service".to_string(),
        description: "Docker Desktop for Windows".to_string(),
        manager_type: ServiceManagerType::WindowsService,
    });
    services.insert("mysql".to_string(), PlatformService {
        system_name: "MySQL80".to_string(),
        display_name: "MySQL 8.0".to_string(),
        description: "MySQL database server".to_string(),
        manager_type: ServiceManagerType::WindowsService,
    });
    services
}

fn get_macos_services() -> HashMap<String, PlatformService> {
    let mut services = HashMap::new();
    services.insert("docker".to_string(), PlatformService {
        system_name: "docker".to_string(),
        display_name: "Docker".to_string(),
        description: "Docker Desktop for Mac".to_string(),
        manager_type: ServiceManagerType::Homebrew,
    });
    services.insert("mysql".to_string(), PlatformService {
        system_name: "mysql".to_string(),
        display_name: "MySQL".to_string(),
        description: "MySQL database server".to_string(),
        manager_type: ServiceManagerType::Homebrew,
    });
    services
}

#[derive(Debug, Clone)]
pub struct PlatformService {
    pub system_name: String,
    pub display_name: String,
    pub description: String,
    pub manager_type: ServiceManagerType,
}

#[derive(Debug, Clone)]
pub enum ServiceManagerType {
    Systemd,           // Linux
    WindowsService,    // Windows
    Homebrew,          // macOS Homebrew
    Launchctl,         // macOS native
}
```

## Updated Main Service Module

```rust
// src/services.rs (updated for cross-platform)
use crate::platform::{get_service_manager, ServiceManager};

#[tauri::command]
pub async fn get_services() -> Result<Vec<Service>, String> {
    let manager = get_service_manager();
    manager.get_services().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_service(service_name: String) -> Result<ServiceOperation, String> {
    let manager = get_service_manager();
    manager.start_service(&service_name).await.map_err(|e| e.to_string())
}

// ... other commands follow the same pattern
```

## Frontend Adaptations

### Platform-Aware UI

```tsx
// src/components/PlatformInfo.tsx
import { Component, createSignal, onMount } from 'solid-js'
import { invoke } from '@tauri-apps/api/tauri'

const PlatformInfo: Component = () => {
  const [platform, setPlatform] = createSignal<string>('')
  
  onMount(async () => {
    const platformInfo = await invoke<string>('get_platform')
    setPlatform(platformInfo)
  })
  
  const getPlatformIcon = () => {
    switch (platform()) {
      case 'linux': return '🐧'
      case 'windows': return '🪟'
      case 'macos': return '🍎'
      default: return '💻'
    }
  }
  
  return (
    <div class="flex items-center space-x-2 text-sm text-muted-foreground">
      <span>{getPlatformIcon()}</span>
      <span>Running on {platform()}</span>
    </div>
  )
}
```

## Build Configuration

### Tauri Configuration for Cross-Platform

```json
// tauri.conf.json
{
  "tauri": {
    "bundle": {
      "targets": ["deb", "appimage"], // Linux
      "targets": ["msi", "nsis"],     // Windows  
      "targets": ["dmg", "app"],      // macOS
      "identifier": "com.devservices.manager"
    }
  }
}
```

### GitHub Actions for Multi-Platform Builds

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Install dependencies (Ubuntu)
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev webkit2gtk-4.0-dev
          
      - name: Install frontend dependencies
        run: npm install
        
      - name: Build Tauri app
        run: npm run tauri build
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: src-tauri/target/release/bundle/
```

## Summary

### Current State: ✅ Linux Ready
- Full systemd integration
- Service management works perfectly
- Logs via journalctl

### To Achieve Full Cross-Platform: 🔧 Requires Implementation
1. **Abstract service management** into trait-based system
2. **Platform-specific implementations** for Windows/macOS
3. **Service name mapping** for each platform
4. **Different privilege escalation** methods
5. **Platform-aware logging** systems

### Effort Required:
- **Medium complexity**: 2-3 days of development
- **Testing**: Requires actual Windows/macOS machines
- **Maintenance**: Platform-specific edge cases

The architecture I've provided makes it **fully extensible** for true cross-platform support! 🚀