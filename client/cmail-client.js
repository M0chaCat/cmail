const CmailClient = (() => {
  let socket;
  let myCmail = "";
  let storedPassword = ""; // Rename to avoid shadowing
  let onMessageCallback = () => {};
  let onSystemCallback = () => {};
  let onErrorCallback = () => {};
  let currentFolder = 'inbox';
  let messageBuffer = []; // Move messageBuffer to module scope
  let processedMessageIds = new Set(); // Move processedMessageIds to module scope

  function connect(cmail, pwd, { onMessage, onSystem, onError }) {
    myCmail = cmail;
    storedPassword = pwd;
    onMessageCallback = onMessage || (() => {});
    onSystemCallback = onSystem || (() => {});
    onErrorCallback = onError || ((err) => console.error('Error:', err));

    socket = new WebSocket('ws://localhost:3292');

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'register',
        cmail: myCmail,
        password: storedPassword,
        folder: currentFolder
      }));
    };

    function displayInFolder(message) {
      const isInbox = message.to === myCmail;
      const isSent = message.from === myCmail;
      
      if ((currentFolder === 'inbox' && isInbox) ||
          (currentFolder === 'sent' && isSent)) {
        if (!processedMessageIds.has(message.uuid)) {
          message.timestamp = new Date(message.headers.timestamp).getTime();
          messageBuffer.push(message);
          processedMessageIds.add(message.uuid);
          
          // Sort messages by timestamp in descending order (newest first)
          messageBuffer.sort((a, b) => a.timestamp - b.timestamp);
          
          // Clear the display and resend all messages in correct order
          onMessageCallback({ type: 'clear' });
          messageBuffer.forEach(msg => onMessageCallback(msg));
        }
      }
    }

    socket.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
        // Add timestamp for sorting if it's a message type
        if (msg.type !== 'system' && msg.type !== 'error' && msg.headers?.timestamp) {
          msg.timestamp = new Date(msg.headers.timestamp).getTime();
        }
      } catch (e) {
        onErrorCallback('Invalid JSON from server');
        return;
      }

      if (msg.type === 'system') {
        onSystemCallback(msg);
      } else if (msg.type === 'error') {
        onErrorCallback(msg.body.content || 'Unknown server error');
      } else {
        displayInFolder(msg);
      }
    };

    socket.onerror = (err) => {
      onErrorCallback('WebSocket error: ' + err.message);
      console.error('WebSocket error:', err);
      setTimeout(() => connect(myCmail, storedPassword, { 
        onMessage: onMessageCallback,
        onSystem: onSystemCallback,
        onError: onErrorCallback
      }), 3000); // Auto-reconnect after 3 seconds
    };

    socket.onclose = (event) => {
      console.log('Connection closed:', event.code, event.reason);
      if (event.code !== 1000) { // Only reconnect for abnormal closures
        setTimeout(() => connect(myCmail, storedPassword, { 
          onMessage: onMessageCallback,
          onSystem: onSystemCallback,
          onError: onErrorCallback
        }), 3000);
      }
    };
  }

  function sendMessage(to, subject, body, replyToUuid = "", forwardedUuid = "") {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('Not connected');
      return;
    }

    const message = {
      from: myCmail,
      to,
      subject,
      type: "message",
      uuid: crypto.randomUUID(),
      replytouuid: replyToUuid,
      forwardeduuid: forwardedUuid,
      headers: {
        timestamp: new Date().toISOString(),
        priority: "normal"
      },
      body: {
        contentType: "text/plain",
        content: body
      }
    };

    socket.send(JSON.stringify(message));
  }

  function deleteMessage(uuid) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('Not connected');
      return;
    }

    const message = {
      type: "delete",
      uuid: uuid,
      from: myCmail
    };

    socket.send(JSON.stringify(message));
  }

  function setFolder(folder) {
    if (folder === currentFolder) return; // Don't reset if it's the same folder
    
    currentFolder = folder;
    messageBuffer = []; // Clear the buffer when changing folders
    processedMessageIds.clear(); // Clear the processed messages set
    
    // Ensure UI is cleared before requesting new messages
    if (onMessageCallback) {
      onMessageCallback({ type: 'clear' });
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'register',
        cmail: myCmail,
        password: storedPassword,
        folder: folder
      }));
    }
  }

  function getCurrentFolder() {
    return currentFolder;
  }

  return { connect, sendMessage, deleteMessage, setFolder, getCurrentFolder };
})();
