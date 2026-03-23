// backend/dsaService.js
const crypto = require('crypto');

module.exports = {
    // 1. GENERATE DSA KEYS (Done by Admin upon account creation)
    generateDSAKeys: () => {
        // DSA requires a modulus length (typically 2048) and a divisor length (typically 256)
        const { publicKey, privateKey } = crypto.generateKeyPairSync('dsa', {
            modulusLength: 2048,
            divisorLength: 256, 
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { publicKey, privateKey };
    },

    // 2. SIGN DATA (Faculty uses their hidden Private Key to prove identity)
    signData: (privateKey, dataToSign) => {
        // We hash the data first using SHA-256, then sign that hash with the DSA Private Key
        const sign = crypto.createSign('SHA256');
        sign.update(dataToSign);
        sign.end();
        return sign.sign(privateKey, 'hex'); // Returns the Digital Signature
    },

    // 3. VERIFY DATA (System uses stored Public Key to verify the signature)
    verifyData: (publicKey, dataToVerify, signature) => {
        // The system hashes the data, and uses the DSA Public Key to check if the signature matches
        const verify = crypto.createVerify('SHA256');
        verify.update(dataToVerify);
        verify.end();
        return verify.verify(publicKey, signature, 'hex'); // Returns true (authentic) or false (fake)
    }
};