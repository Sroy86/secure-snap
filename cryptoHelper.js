const crypto = require('crypto');
const fs = require('fs');

// Load SECRET_KEY from environment variables or use a default key (for testing)
require('dotenv').config();
const SECRET_KEY = crypto.createHash('sha256').update(String(process.env.SECRET_KEY || 'default_secret_key')).digest('base64').substring(0, 32);
const IV = Buffer.alloc(16, 0); // Fixed IV for simplicity

// Encrypt function
function encryptFile(inputPath, outputPath) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), IV);
    const input = fs.readFileSync(inputPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    fs.writeFileSync(outputPath, encrypted);
}

// Decrypt function
function decryptFile(inputPath, outputPath) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), IV);
    const encryptedData = fs.readFileSync(inputPath);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    fs.writeFileSync(outputPath, decrypted);
}

module.exports = { encryptFile, decryptFile };
