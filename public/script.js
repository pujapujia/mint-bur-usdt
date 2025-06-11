console.log('SCRIPT LOADING:', new Date().toISOString());

const statusElement = document.getElementById('status');
const actionBox = document.getElementById('actionBox');
const amountIn = document.getElementById('amountIn');
const feeInfo = document.getElementById('feeInfo');
const mintButton = document.getElementById('mintButton');
const burnButton = document.getElementById('burnButton');
const txInfo = document.getElementById('txInfo');
const txCode = txInfo.querySelector('code');

const CHIPS_TESTNET = {
  chainId: '0x2ca', // Hex untuk chainId 714
  chainName: 'CHIP DEV', // Nama jaringan sesuai saran @chipsprotocol
  rpcUrls: ['https://chips-rpc-proxy.farahazarii70.workers.dev/'], // Gunakan HTTPS berdasarkan saran
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 }
};

// Alamat kontrak (pastikan sudah benar setelah deploy)
const FEE_RECEIVER = typeof ethers !== 'undefined' ? ethers.utils.getAddress("0x0079352b27fDce7DDB744644dEFBcdB99cb5A9b9") : "0x0079352b27fDce7DDB744644dEFBcdB99cb5A9b9";
let USDT_ADDRESS = "0x47C9e3E4078Edb31b24C72AF65d64dA21041801E"; // Placeholder
let DEX_ADDRESS = "0x473fBeB25eE782b088e3F921031108B8D5DD44d2"; // Placeholder

console.log('Using addresses:', { FEE_RECEIVER, USDT_ADDRESS, DEX_ADDRESS });

const DEX_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "mintUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "burnUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const USDT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectBtn');

  if (!connectBtn || !statusElement || !actionBox) {
    statusElement.innerText = 'Error: DOM element not found!';
    console.error('DOM elements missing');
    statusElement.classList.add('error');
    return;
  }

  if (typeof ethers === 'undefined') {
    statusElement.innerText = 'Error: Ethers.js not loaded!';
    console.error('Ethers.js not loaded');
    statusElement.classList.add('error');
    return;
  }

  if (!window.ethereum) {
    statusElement.innerText = 'Error: MetaMask or other wallet not detected!';
    console.error('Wallet not detected');
    statusElement.classList.add('error');
    return;
  }

  connectBtn.addEventListener('click', connectWallet);
  mintButton.addEventListener('click', initiateMint);
  burnButton.addEventListener('click', initiateBurn);
  amountIn.addEventListener('input', updateFeeInfo);

  actionBox.style.display = 'block';
  setInterval(checkWalletConnection, 10000);
});

let provider, jsonRpcProvider, signer, account;
let isConnecting = false;

// Gunakan HTTPS RPC URL
jsonRpcProvider = new ethers.providers.JsonRpcProvider('https://20.63.3.101:8545', {
  chainId: 714,
});

async function checkWalletConnection() {
  if (!provider || !window.ethereum || isConnecting) return;
  try {
    const network = await provider.getNetwork().catch(() => ({ chainId: 714, name: 'unknown' }));
    if (network.chainId !== 714) {
      console.warn('Wrong network, switching...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2ca' }],
      });
    }
    const accounts = await provider.send('eth_accounts', []);
    if (accounts.length === 0) {
      console.warn('Wallet disconnected!');
      statusElement.innerText = 'Wallet disconnected! Please reconnect.';
      statusElement.classList.add('error');
      mintButton.disabled = true;
      burnButton.disabled = true;
      txInfo.style.display = 'none';
    }
  } catch (error) {
    console.error('Wallet connection check failed:', error);
  }
}

