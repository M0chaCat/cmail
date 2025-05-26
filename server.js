const WebSocket = require("ws");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const http = require('http');

// Add configuration for soft delete
const CONFIG = {
  serverDomain: "localhost", // Add server identity
  softDelete: true,  // When true, moves messages to deleted folder instead of permanent deletion
  defaultOrgSettings: {
    name: "boby industries",
    iconUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVL7UUAdo0TUclGt6ignSsu1KahFKgeMq_6w&s"
  }
};

const PORT = 3292;
const DATA_DIR = "./data";
const DELETED_DIR = "./data/_deleted";  // Special folder for deleted messages
const CMails_DB = "./cmails.json";

const clients = new Map();

async function readCmailDB() {
  try {
    const content = await fsp.readFile(CMails_DB, "utf8");
    return JSON.parse(content);
  } catch (e) {
    // No DB yet or error
    return {};
  }
}

async function writeCmailDB(db) {
  await fsp.writeFile(CMails_DB, JSON.stringify(db, null, 2), "utf8");
}

async function saveMessage(cmail, message) {
  const { localPart, org } = parseFederatedAddress(cmail);
  const userDir = `${localPart}!${org}`;
  
  const dir = path.join(DATA_DIR, userDir);
  await fsp.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${message.uuid}.json`);
  await fsp.writeFile(filePath, JSON.stringify(message, null, 2), "utf8");
}

async function loadMessages(cmail) {
  // Parse federated address to get correct directory structure
  const { localPart, org } = parseFederatedAddress(cmail);
  const userDir = `${localPart}!${org}`;
  
  const dir = path.join(DATA_DIR, userDir);
  try {
    const files = await fsp.readdir(dir);
    const messages = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = await fsp.readFile(path.join(dir, file), "utf8");
        messages.push(JSON.parse(content));
      }
    }
    return messages;
  } catch {
    return [];
  }
}

async function moveToDeleted(cmail, uuid) {
  const sourceDir = path.join(DATA_DIR, cmail);
  const sourceFile = path.join(sourceDir, `${uuid}.json`);
  
  // Create deleted directory if it doesn't exist
  const deletedUserDir = path.join(DELETED_DIR, cmail);
  await fsp.mkdir(deletedUserDir, { recursive: true });
  
  const targetFile = path.join(deletedUserDir, `${uuid}.json`);
  
  // Move the file
  await fsp.rename(sourceFile, targetFile);
}

async function permanentDelete(cmail, uuid) {
  const dir = path.join(DATA_DIR, cmail);
  const filePath = path.join(dir, `${uuid}.json`);
  await fsp.unlink(filePath);
}

function parseFederatedAddress(address) {
  const parts = address.split('!');
  return {
    localPart: parts[0],
    org: parts[1],
    domain: parts[2] || CONFIG.serverDomain
  };
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/forward' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const msg = JSON.parse(body);
      const recipient = parseFederatedAddress(msg.to);
      await saveMessage(recipient.localPart, msg);
      const recipientWs = clients.get(recipient.localPart);
      if (recipientWs?.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify(msg));
      }
      res.end('Message forwarded');
    });
  }
});

// Initialize WebSocket server AFTER creating HTTP server
const wss = new WebSocket.Server({ server });


// Keep the existing connection handler:
wss.on("connection", (ws) => {
  let registeredCmail = null;

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "register") {
        const { cmail, password, folder } = msg;  // Extract folder from request

        if (!cmail || !password) {
          ws.send(JSON.stringify({ type: "system", body: { content: "Missing cmail or password" } }));
          return;
        }

        const db = await readCmailDB();
        const account = db[cmail];

        if (!account) {
          ws.send(JSON.stringify({ type: "system", body: { content: "Cmail not found. Please register first." } }));
          return;
        }

        if (account.password !== password) {
          ws.send(JSON.stringify({ type: "system", body: { content: "Incorrect password." } }));
          return;
        }

        registeredCmail = cmail;
        clients.set(registeredCmail, ws);

        ws.send(JSON.stringify({ 
          type: "system", 
          body: { 
            content: `Welcome, ${account.displayName || cmail}`,
            orgName: account.orgName || CONFIG.defaultOrgSettings.name,
            orgIcon: account.orgIcon || CONFIG.defaultOrgSettings.iconUrl
          } 
        }));

        const savedMessages = await loadMessages(registeredCmail);
        for (const m of savedMessages) {
          // Only send messages that belong in the current folder
          const isInbox = m.to === cmail;
          const isSent = m.from === cmail;
          
          if ((folder === 'inbox' && isInbox) ||
              (folder === 'sent' && isSent)) {
            ws.send(JSON.stringify(m));
          }
        }
      } else if (msg.type === "message") {
        if (!registeredCmail) {
          ws.send(JSON.stringify({ type: "system", body: { content: "Please register first." } }));
          return;
        }

        // Parse recipient address
        const recipient = parseFederatedAddress(msg.to);
        const isLocal = recipient.domain === CONFIG.serverDomain;

        // Handle local message
        if (isLocal) {
          await saveMessage(msg.to, msg);
          const recipientCmail = `${recipient.localPart}!${recipient.org}!${recipient.domain}`;
          const recipientWs = clients.get(recipientCmail);
          if (recipientWs?.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify(msg));
          }
        } 
        // Forward to remote server
        else {
          const forwardUrl = `http://${recipient.domain}:${PORT}/forward`;
          try {
            await fetch(forwardUrl, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(msg)
            });
          } catch (e) {
            console.error('Forwarding failed:', e);
          }
        }

        // Always save sender's copy
        await saveMessage(msg.from, msg);
        ws.send(JSON.stringify({ type: "system", body: { content: "Message processed" } }));
        if (!msg.to || !msg.uuid) {
          ws.send(JSON.stringify({ type: "system", body: { content: "Invalid message format." } }));
          return;
        }

        // Save message for recipient
        await saveMessage(msg.to, msg);
        // Save message for sender (new)
        await saveMessage(msg.from, msg);

        const recipientWs = clients.get(msg.to);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify(msg));
        }

        ws.send(JSON.stringify({ type: "system", body: { content: "Message saved and sent (if recipient online)." } }));
      } else if (msg.type === "delete") {
        if (!registeredCmail) {
          ws.send(JSON.stringify({ type: "error", body: { content: "Please register first." } }));
          return;
        }

        const { uuid } = msg;
        
        try {
          if (CONFIG.softDelete) {
            await moveToDeleted(registeredCmail, uuid);
            ws.send(JSON.stringify({ 
              type: "system", 
              body: { content: "Message moved to deleted folder." } 
            }));
          } else {
            await permanentDelete(registeredCmail, uuid);
            ws.send(JSON.stringify({ 
              type: "system", 
              body: { content: "Message permanently deleted." } 
            }));
          }
        } catch (err) {
          ws.send(JSON.stringify({ 
            type: "error", 
            body: { content: "Failed to delete message." } 
          }));
        }
      }
    } catch (e) {
      console.error("Error handling message:", e);
      ws.send(JSON.stringify({ type: "system", body: { content: "Server error." } }));
    }
  });

  ws.on("close", () => {
    if (registeredCmail) {
      clients.delete(registeredCmail);
    }
  });
});

server.listen(PORT, () => {
  console.log(`HTTP/WebSocket server running on port ${PORT}`);
  console.log(`Cmail WebSocket endpoint: ws://localhost:${PORT}`); 
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try another port.`);
    process.exit(1);
  }
});
