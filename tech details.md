
# Cmail Technical Details

## Overview
Cmail is a cat-oriented messaging system designed for cat-like communications. It implements a WebSocket-based real-time messaging protocol with a web client interface.

## Architecture

### Server
- **Technology**: Node.js with WebSocket (ws) server
- **Port**: 3292 
- **Data Storage**: 
  - User accounts: `cmails.json`
  - Messages: `./data/{localPart!org}/{message_uuid}.json`
  - Soft-deleted messages: `./data/_deleted/{cmail_address}/`
- **Organization Settings**: Default org configuration with name and icon
If a custom server follows the same spec then it should be fully compatible with Cmail.

### Client
- **WebSocket Client**: Enhanced folder support (inbox/sent)
- **Message Sorting**: Automatic timestamp-based sorting
- **Technology**: Pure HTML/CSS/JavaScript
- **Architecture**: Single-page application
- **WebSocket Client**: Custom implementation in `cmail-client.js`
If a custom client follows the same spec then it should be fully compatible with Cmail aswell.

## Protocol Details

### Message Format
```json
{
  "from": "sender!domain.org",
  "to": "recipient!domain.org",
  "subject": "Message Subject",
  "type": "message",
  "uuid": "unique-message-id",
  "replytouuid": "original-message-id-for-replies",
  "forwardeduuid": "original-message-id-for-forwards",
  "headers": {
    "timestamp": "ISO-8601-timestamp",
    "priority": "normal"
  },
  "body": {
    "contentType": "text/plain",
    "content": "Message content"
  }
}
```

### System Messages
```json
{
  "type": "system",
  "body": {
    "content": "System message text"
  }
}
```

### Error Messages
```json
{
  "type": "error",
  "body": {
    "content": "Error message text"
  }
}
```

## Features

### Authentication
- Cmail address format: `username!domain.org`
- Password-based authentication
- Session maintained via WebSocket connection

### Messaging Capabilities
- Send/Receive messages
- Reply to messages (with thread tracking)
- Forward messages
- Real-time message delivery
- Offline message storage and retrieval

### Enhanced Features
- Federated address handling (username!domain.org)
- Multi-server message forwarding
- Folder-specific message loading (inbox/sent)
- Automatic message timestamp handling
- Configurable soft-delete functionality

## Data Storage Structure
### User Account Format
```
{
  "username!domain.org": {
    "password": "1234",
    "displayName": "Steve Doe",
    "createdAt": "2025-05-19T17:00:00Z"
  }
}
```
## Client-Server Communication
### Updated Connection Flow
1. WebSocket connection with folder specification
2. Automatic reconnection logic
3. Folder-specific message retrieval
4. Cross-server federation handling
## New Security Considerations
- Federated address validation
- Server-side message forwarding
- Organization-based identity management

### UI Components
- Login interface
- Message composition
- Message list view
- Message detail view
- Reply interface
- Forward functionality
- Navigation sidebar

## Styling
- Custom CSS variables for theming
- Responsive design
- Material Design-inspired components
- Color scheme:
  - Primary color: #1a73e8
  - Background: #f6f8fc
  - Border color: #dadce0
  - Text color: #202124

## Data Storage Structure

### User Account Format
```json
{
  "username": {
    "password": "user-password",
    "displayName": "User Display Name",
    "createdAt": "ISO-8601-timestamp"
  }
}
```

### Message Storage
- Each message is stored as a separate JSON file
- File naming: `{message_uuid}.json`
- Directory structure: `./data/{recipient_cmail}/`

## Client-Server Communication

### Updated Connection Flow
1. WebSocket connection with folder specification
2. Automatic reconnection logic
3. Folder-specific message retrieval
4. Cross-server federation handling

## New Security Considerations
- Federated address validation
- Server-side message forwarding
- Organization-based identity management

## Limitations
- Text-only messages
- Basic authentication mechanism
- File-based storage system
