const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encryptFile, decryptFile } = require('./cryptoHelper');

const app = express();
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const HASH_DB = path.join(UPLOAD_DIR, 'file_hashes.json');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(HASH_DB)) fs.writeFileSync(HASH_DB, JSON.stringify({}));

// Configure Multer to retain original filename
const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Keep the original filename
    }
});
const upload = multer({ storage });

// Function to calculate SHA-256 hash of a file
function calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Upload and encrypt image (checks if the same file exists)
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileHash = calculateFileHash(req.file.path);
    const fileHashes = JSON.parse(fs.readFileSync(HASH_DB, 'utf-8'));

    // Check if the same file (hash) already exists
    if (Object.values(fileHashes).includes(fileHash)) {
        fs.unlinkSync(req.file.path); // Delete the duplicate file
        return res.status(400).json({ message: 'File already exists with a different name' });
    }

    // Store hash with filename
    fileHashes[req.file.originalname] = fileHash;
    fs.writeFileSync(HASH_DB, JSON.stringify(fileHashes, null, 2));

    // Encrypt and save file
    const encryptedPath = path.join(UPLOAD_DIR, `${req.file.originalname}.enc`);
    encryptFile(req.file.path, encryptedPath);
    fs.unlinkSync(req.file.path); // Delete original file after encryption

    res.json({ message: 'File uploaded and encrypted successfully', fileName: req.file.originalname });
});

// Get and decrypt image
app.get('/image/:filename', (req, res) => {
    const encryptedPath = path.join(UPLOAD_DIR, `${req.params.filename}.enc`);
    const decryptedPath = path.join(UPLOAD_DIR, req.params.filename);

    if (!fs.existsSync(encryptedPath)) return res.status(404).json({ message: 'File not found' });

    decryptFile(encryptedPath, decryptedPath);
    res.sendFile(decryptedPath, () => fs.unlinkSync(decryptedPath)); // Delete decrypted file after sending
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
