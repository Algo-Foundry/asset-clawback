## Asset clawback assignment

Perform an asset clawback from one account to another. You are required to do the following,

1. Create the asset. It can be an NFT or a fungible token.
2. Send this asset to an account.
3. Perform a clawback of this asset and send it to another account.

Write your solution in the skeleton code provided in `clawback.js`

### Setup instructions
1. Install packages with `npm install`.
2. Copy `.env.example` to `.env`.
3. Update Algorand Sandbox credentials in `.env` file.
4. Use variables from `.env` file by running `source .env`.

### Running your script
2. Run your script with `node clawback.js`.

### Key points to remember
1. The receiver accounts should have sufficient minimum balance.
2. Accounts need to be opted into the asset before receiving it.
3. You should set a clawback address to the asset.