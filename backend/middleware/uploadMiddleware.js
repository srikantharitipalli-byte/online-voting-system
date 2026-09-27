const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Target directories for candidate photos and party symbols
const CANDIDATES_DIR = path.join(__dirname, '..', 'uploads', 'candidates');
const SYMBOLS_DIR = path.join(__dirname, '..', 'uploads', 'symbols');

// Ensure upload directories exist
if (!fs.existsSync(CANDIDATES_DIR)) {
  fs.mkdirSync(CANDIDATES_DIR, { recursive: true });
}
if (!fs.existsSync(SYMBOLS_DIR)) {
  fs.mkdirSync(SYMBOLS_DIR, { recursive: true });
}

// Allowed extensions and MIME types
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml'
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Multipart/form-data parser middleware for image uploads (candidate photos & party symbols)
 */
const uploadMiddleware = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // If not multipart, continue to standard body parsing
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return res.status(400).json({ status: 'error', message: 'Invalid multipart boundary.' });
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  const chunks = [];
  let totalSize = 0;

  req.on('data', (chunk) => {
    chunks.push(chunk);
    totalSize += chunk.length;
    if (totalSize > 15 * 1024 * 1024) {
      req.pause();
      return res.status(400).json({ status: 'error', message: 'Total payload exceeds size limit.' });
    }
  });

  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks);
      req.body = req.body || {};
      req.files = req.files || {};

      let startIndex = 0;

      while (startIndex < buffer.length) {
        const nextBoundary = buffer.indexOf(boundaryBuffer, startIndex);
        if (nextBoundary === -1) break;

        const partStart = nextBoundary + boundaryBuffer.length;
        if (partStart >= buffer.length) break;

        // Check if this is the closing boundary
        if (buffer.subarray(nextBoundary, nextBoundary + endBoundaryBuffer.length).equals(endBoundaryBuffer)) {
          break;
        }

        // Search for end of headers \r\n\r\n
        const headerEnd = buffer.indexOf('\r\n\r\n', partStart);
        if (headerEnd === -1) {
          startIndex = partStart;
          continue;
        }

        const headersText = buffer.subarray(partStart, headerEnd).toString('utf8');
        const contentStart = headerEnd + 4;

        // Next boundary marks end of content
        const nextBoundaryPos = buffer.indexOf(boundaryBuffer, contentStart);
        if (nextBoundaryPos === -1) break;

        // Content ends before the \r\n preceding the next boundary
        let contentEnd = nextBoundaryPos;
        if (buffer[contentEnd - 2] === 0x0D && buffer[contentEnd - 1] === 0x0A) {
          contentEnd -= 2;
        }

        const partBuffer = buffer.subarray(contentStart, contentEnd);
        startIndex = nextBoundaryPos;

        // Parse headers
        const dispositionMatch = headersText.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
        if (!dispositionMatch) continue;

        const fieldName = dispositionMatch[1];
        const originalFilename = dispositionMatch[2];

        if (originalFilename !== undefined) {
          // It's a file field
          if (!originalFilename || partBuffer.length === 0) {
            continue; // Empty file upload
          }

          if (partBuffer.length > MAX_FILE_SIZE_BYTES) {
            return res.status(400).json({
              status: 'error',
              message: `File "${originalFilename}" exceeds the 5MB size limit.`
            });
          }

          const rawExt = path.extname(originalFilename).toLowerCase();
          const ext = rawExt === '.jpeg' ? '.jpg' : rawExt;

          if (!ALLOWED_EXTENSIONS.has(ext)) {
            return res.status(400).json({
              status: 'error',
              message: `Invalid file format for "${originalFilename}". Only JPG, PNG, WEBP, and SVG images are allowed.`
            });
          }

          const typeMatch = headersText.match(/Content-Type:\s*([^\r\n]+)/i);
          const mimeType = typeMatch ? typeMatch[1].trim().toLowerCase() : '';

          if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType) && !ALLOWED_EXTENSIONS.has(ext)) {
            return res.status(400).json({
              status: 'error',
              message: `Invalid MIME type for "${originalFilename}". Only image files are allowed.`
            });
          }

          // Determine target directory and path prefix based on field
          const isSymbol = fieldName.toLowerCase().includes('symbol');
          const prefix = isSymbol ? 'symbol' : 'photo';
          const targetDir = isSymbol ? SYMBOLS_DIR : CANDIDATES_DIR;
          const urlPrefix = isSymbol ? '/uploads/symbols/' : '/uploads/candidates/';

          const uniqueFilename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
          const savePath = path.join(targetDir, uniqueFilename);

          fs.writeFileSync(savePath, partBuffer);

          const relativePath = `${urlPrefix}${uniqueFilename}`;
          req.files[fieldName] = {
            filename: uniqueFilename,
            path: relativePath,
            size: partBuffer.length,
            mimetype: mimeType || 'image/jpeg'
          };
          req.body[fieldName] = relativePath;

        } else {
          // It's a text field
          req.body[fieldName] = partBuffer.toString('utf8').trim();
        }
      }

      next();
    } catch (err) {
      console.error('Multipart parsing error:', err);
      return res.status(400).json({ status: 'error', message: 'Failed to process file upload.' });
    }
  });

  req.on('error', (err) => {
    console.error('Upload stream error:', err);
    return res.status(500).json({ status: 'error', message: 'Upload stream failed.' });
  });
};

module.exports = uploadMiddleware;
