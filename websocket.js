const WebSocket = require('ws');

const clients = new Map();
const typingUsers = new Map();

const init = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    let userId = null; // Keep track of the user for this connection

    ws.on('message', (message) => {
      try {
        const { type, payload } = JSON.parse(message);
        switch (type) {
          case 'auth':
            userId = payload.userId;
            clients.set(userId, ws);
            break;
          case 'typing':
            if (userId) {
              if (typingUsers.has(userId)) {
                clearTimeout(typingUsers.get(userId));
              }
              broadcast(JSON.stringify({ type: 'typing', payload: { userId } }));
              const timeoutId = setTimeout(() => {
                broadcast(JSON.stringify({ type: 'stop-typing', payload: { userId } }));
                typingUsers.delete(userId);
              }, 3000); // 3-second timeout
              typingUsers.set(userId, timeoutId);
            }
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Failed to process WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        if (typingUsers.has(userId)) {
          clearTimeout(typingUsers.get(userId));
          typingUsers.delete(userId);
        }
      }
    });
  });
};

const broadcast = (message) => {
  for (const client of clients.values()) {
    client.send(message);
  }
};

const sendMessage = (userId, message) => {
    const client = clients.get(userId);
    if (client) {
        client.send(JSON.stringify(message));
    }
};

const sendDeliveryReceipt = (userId, messageId) => {
    sendMessage(userId, { type: 'delivery-receipt', payload: { messageId, status: 'delivered' } });
};

module.exports = {
  init,
  broadcast,
  sendMessage,
  sendDeliveryReceipt,
};
