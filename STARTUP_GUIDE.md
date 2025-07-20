# 🚀 Dev Services Manager - Startup Scripts Guide

This guide explains how to use the startup scripts to launch the Dev Services Manager application with different logging configurations.

## 📁 Available Scripts

| Platform | Script | Description |
|----------|--------|-------------|
| **Linux/macOS** | `start.sh` | Bash script with colored output |
| **Windows** | `start.bat` | Batch script for Command Prompt |
| **Windows** | `start.ps1` | PowerShell script for modern Windows |

## 🎯 Quick Start

### Linux/macOS
```bash
# Make script executable (first time only)
chmod +x start.sh

# Start with default logging (info level)
./start.sh

# Start with debug logging
./start.sh debug

# Start with custom logging
./start.sh custom
```

### Windows (Command Prompt)
```cmd
# Start with default logging (info level)
start.bat

# Start with debug logging
start.bat debug

# Start with custom logging
start.bat custom
```

### Windows (PowerShell)
```powershell
# Start with default logging (info level)
.\start.ps1

# Start with debug logging
.\start.ps1 debug

# Start with custom logging
.\start.ps1 custom
```

## 🔧 Logging Options

### 1. **Development Mode** (`dev`)
- **Log Level**: `info`
- **Use Case**: General development and testing
- **Output**: Application lifecycle, service operations, errors

```bash
./start.sh dev
```

### 2. **Debug Mode** (`debug`)
- **Log Level**: `debug`
- **Use Case**: Detailed debugging and troubleshooting
- **Output**: All info logs + detailed debug information

```bash
./start.sh debug
```

### 3. **Trace Mode** (`trace`)
- **Log Level**: `trace`
- **Use Case**: Maximum detail for deep debugging
- **Output**: All debug logs + trace-level information

```bash
./start.sh trace
```

### 4. **Quiet Mode** (`quiet`)
- **Log Level**: `error`
- **Use Case**: Production or minimal output
- **Output**: Only error messages

```bash
./start.sh quiet
```

### 5. **SQL Debugging** (`sql`)
- **Log Level**: `info,sqlx=debug`
- **Use Case**: Database operation debugging
- **Output**: General info + SQL query details

```bash
./start.sh sql
```

### 6. **Custom Mode** (`custom`)
- **Log Level**: User-defined
- **Use Case**: Specific debugging needs
- **Output**: Configurable based on user input

```bash
./start.sh custom
```

## 📊 Log Level Reference

| Level | Description | Use Case |
|-------|-------------|----------|
| **error** | Only error messages | Production, minimal output |
| **warn** | Warnings and errors | Basic monitoring |
| **info** | General information | Development (default) |
| **debug** | Detailed debugging | Troubleshooting |
| **trace** | Maximum detail | Deep debugging |

## 🎨 Custom Logging Examples

### Crate-Specific Logging
```bash
# App info + SQL warnings
RUST_LOG=info,sqlx=warn

# App debug + specific crate info
RUST_LOG=debug,tauri=info

# Multiple crates with different levels
RUST_LOG=info,sqlx=debug,tauri=warn
```

### Environment Variable Examples
```bash
# Set before running
export RUST_LOG=debug
./start.sh

# Or inline
RUST_LOG=trace ./start.sh dev
```

## 🔍 What Gets Logged

### Application Lifecycle
- 🚀 Application startup and initialization
- 📦 Database connection and migrations
- 📡 Event manager setup and monitoring
- 🎯 Application ready status

### Service Operations
- 🔍 Service status checking
- 🚀 Service start/stop operations
- 🔧 Command execution (sudo, systemctl)
- ⏱️ Operation timing and performance

### Database Operations
- 🗄️ Database connection management
- 🔄 Migration execution
- ➕ CRUD operations for tracked services
- 📋 Query execution and results

### Event System
- 📡 Real-time service monitoring
- 🔄 Status change detection
- 📤 Event emission and delivery
- 🆕 Service addition/removal tracking

### Terminal Commands
- 💻 Command execution details
- 📁 Working directory changes
- ⏱️ Execution timing
- 📄 Output capture and processing

## 🛠️ Troubleshooting

### Common Issues

#### 1. **Script Permission Denied**
```bash
# Fix: Make script executable
chmod +x start.sh
```

#### 2. **Cargo Not Found**
```bash
# Fix: Install Rust and Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### 3. **Tauri CLI Not Found**
```bash
# Fix: Install Tauri CLI
cargo install tauri-cli
```

#### 4. **PowerShell Execution Policy**
```powershell
# Fix: Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Debugging Tips

1. **Start with debug mode** to see detailed information
2. **Use SQL mode** to debug database issues
3. **Check logs** for specific error messages
4. **Use custom mode** for targeted debugging

## 📝 Examples

### Development Workflow
```bash
# Start development with info logging
./start.sh dev

# Switch to debug for troubleshooting
./start.sh debug

# Use SQL mode for database issues
./start.sh sql
```

### Production Testing
```bash
# Test with minimal logging
./start.sh quiet

# Test with full logging
./start.sh trace
```

### Custom Debugging
```bash
# Custom mode for specific needs
./start.sh custom
# Enter: debug
# Enter: sqlx=warn
```

## 🎯 Best Practices

1. **Use `dev` mode** for general development
2. **Use `debug` mode** when troubleshooting issues
3. **Use `sql` mode** for database-related problems
4. **Use `quiet` mode** for production testing
5. **Use `custom` mode** for specific debugging needs

## 📚 Additional Resources

- [Rust Logging Documentation](https://docs.rs/log/)
- [Tauri Documentation](https://tauri.app/docs/)
- [SQLx Documentation](https://docs.rs/sqlx/)

---

**Happy Debugging! 🐛✨** 