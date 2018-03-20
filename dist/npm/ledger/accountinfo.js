"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
function formatAccountInfo(response) {
    const data = response.account_data;
    return common_1.removeUndefined({
        sequence: data.Sequence,
        callBalance: common_1.dropsToCall(data.Balance),
        ownerCount: data.OwnerCount,
        previousInitiatedTransactionID: data.AccountTxnID,
        previousAffectingTransactionID: data.PreviousTxnID,
        previousAffectingTransactionLedgerVersion: data.PreviousTxnLgrSeq
    });
}
function getAccountInfo(address, options = {}) {
    common_1.validate.getAccountInfo({ address, options });
    const request = {
        command: 'account_info',
        account: address,
        ledger_index: options.ledgerVersion || 'validated'
    };
    return this.connection.request(request).then(formatAccountInfo);
}
exports.default = getAccountInfo;
//# sourceMappingURL=accountinfo.js.map