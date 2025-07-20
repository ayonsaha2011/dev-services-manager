# 🚀 Complete Build & Run Guide

## Prerequisites ✅ (Completed)

Your system is ready with:
- ✅ **Node.js**: v24.4.1 (required: v18+)
- ✅ **Rust**: 1.88.0 (latest stable)
- ✅ **systemctl**: Available (systemd 257)
- ✅ **Tauri CLI**: 2.6.2 (installed)

## System Dependencies

**Run these commands to install required system packages:**

```bash
# Update package list
sudo apt-get update

# Install Tauri dependencies
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Verify installations
dpkg -l | grep -E "(webkit2gtk|libgtk|librsvg)"
```

## Project Setup ✅ (Completed)

All dependencies are installed:
- ✅ **Frontend dependencies**: SolidJS, Tailwind, Tauri plugins
- ✅ **Rust dependencies**: Tauri v2, plugins, service management
- ✅ **Configuration**: Updated for Tauri v2

## Development Mode

### Method 1: Full Development Mode (Recommended)

```bash
# Navigate to project directory
cd /home/ayon/dev-services-manager

# Add Cargo to PATH (add to ~/.bashrc for permanent)
export PATH="$HOME/.cargo/bin:$PATH"

# Start development server (builds both frontend and backend)
cargo tauri dev
```

This will:
- 🌐 Start Vite dev server at `http://localhost:3000`
- 🦀 Build Rust backend with hot reload
- 🖥️ Open desktop application window
- 🔄 Auto-reload on file changes

### Method 2: Frontend Only (Testing UI)

```bash
# Start just the frontend for UI development
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Method 3: Backend Testing

```bash
# Test Rust backend compilation
cargo check

# Build backend only
cargo build
```

## Production Build

### Build Release Version

```bash
# Create optimized production build
cargo tauri build
```

This creates:
- 📦 **AppImage**: `target/release/bundle/appimage/dev-services-manager_*.AppImage`
- 📦 **DEB package**: `target/release/bundle/deb/dev-services-manager_*.deb`
- 📦 **Binary**: `target/release/dev-services-manager`

### Install & Run

```bash
# Option 1: Run AppImage directly
./target/release/bundle/appimage/dev-services-manager_*.AppImage

# Option 2: Install DEB package
sudo dpkg -i target/release/bundle/deb/dev-services-manager_*.deb
dev-services-manager

# Option 3: Run binary directly
./target/release/dev-services-manager
```

## Troubleshooting

### Common Issues

**1. Permission denied for systemctl**
```bash
# The app requires sudo for service management
# Make sure you can run: sudo systemctl status docker
```

**2. Missing dependencies**
```bash
# Check what's missing
cargo tauri info

# Install missing packages
sudo apt-get install <missing-package>
```

**3. Build fails with webkit errors**
```bash
# Ensure webkit is properly installed
sudo apt-get install --reinstall libwebkit2gtk-4.1-dev
```

**4. Frontend fails to start**
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

**5. Rust compilation errors**
```bash
# Clean Rust build cache
cargo clean

# Update Rust toolchain
rustup update
```

### Environment Variables

Add to `~/.bashrc` for permanent setup:

```bash
# Add Cargo binaries to PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Enable Rust backtrace for debugging
export RUST_BACKTRACE=1

# Tauri development mode
export TAURI_DEV=1
```

## Development Workflow

### 1. Start Development

```bash
cd /home/ayon/dev-services-manager
export PATH="$HOME/.cargo/bin:$PATH"
cargo tauri dev
```

### 2. Make Changes

- **Frontend**: Edit files in `src/` (SolidJS components)
- **Backend**: Edit files in `src/` (Rust service logic)
- **Styling**: Modify `src/index.css` (Tailwind classes)

### 3. Test Features

The app should open automatically and show:
- 🎨 **Modern UI**: Dark/light theme toggle
- 📊 **Service Grid**: Cards showing all development services
- ⚡ **Real-time Status**: Live service status updates
- 🔧 **Service Control**: Start/stop/restart buttons
- 📋 **Multi-select**: Checkbox selection for batch operations
- 📝 **Service Logs**: Detailed logs in modal windows

### 4. Build for Distribution

```bash
cargo tauri build
```

## File Structure

```
dev-services-manager/
├── src/                     # SolidJS Frontend
│   ├── components/         # UI Components
│   ├── providers/          # Context providers
│   ├── types/             # TypeScript types
│   └── App.tsx            # Main app
├── src/                    # Rust Backend
│   ├── main.rs            # Entry point
│   └── services.rs        # Service management
├── icons/                 # App icons
├── package.json           # Node dependencies
├── Cargo.toml            # Rust dependencies
├── tauri.conf.json       # Tauri configuration
└── README.md             # Documentation
```

## Performance Tips

- **Development**: Use `cargo tauri dev` for hot reload
- **Production**: Always use `cargo tauri build --release`
- **Debugging**: Set `RUST_BACKTRACE=1` for detailed errors
- **Faster builds**: Use `cargo tauri build --debug` for faster builds

## Security Notes

- 🔐 App requires **sudo privileges** for service management
- 🛡️ All service operations are **validated** against predefined list
- 🚫 No **arbitrary command execution** allowed
- ✅ Uses **systemctl** and **journalctl** safely

---

## Quick Start Summary

```bash
# 1. Install system dependencies (run once)
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev

# 2. Navigate to project
cd /home/ayon/dev-services-manager

# 3. Add Cargo to PATH
export PATH="$HOME/.cargo/bin:$PATH"

# 4. Start development
cargo tauri dev

# 5. For production build
cargo tauri build
```

🎉 **You're ready to go!** The app will compile and open automatically.