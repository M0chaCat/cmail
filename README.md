# Cmail 

**Email reimagined for cats** - Secure, real-time messaging system designed for cat-like communications.
<!-- system diagram later? -->

## Features
### Core Capabilities
- **Real-time messaging** via WebSocket
- **Feline-friendly address system** (`username!domain.org`)
- **Secure authentication** with password protection
- **Message tracking** with reply/forward threading

## Quick Start 
```bash
# Clone repository
git clone https://github.com/MochaCat/cmail.git
cd cmail

# Install dependencies
npm install

# Start server 
node server.js
```
## Configuration 
### Server Settings (cmails.json)
```
{
  "user!domain.org": {
    "password": "securePassword",
    "displayName": "Fluffy Mittens",
    "createdAt": "2025-05-19T17:00:00Z"
  }
}
```
### Server Data Storage Structure
```
📁 data/
  ├── 📁 username/      # User messages
  └── 📁 _deleted/      # Soft-deleted messages (if enabled)
```

## Federation Support 
Cmail supports multi-server communication through:

1. Cross-domain address validation
2. Secure message forwarding
3. Organization-based identity management
```
user!server1.org ➔ websocket ➔ server2.org ➔ recipient!server2.org
```

Legal Disclaimer: Any resemblance to actual cat conspiracies is purely coincidental. meow :3
