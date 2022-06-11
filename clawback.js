const algosdk = require("algosdk");

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

const creator = algosdk.mnemonicToSecretKey(process.env.MNEMONIC_CREATOR);

const submitToNetwork = async (signedTxn) => {
  // send txn
  let tx = await algodClient.sendRawTransaction(signedTxn).do();
  console.log("Transaction : " + tx.txId);

  // Wait for transaction to be confirmed
  confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);

  //Get the completed Transaction
  console.log(
    "Transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  return confirmedTxn;
};

const createAsset = async (maker, clawbackAcc) => {
  const total = 1; // how many of this asset there will be
  const decimals = 0; // units of this asset are whole-integer amounts
  const assetName = "nftASA";
  const unitName = "nft";
  const url = "ipfs://cid";
  const metadata = undefined;
  const defaultFrozen = false; // whether accounts should be frozen by default

  // create suggested parameters
  const suggestedParams = await algodClient.getTransactionParams().do();

  // create the asset creation transaction
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: maker.addr,
    total,
    decimals,
    assetName,
    unitName,
    assetURL: url,
    assetMetadataHash: metadata,
    defaultFrozen,
    freeze: undefined,
    manager: undefined,
    clawback: clawbackAcc.addr, // the creator account can perform the clawback
    reserve: undefined,

    suggestedParams,
  });

  // sign the transaction
  const signedTxn = txn.signTxn(maker.sk);

  return await submitToNetwork(signedTxn);
};

const sendAlgos = async (sender, receiver, amount) => {
  // create suggested parameters
  const suggestedParams = await algodClient.getTransactionParams().do();

  let txn = algosdk.makePaymentTxnWithSuggestedParams(
    sender.addr,
    receiver.addr,
    amount,
    undefined,
    undefined,
    suggestedParams
  );

  // sign the transaction
  const signedTxn = txn.signTxn(sender.sk);

  const confirmedTxn = await submitToNetwork(signedTxn);
};

(async () => {
  // Accounts
  const receiver = algosdk.generateAccount();
  const clawbackTo = algosdk.generateAccount();

  // Fund accounts
  console.log("Funding accounts...");
  await sendAlgos(creator, receiver, 1e6); // 1 Algo
  await sendAlgos(creator, clawbackTo, 1e6); // 1 Algo

  // Create asset - creator can perform clawback
  const res = await createAsset(creator, creator);
  const assetId = res["asset-index"];
  console.log(`NFT created. Asset ID is ${assetId}`);

  const suggestedParams = await algodClient.getTransactionParams().do();

  // Receiver opts into asset
  console.log("Receiver opts into asset...");
  let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    receiver.addr,
    receiver.addr,
    undefined,
    undefined,
    0,
    undefined,
    assetId,
    suggestedParams
  );
  let signedTxn1 = txn1.signTxn(receiver.sk);
  await submitToNetwork(signedTxn1);

  // Send asset
  console.log("Sending asset to receiver...");
  let txn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    creator.addr,
    receiver.addr,
    undefined,
    undefined,
    1,
    undefined,
    assetId,
    suggestedParams
  );
  let signedTxn2 = txn2.signTxn(creator.sk);
  await submitToNetwork(signedTxn2);

  // New recepient account opts into asset
  console.log("New recepient opts into asset...");
  let txn3 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    clawbackTo.addr,
    clawbackTo.addr,
    undefined,
    undefined,
    0,
    undefined,
    assetId,
    suggestedParams
  );
  let signedTxn3 = txn3.signTxn(clawbackTo.sk);
  await submitToNetwork(signedTxn3);

  // Perform asset clawback
  console.log("Perform asset clawback...");
  let txn4 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    creator.addr,
    clawbackTo.addr, // asset will be sent to this address
    undefined,
    receiver.addr, // asset will be clawed back from this address
    1,
    undefined,
    assetId,
    suggestedParams
  );
  let signedTxn4 = txn4.signTxn(creator.sk);
  await submitToNetwork(signedTxn4);

  // Check your work
  console.log("Receiver assets: ", (await algodClient.accountInformation(receiver.addr).do()).assets);
  console.log("New recepient assets: ", (await algodClient.accountInformation(clawbackTo.addr).do()).assets);
})();
