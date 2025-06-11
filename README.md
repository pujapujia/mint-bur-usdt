# CHIPS Testnet Mint/Burn DApp

A decentralized application (DApp) for minting and burning USDT tokens on the CHIPS Testnet (chainId: 714). Built with Hardhat, Ethers.js, and deployed on Vercel.

## Features
- Mint USDT from CHIPS (1:1 ratio, 0.1 CHIPS fee).
- Burn USDT to CHIPS (1:1 ratio, 0.1 CHIPS fee).
- Pixel art UI with transaction hash display.
- Fee sent to `0x0079352b27fDce7DDB744644dEFBcdB99cb5A9b9`.

## Directory Structure
- `contracts/`: Solidity smart contracts (`DEX.sol`, `USDT.sol`).
- `public/`: Frontend files (`index.html`, `script.js`).
- `vercel.json`: Vercel configuration.

## Setup
1. Deploy contracts locally using Hardhat:
   ```bash
   npm install
   npx hardhat compile
   npm run deploy
