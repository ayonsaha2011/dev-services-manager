# Dev Services Manager

A modern development services manager designed for streamlined services and project management. Built with Rust (Tauri) and SolidJS, this cross-platform desktop application provides intelligent management of development services like Docker, MySQL, PostgreSQL, Redis, and more with optimal performance and user experience. AI-powered features coming soon!

## Features

### 🎯 Core Functionality
- **Service Management**: Start, stop, restart, enable/disable auto-start for development services
- **Real-time Status**: Live monitoring of service status with auto-refresh
- **Multi-select Operations**: Select and manage multiple services simultaneously
- **Service Logs**: View detailed logs for troubleshooting
- **Search & Filter**: Quickly find services by name or status
- **Health Indicators**: Visual health status based on service uptime

### 🤖 Coming Soon - AI Features
- **AI-Powered Management**: Intelligent service management with AI assistance for optimal configuration
- **Smart Recommendations**: AI-driven suggestions for service optimization and troubleshooting
- **Automated Troubleshooting**: AI-assisted diagnosis and resolution of common service issues
- **Predictive Maintenance**: Proactive service health monitoring and alerts

### 🎨 Modern UI/UX
- **Dark/Light/System Theme**: Automatic theme switching with system preference detection
- **Responsive Design**: Works perfectly on different screen sizes
- **Smooth Animations**: Polished interactions with fade-in, slide, and bounce animations
- **Toast Notifications**: Real-time feedback for all operations
- **Card-based Interface**: Clean, organized service cards with status indicators
- **Keyboard Shortcuts**: Full keyboard navigation and shortcuts for power users

### 🚀 Performance
- **Rust Backend**: Lightning-fast service operations using Tauri
- **SolidJS Frontend**: Reactive UI with minimal overhead
- **Efficient Updates**: Only re-renders when necessary
- **Background Refresh**: Auto-refresh every 30 seconds without blocking UI
- **GPU Acceleration**: Optimized animations and transitions
- **Smart Caching**: Password caching for improved workflow

### ⌨️ Keyboard Shortcuts
- **Ctrl+R**: Refresh services
- **Ctrl+S**: Start selected services
- **Ctrl+X**: Stop all services
- **Ctrl+D**: Go to dashboard

- **Ctrl+M**: Manage services dialog
- **Escape**: Clear selection / Go back
- **Delete**: Remove selected service
- **Tab**: Navigate between service cards
- **Enter/Space**: Activate buttons

## Supported Services

The application supports managing these common development services:

- **Databases**: MySQL, PostgreSQL, MongoDB, Redis, InfluxDB
- **Web Servers**: Nginx, Apache2
- **Message Brokers**: Kafka, RabbitMQ, Zookeeper
- **Search & Analytics**: Elasticsearch
- **Monitoring**: Grafana, Prometheus
- **DevOps**: Docker, Jenkins, GitLab Runner
- **Service Discovery**: Consul, Vault, etcd
- **Caching**: Memcached

## Installation

### Prerequisites
- Rust (latest stable)
- Node.js (v18 or later)
- System with systemd (Linux)

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd dev-services-manager
   ```

2. **Install dependencies**:
   ```bash
   # Install frontend dependencies
   npm install
   
   # Rust dependencies will be installed automatically
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

### Building Binaries

To create distributable binaries:

```bash
# Build for current platform
npm run tauri build

# Cross-compile (requires additional setup)
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## Architecture

### Backend (Rust/Tauri)
- **Service Management**: Direct systemctl integration for service control
- **Status Monitoring**: Real-time service status checking
- **Log Retrieval**: Journalctl integration for service logs
- **Security**: Requires sudo privileges for service operations
- **Database**: SQLite for service tracking and configuration

### Frontend (SolidJS)
- **Reactive State**: Context-based state management
- **Component Architecture**: Modular, reusable components
- **Theme System**: CSS custom properties with JavaScript coordination
- **UI Components**: Custom button and card components with variants
- **Accessibility**: Full keyboard navigation and ARIA support

### Key Technologies
- **Tauri**: Rust-based desktop app framework
- **SolidJS**: Reactive JavaScript library
- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Beautiful SVG icons
- **Solid Toast**: Toast notifications

## Configuration

### Customizing Services

To add or modify services, update the service definitions in `src/services.rs`:

```rust
fn get_service_definitions() -> HashMap<String, String> {
    let mut services = HashMap::new();
    services.insert("your-service".to_string(), "your-service.service".to_string());
    // ... more services
    services
}
```

### Theme Customization

Themes can be customized in `src/index.css` by modifying CSS custom properties:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --background: 0 0% 100%;
  /* ... other variables */
}
```

## Security Considerations

- The application requires sudo privileges to manage system services
- All service operations are validated against a predefined list
- No arbitrary command execution is allowed
- Service names are sanitized before system calls
- Passwords are cached securely with automatic expiration


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## ☕ Support the Project

If you find this library helpful and would like to support its development, consider making a donation:

### 💰 Donation Options

- **GitHub Sponsors**: [Sponsor on GitHub](https://github.com/sponsors/ayonsaha2011)
- **Buy Me a Coffee**: [Buy me a coffee](https://coff.ee/ayonsaha2011)
- **PayPal**: [PayPal Donation](https://paypal.me/ayonsaha)

### 🎯 What Your Support Helps With

- 🚀 **Feature Development** - Building new capabilities and improvements
- 🐛 **Bug Fixes** - Maintaining stability and reliability  
- 📚 **Documentation** - Creating better guides and examples
- 🔧 **Maintenance** - Keeping the library up-to-date with dependencies
- ☁️ **Infrastructure** - Hosting costs for CI/CD and testing

Every contribution, no matter the size, helps make this library better for everyone! 🙏

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI powered by [SolidJS](https://www.solidjs.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Heroicons](https://heroicons.com/)