async function connectWallet() {
  if (isConnecting) {
    console.warn('Already connecting, please wait...');
    return;
  }
  try {
    isConnecting = true;
    if (!window.ethereum) {
      throw new Error('Install MetaMask or Rabby Wallet!');
    }

    let attempts = 3;
    while (attempts > 0) {
      try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        let network;
        try {
          network = await provider.getNetwork();
        } catch (networkError) {
          console.warn('Network detection failed, assuming CHIPS Testnet:', networkError);
          network = { chainId: 714, name: 'unknown' };
        }
        console.log('Network detected:', network);

        if (network.chainId !== 714) {
          console.log('Wrong network, switching to CHIPS Testnet...');
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2ca' }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              console.log('CHIPS Testnet not found, adding...');
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [CHIPS_TESTNET],
              });
            } else {
              throw switchError;
            }
          }
        }

        const newNetwork = await provider.getNetwork().catch(() => ({ chainId: 714, name: 'unknown' }));
        if (newNetwork.chainId !== 714) {
          throw new Error(`Failed to switch to CHIPS Testnet, still on chainId: ${newNetwork.chainId}`);
        }

        const accounts = await provider.send('eth_requestAccounts', []);
        account = accounts[0];
        signer = provider.getSigner();

        provider = new ethers.providers.Web3Provider(window.ethereum, {
          chainId: 714,
          timeout: 90000,
        });

        statusElement.innerText = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
        statusElement.classList.add('success');
        mintButton.disabled = false;
        burnButton.disabled = false;
        break;
      } catch (e) {
        attempts--;
        console.warn(`Connection attempt failed (${attempts} left):`, e.message);
        if (attempts === 0) throw new Error(`Connection failed: ${e.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Unknown error';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
    console.error('Wallet connection error:', error);
    txInfo.style.display = 'none';
  } finally {
    isConnecting = false;
  }
}

async function updateFeeInfo() {
  if (!amountIn.value) {
    feeInfo.innerText = 'Fee: 0.1 CHIPS';
    return;
  }
  try {
    const inputValue = parseFloat(amountIn.value);
    if (isNaN(inputValue) || inputValue <= 0) {
      throw new Error('Invalid input amount');
    }
    feeInfo.innerText = `Fee: 0.1 CHIPS${inputValue > 0 ? `, Total CHIPS: ${inputValue + 0.1} (Mint)` : ''}`;
  } catch (error) {
    feeInfo.innerText = 'Fee: 0.1 CHIPS';
    console.error('Fee info update error:', error);
  }
}

async function initiateMint() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    txInfo.style.display = 'none';
    return;
  }
  try {
    console.log('Initializing DEX contract for mint at address:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    const nonce = await provider.getTransactionCount(account, 'pending');

    const code = await jsonRpcProvider.getCode(DEX_ADDRESS).catch((err) => {
      console.error('Failed to fetch contract code:', err);
      return '0x';
    });
    if (code === '0x') {
      throw new Error('DEX contract not found at the specified address. Please verify the contract address and network.');
    }

    const tx = await contract.mintUsdt(amount, {
      value: amount.add(fee),
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
      nonce,
    });

    statusElement.innerText = 'Minting in progress...';
    txInfo.style.display = 'block';
    txCode.innerText = `Transaction Hash: ${tx.hash}`;
    await tx.wait();
    statusElement.innerText = 'Minting completed!';
    statusElement.classList.add('success');
    txCode.innerText = `Transaction Hash: ${tx.hash} (Confirmed)`;
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Unknown error';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
    console.error('Mint error:', error);
    txInfo.style.display = 'none';
    if (error.message.includes('bad address checksum')) {
      console.warn('Checksum error detected, check contract addresses!');
    }
  }
}

async function initiateBurn() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    txInfo.style.display = 'none';
    return;
  }
  try {
    console.log('Initializing DEX contract for burn at address:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    console.log('Initializing USDT contract for burn at address:', USDT_ADDRESS);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    let nonce = await provider.getTransactionCount(account, 'pending');

    const allowance = await usdtContract.allowance(account, DEX_ADDRESS);
    if (allowance.lt(amount)) {
      const approveTx = await usdtContract.approve(DEX_ADDRESS, amount, {
        gasPrice: ethers.utils.parseUnits("10", "gwei"),
        nonce,
      });
      await approveTx.wait();
      nonce++;
    }

    const code = await jsonRpcProvider.getCode(DEX_ADDRESS).catch((err) => {
      console.error('Failed to fetch contract code:', err);
      return '0x';
    });
    if (code === '0x') {
      throw new Error('DEX contract not found at the specified address. Please verify the contract address and network.');
    }

    const tx = await contract.burnUsdt(amount, {
      value: fee,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
      nonce,
    });

    statusElement.innerText = 'Burning in progress...';
    txInfo.style.display = 'block';
    txCode.innerText = `Transaction Hash: ${tx.hash}`;
    await tx.wait();
    statusElement.innerText = 'Burning completed!';
    statusElement.classList.add('success');
    txCode.innerText = `Transaction Hash: ${tx.hash} (Confirmed)`;
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Unknown error';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
    console.error('Burn error:', error);
    txInfo.style.display = 'none';
  }
}
