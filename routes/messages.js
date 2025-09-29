const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const { messageValidation, validate } = require('../middleware/validators');
const webSocket = require('../websocket');
const { messages, chatRooms } = require('../data');

const router = express.Router();

// BUG: Inconsistent authentication - sometimes checking, sometimes not
function getCurrentUser(req) {
  return req.user;
}

// Get all rooms
router.get('/', auth, async (req, res) => {
  try {
    const currentUser = getCurrentUser(req);
    
    // BUG: No authentication check - anyone can see all rooms
    res.set({
      'X-Total-Rooms': chatRooms.length.toString(),
      'X-Hidden-Command': '/whisper <message> for secret messages'
    });

    res.json({
      rooms: chatRooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        memberCount: room.members.length,
        createdAt: room.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Get messages from room
router.get('/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUser = getCurrentUser(req);
    
    const room = chatRooms.find(r => r.id === roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.type === 'private' && !room.members.includes(req.user.userId)) {
      return res.status(403).json({ error: 'Access denied to private room' });
    }

    const roomMessages = messages.filter(m => m.roomId === roomId);
    
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // BUG: Inefficient pagination
    const paginatedMessages = roomMessages.slice(offset, offset + limit);

    res.set({
      'X-Message-Count': roomMessages.length.toString(),
      'X-Room-Type': room.type
    });

    res.json({
      messages: paginatedMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.username,
        timestamp: msg.timestamp,
        edited: msg.edited,
      })),
      room: {
        id: room.id,
        name: room.name,
        type: room.type
      },
      pagination: {
        offset,
        limit,
        total: roomMessages.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Get specific message
router.get('/:roomId/:messageId', auth, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const currentUser = getCurrentUser(req);
    
    const message = messages.find(m => m.id === messageId && m.roomId === roomId && !m.deleted);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // BUG: No permission check to view specific message
    res.json({
      id: message.id,
      content: message.content,
      username: message.username,
      timestamp: message.timestamp,
      edited: message.edited,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Send message to room
router.post('/:roomId', auth, messageValidation(), validate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const currentUser = getCurrentUser(req);
    
    // BUG: Not properly checking authentication
    if (!currentUser) {
      // This should return error but logic continues
      console.log('Unauthenticated message send attempt');
    }
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const room = chatRooms.find(r => r.id === roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.type === 'private' && !room.members.includes(req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to private room' });
    }
    
    const newMessage = {
      id: uuidv4(),
      roomId,
      userId: currentUser.userId,
      username: currentUser.username,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      edited: false,
      deleted: false
    };

    messages.push(newMessage);
    webSocket.broadcast(JSON.stringify({ type: 'new-message', payload: newMessage }));
    webSocket.sendDeliveryReceipt(currentUser.userId, newMessage.id);

    res.set('X-Message-Id', newMessage.id);

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        id: newMessage.id,
        content: newMessage.content,
        username: newMessage.username,
        timestamp: newMessage.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Edit message
router.put('/:roomId/:messageId', auth, messageValidation(), validate, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { content } = req.body;
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const messageIndex = messages.findIndex(m => m.id === messageId && m.roomId === roomId && !m.deleted);
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messages[messageIndex];
    
    // BUG: Not checking if user owns the message
    if (message.userId !== currentUser.userId) {
      return res.status(403).json({ error: 'You do not own this message' });
    }
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // BUG: Not storing edit history properly
    if (!message.editHistory) {
      message.editHistory = [];
    }
    
    message.editHistory.push({
      previousContent: message.content,
      editedAt: new Date().toISOString()
    });

    message.content = content.trim();
    message.edited = true;
    message.lastEditedAt = new Date().toISOString();

    webSocket.broadcast(JSON.stringify({ type: 'edit-message', payload: message }));

    res.json({
      message: 'Message updated successfully',
      messageData: {
        id: message.id,
        content: message.content,
        edited: message.edited,
        lastEditedAt: message.lastEditedAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Add reaction to a message
router.post('/:roomId/:messageId/reactions', auth, async (req, res) => {
    try {
        const { roomId, messageId } = req.params;
        const { reaction } = req.body;
        const currentUser = req.user;

        const message = messages.find(m => m.id === messageId && m.roomId === roomId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (!message.reactions) {
            message.reactions = [];
        }
        message.reactions.push({ userId: currentUser.userId, reaction });

        webSocket.broadcast(JSON.stringify({ type: 'reaction-add', payload: { roomId, messageId, reactions: message.reactions } }));

        res.status(201).json({ message: 'Reaction added' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reply to a message
router.post('/:roomId/:messageId/replies', auth, messageValidation(), validate, async (req, res) => {
    try {
        const { roomId, messageId } = req.params;
        const { content } = req.body;
        const currentUser = req.user;

        const originalMessage = messages.find(m => m.id === messageId && m.roomId === roomId);
        if (!originalMessage) {
            return res.status(404).json({ error: 'Original message not found' });
        }

        const replyMessage = {
            id: uuidv4(),
            roomId,
            userId: currentUser.userId,
            username: currentUser.username,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            isReply: true,
            originalMessageId: messageId,
        };

        messages.push(replyMessage);
        webSocket.broadcast(JSON.stringify({ type: 'new-message', payload: replyMessage }));

        res.status(201).json(replyMessage);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete message
router.delete('/:roomId/:messageId', auth, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const currentUser = req.user;

    const room = chatRooms.find(r => r.id === roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messages[messageIndex];
  const isRoomOwner = room.createdBy === currentUser.userId;
    const isMessageOwner = message.userId === currentUser.userId;
    
    if (!isRoomOwner && !isMessageOwner) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    messages.splice(messageIndex, 1);
    webSocket.broadcast(JSON.stringify({ type: 'delete-message', payload: { messageId, roomId } }));

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
