"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const utils = require("./utils");
// const validate = utils.common.validate
const toCalledAmount = utils.common.toCalledAmount;
const paymentFlags = utils.common.txFlags.Payment;
const ValidationError = utils.common.errors.ValidationError;
function isCALLToCALLPayment(payment) {
    const sourceCurrency = _.get(payment, 'source.maxAmount.currency', _.get(payment, 'source.amount.currency'));
    const destinationCurrency = _.get(payment, 'destination.amount.currency', _.get(payment, 'destination.minAmount.currency'));
    return sourceCurrency === 'CALL' && destinationCurrency === 'CALL';
}
function isIOUWithoutCounterparty(amount) {
    return amount && amount.currency !== 'CALL'
        && amount.counterparty === undefined;
}
function applyAnyCounterpartyEncoding(payment) {
    _.forEach([payment.source, payment.destination], adjustment => {
        _.forEach(['amount', 'minAmount', 'maxAmount'], key => {
            if (isIOUWithoutCounterparty(adjustment[key])) {
                adjustment[key].counterparty = adjustment.issuer;
            }
        });
    });
}
function createMaximalAmount(amount) {
    const maxCALLValue = '100000000000';
    const maxIOUValue = '9999999999999999e80';
    const maxValue = amount.currency === 'CALL' ? maxCALLValue : maxIOUValue;
    return _.assign({}, amount, { value: maxValue });
}
function createPaymentTransaction(address, paymentArgument) {
    const payment = _.cloneDeep(paymentArgument);
    applyAnyCounterpartyEncoding(payment);
    if (address !== payment.source.address) {
        throw new ValidationError('address must match payment.source.address');
    }
    if ((payment.source.maxAmount && payment.destination.minAmount) ||
        (payment.source.amount && payment.destination.amount)) {
        throw new ValidationError('payment must specify either (source.maxAmount '
            + 'and destination.amount) or (source.amount and destination.minAmount)');
    }
    const amount = payment.destination.minAmount && !isCALLToCALLPayment(payment) ?
        createMaximalAmount(payment.destination.minAmount) :
        (payment.destination.amount || payment.destination.minAmount);
    const txJSON = {
        TransactionType: 'Payment',
        Account: payment.source.address,
        Destination: payment.destination.address,
        Amount: toCalledAmount(amount),
        Flags: 0
    };
    if (payment.invoiceID !== undefined) {
        txJSON.InvoiceID = payment.invoiceID;
    }
    if (payment.source.tag !== undefined) {
        txJSON.SourceTag = payment.source.tag;
    }
    if (payment.destination.tag !== undefined) {
        txJSON.DestinationTag = payment.destination.tag;
    }
    if (payment.memos !== undefined) {
        txJSON.Memos = _.map(payment.memos, utils.convertMemo);
    }
    if (payment.noDirectCall === true) {
        txJSON.Flags |= paymentFlags.NoCallDirect;
    }
    if (payment.limitQuality === true) {
        txJSON.Flags |= paymentFlags.LimitQuality;
    }
    if (!isCALLToCALLPayment(payment)) {
        if (payment.allowPartialPayment === true
            || payment.destination.minAmount !== undefined) {
            txJSON.Flags |= paymentFlags.PartialPayment;
        }
        txJSON.SendMax = toCalledAmount(payment.source.maxAmount || payment.source.amount);
        if (payment.destination.minAmount !== undefined) {
            txJSON.DeliverMin = toCalledAmount(payment.destination.minAmount);
        }
        if (payment.paths !== undefined) {
            txJSON.Paths = JSON.parse(payment.paths);
        }
    }
    else if (payment.allowPartialPayment === true) {
        throw new ValidationError('CALL to CALL payments cannot be partial payments');
    }
    return txJSON;
}
function preparePayment(address, payment, instructions = {}) {
    // validate.preparePayment({address, payment, instructions})
    const txJSON = createPaymentTransaction(address, payment);
    return utils.prepareTransaction(txJSON, this, instructions);
}
exports.default = preparePayment;
//# sourceMappingURL=payment.js.map