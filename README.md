```
#  Cmail - Feline Communication Protocol

**Email reimagined for cats** - Secure, real-time messaging system designed for cat-like communications and... other _curious_ activities.
<!-- system diagram later? -->

## Features
### Core Capabilities
- **Real-time messaging** via WebSocket (port 
3292)
- **Feline-friendly address system** 
(`username!domain.org`)
- **Secure authentication** with password 
protection
- **Message tracking** with reply/forward 
threading

## Quick Start 
```bash
# Clone repository
git clone https://github.com/yourrepo/cmail.git
cd cmail

# Install dependencies
npm install

# Start server (default port 3292)
node server.js

# Access client at http://localhost:8000/
client/
```
## Configuration 
### Server Settings (cmails.json)
```
{
  "user!domain.org": {
    "password": "securePassword",
    "displayName": "Fluffy Mittens",
  }
}
```
### Server Data Storage Structure
```
📁 data/
  ├── 📁 username/      # User messages
  └── 📁 _deleted/            # Soft-deleted messages
```

## Federation Support 
Cmail supports multi-server communication through:

1. Cross-domain address validation
2. Secure message forwarding
3. Organization-based identity management
```
user!server1.org ➔ websocket ➔ server2.org ➔ recipient!server2.org
```
## Contribution Guidelines 
1. All pull requests must pass the paw-approval process
2. Catnip-induced coding sessions encouraged
3. Strict no-dogs-allowed policy
Legal Disclaimer Any resemblance to actual cat conspiracies is purely coincidental. meow :3