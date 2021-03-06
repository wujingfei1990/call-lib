"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("./utils");
const keypairs = require("call-keypairs");
const binary = require("call-binary-codec");
const call_hashes_1 = require("call-hashes");
const validate = utils.common.validate;
function computeSignature(tx, privateKey, signAs) {
    const signingData = signAs ?
        binary.encodeForMultisigning(tx, signAs) : binary.encodeForSigning(tx);
    return keypairs.sign(signingData, privateKey);
}
function sign(txJSON, secret, options = {}) {
    validate.sign({ txJSON, secret });
    // we can't validate that the secret matches the account because
    // the secret could correspond to the regular key
    const tx = JSON.parse(txJSON);
    if (tx.TxnSignature || tx.Signers) {
        throw new utils.common.errors.ValidationError('txJSON must not contain "TxnSignature" or "Signers" properties');
    }
    const keypair = keypairs.deriveKeypair(secret);
    tx.SigningPubKey = options.signAs ? '' : keypair.publicKey;
    if (options.signAs) {
        const signer = {
            Account: options.signAs,
            SigningPubKey: keypair.publicKey,
            TxnSignature: computeSignature(tx, keypair.privateKey, options.signAs)
        };
        tx.Signers = [{ Signer: signer }];
    }
    else {
        tx.TxnSignature = computeSignature(tx, keypair.privateKey);
    }
    const serialized = binary.encode(tx);
    return {
        signedTransaction: serialized,
        id: call_hashes_1.computeBinaryTransactionHash(serialized)
    };
}
exports.default = sign;
//# sourceMappingURL=sign.js.map