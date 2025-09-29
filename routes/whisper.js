// SECRET WHISPER ENDPOINT - Discovered through header hint
// Header hint: "whisper_endpoint_needs_decryption_key"

const express = require('express');
const { auth } = require('../middleware/auth');
const { messageValidation, validate } = require('../middleware/validators');
const upload = require('../middleware/fileUpload');
const webSocket = require('../websocket');
const { whisperMessages, FINAL_CIPHER } = require('../data');

const router = express.Router();

const DECRYPTION_KEY = process.env.ADMIN_API_KEY;

// Simple XOR encryption/decryption
function xorEncryptDecrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// Caesar cipher implementation
function caesarDecode(text, shift) {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode((char.charCodeAt(0) - start - shift + 26) % 26 + start);
  });
}

// Get whisper messages
router.get('/', auth, async (req, res) => {
  try {
    const currentUser = req.user;
    const accessLevel = currentUser.role;

    let responseData = {
      accessLevel,
      whisperMessages: [],
      decryptionTools: {}
    };

    if (accessLevel === 'basic') {
      responseData.whisperMessages = [
        {
          id: 'sample',
          content: 'This is a sample whisper message',
          sender: 'system',
          encrypted: false
        }
      ];
    } else if (accessLevel === 'authenticated') {
      responseData.whisperMessages = whisperMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        recipient: msg.recipient,
        encrypted: msg.encrypted,
        timestamp: msg.timestamp,
        decryptionHint: msg.decryptionHint
      }));
    } else if (accessLevel === 'admin' || accessLevel === 'system') {
      // Provide decryption tools for admin/system access
      responseData.whisperMessages = whisperMessages.map(msg => ({
        id: msg.id,
        encryptedContent: msg.content,
        // Decrypt using different methods based on the message
        decryptedContent: msg.id === 'w1' ?
          'Secret admin meeting at midnight' :
          caesarDecode('Whzzdvyk ylzla mvy bzly hspjl: altw123', 7),
        sender: msg.sender,
        recipient: msg.recipient,
        timestamp: msg.timestamp,
        decryptionMethod: msg.id === 'w1' ? 'Original hash comparison' : 'Caesar cipher shift 7'
      }));

      responseData.decryptionTools = {
        xorDecrypt: 'Use xorEncryptDecrypt function with key',
        caesarDecrypt: 'Use caesarDecode function with shift value',
        availableKeys: ['chat-master-key-2024'],
        finalPuzzle: FINAL_CIPHER,
        puzzleHint: 'Decode with ROT13'
      };
    }

    res.set({
      'X-Access-Level': accessLevel,
      'X-Whisper-Count': responseData.whisperMessages.length.toString(),
      'X-Decryption-Available': (accessLevel === 'admin' || accessLevel === 'system') ? 'true' : 'false',
      'Cache-Control': 'no-cache'
    });

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send whisper message
router.post('/', auth, messageValidation(), validate, async (req, res) => {
  try {
    const currentUser = req.user;
    const { content, recipient, encrypt = false, encryptionMethod = 'xor' } = req.body;

    if (encrypt) {
        // Placeholder for client-side public key
        const clientPublicKey = '...'; 
        // In a real E2EE scenario, you would use the recipient's public key to encrypt the content
        // For this example, we'll just mark it as encrypted
    }

    const whisperMessage = {
      id: `w${Date.now()}`,
      content: encrypt ? xorEncryptDecrypt(content, DECRYPTION_KEY) : content,
      sender: currentUser.username,
      recipient,
      encrypted: encrypt,
      timestamp: new Date().toISOString(),
      encryptionMethod: encrypt ? encryptionMethod : 'none'
    };

    whisperMessages.push(whisperMessage);

    res.status(201).json({
      message: 'Whisper message sent successfully',
      whisperData: {
        id: whisperMessage.id,
        encrypted: whisperMessage.encrypted,
        recipient: whisperMessage.recipient,
        timestamp: whisperMessage.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload file
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.status(201).json({
        message: 'File uploaded successfully',
        fileUrl: req.file.location
    });
});

module.exports = router;
