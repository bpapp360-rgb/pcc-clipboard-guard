const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

// Chrome expects PKCS#1 RSA private key format for --pack-extension-key
const privPem = privateKey.export({ type: 'pkcs1', format: 'pem' });
fs.writeFileSync(path.join(__dirname, 'extension.pem'), privPem);

// Chrome's manifest.json "key" field is base64 SubjectPublicKeyInfo DER
const pubDer = publicKey.export({ type: 'spki', format: 'der' });
const pubBase64 = pubDer.toString('base64');
fs.writeFileSync(path.join(__dirname, 'extension-key.txt'), pubBase64);

// Extension ID: SHA256 of SubjectPublicKeyInfo DER, first 16 bytes, each nibble → 'a'-'p'
const hash = crypto.createHash('sha256').update(pubDer).digest();
const id = Array.from(hash.slice(0, 16))
  .flatMap(function(b) {
    return [
      String.fromCharCode(97 + ((b >> 4) & 0xf)),
      String.fromCharCode(97 + (b & 0xf))
    ];
  })
  .join('');

fs.writeFileSync(path.join(__dirname, 'extension-id.txt'), id);

console.log('Extension ID:  ' + id);
console.log('Key written to: extension-key.txt');
console.log('PEM written to: extension.pem  (DO NOT COMMIT)');
