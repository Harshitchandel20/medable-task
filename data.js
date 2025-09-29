const bcrypt = require('bcrypt');

const hashPassword = (password) => bcrypt.hashSync(password, 12);

const users = [
	{
		id: 'user1',
		username: 'alice',
		email: 'alice@chat.com',
		password: hashPassword('password123'),
		status: 'online',
		lastSeen: new Date().toISOString(),
		role: 'admin',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
		createdAt: new Date('2024-01-01T00:00:00Z').toISOString()
	},
	{
		id: 'user2',
		username: 'bob',
		email: 'bob@chat.com',
		password: hashPassword('bobsecret'),
		status: 'offline',
		lastSeen: new Date(Date.now() - 3600000).toISOString(),
		role: 'user',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
		createdAt: new Date('2024-01-01T00:05:00Z').toISOString()
	},
	{
		id: 'user3',
		username: 'charlie',
		email: 'charlie@chat.com',
		password: hashPassword('charlie2024'),
		status: 'online',
		lastSeen: new Date().toISOString(),
		role: 'moderator',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
		createdAt: new Date('2024-01-01T00:10:00Z').toISOString()
	}
];

const chatRooms = [
	{
		id: 'general',
		name: 'General Chat',
		type: 'public',
		createdBy: 'user1',
		members: ['user1', 'user2', 'user3'],
		createdAt: new Date('2024-01-01T08:00:00Z').toISOString()
	},
	{
		id: 'private',
		name: 'Private Room',
		type: 'private',
		createdBy: 'user1',
		members: ['user1'],
		createdAt: new Date('2024-01-01T08:30:00Z').toISOString()
	}
];

const messages = [
	{
		id: '1',
		roomId: 'general',
		userId: 'user1',
		username: 'alice',
		content: 'Welcome to the chat!',
		timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
		edited: false,
		deleted: false
	},
	{
		id: '2',
		roomId: 'general',
		userId: 'user2',
		username: 'bob',
		content: 'Hello everyone!',
		timestamp: new Date('2024-01-01T10:01:00Z').toISOString(),
		edited: false,
		deleted: false
	},
	{
		id: '3',
		roomId: 'private',
		userId: 'user1',
		username: 'alice',
		content: 'This is a private message',
		timestamp: new Date('2024-01-01T10:02:00Z').toISOString(),
		edited: false,
		deleted: false
	}
];

const whisperMessages = [
	{
		id: 'w1',
		encrypted: true,
		content: require('crypto').createHash('sha256').update('Secret admin meeting at midnight').digest('hex'),
		sender: 'admin',
		recipient: 'moderator',
		timestamp: new Date().toISOString(),
		decryptionHint: 'Use key: "chat-master-key-2024"'
	},
	{
		id: 'w2',
		encrypted: true,
		content: require('crypto').createHash('sha256').update('Password reset for user alice: temp123').digest('hex'),
		sender: 'system',
		recipient: 'admin',
		timestamp: new Date().toISOString(),
		decryptionHint: 'Caesar cipher with shift 7'
	}
];

const FINAL_CIPHER = 'Pbatenghyngvbaf! Lbh qrpelcgrq gur juvfcre zrffntrf. Svany pyhrf: ERNY_GVZR_JROFBPXRG_2024';

module.exports = {
	users,
	chatRooms,
	messages,
	whisperMessages,
	FINAL_CIPHER
};
