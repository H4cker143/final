/**
 * ProofOfCreate - Core Application Logic
 * Hackathon Demo Version (Web3 Ethereum/Polygon Backend)
 */

// Your custom Deployed Contract Address from Remix
const CONTRACT_ADDRESS = '0x5D1a00Ca453916ffC6ab13f5284c16D09eF2ce99';

// The ABI you copied from Remix Compiler 
const CONTRACT_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "contentHash",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "ContentRegistered",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "contentHash",
                "type": "bytes32"
            }
        ],
        "name": "getContent",
        "outputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "contentHash",
                "type": "bytes32"
            }
        ],
        "name": "registerContent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalRegistrations",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const app = {
    // --- STATE ---
    currentAccount: null,
    currentHash: null,
    provider: null,
    signer: null,
    contract: null,

    // --- INITIALIZATION ---
    init() {
        this.navigate('home');
        this.checkIfWalletIsConnected();

        // Setup Web3 Listeners
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    this.connectWallet(); // Reconnect implicitly
                } else {
                    this.currentAccount = null;
                    this.updateAuthUI();
                    this.navigate('home');
                }
            });
        }
    },

    // --- ROUTING ---
    navigate(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.add('hidden');
        });

        // Reset Dropzones & Preview states
        if (viewId === 'register' || viewId === 'verify') {
            const p = document.getElementById(`${viewId}-preview`);
            if (p) p.classList.add('hidden');
            const s = document.getElementById(`${viewId}-status`);
            if (s) s.classList.add('hidden');
            const r = document.getElementById(`${viewId}-result`);
            if (r) r.classList.add('hidden');
            const f = document.getElementById(`${viewId}-upload`);
            if (f) f.value = ""; // clear file input
        }

        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
        }

        // Update Nav links
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const activeLink = document.getElementById(`nav-${viewId}`);
        if (activeLink) activeLink.classList.add('active');

        // View specific logic
        if (viewId === 'dashboard') {
            this.renderDashboard();
        }
    },

    // --- WEB3 AUTHENTICATION (METAMASK) ---
    async checkIfWalletIsConnected() {
        try {
            if (!window.ethereum) return;

            // Ethers v6 Setup
            this.provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await this.provider.send("eth_accounts", []);

            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.signer = await this.provider.getSigner();
                this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
                this.updateAuthUI();
            }
        } catch (error) {
            console.error("Wallet hook error:", error);
        }
    },

    async connectWallet() {
        try {
            if (!window.ethereum) {
                alert("Please install MetaMask to use this application.");
                return;
            }

            // Request account access
            this.provider = new ethers.BrowserProvider(window.ethereum);
            await this.provider.send("eth_requestAccounts", []);

            this.signer = await this.provider.getSigner();
            this.currentAccount = await this.signer.getAddress();

            // Initialize Contract
            this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);

            this.updateAuthUI();
            this.navigate('dashboard');
        } catch (error) {
            console.error("Connection failed", error);
        }
    },

    updateAuthUI() {
        const btn = document.getElementById('auth-btn');
        const heroBtn = document.getElementById('hero-auth-btn');
        const navDash = document.getElementById('nav-dashboard');
        const navReg = document.getElementById('nav-register');
        const dispName = document.getElementById('user-display-name');

        if (this.currentAccount) {
            const shortAddr = `${this.currentAccount.substring(0, 6)}...${this.currentAccount.substring(38)}`;
            btn.innerText = shortAddr;
            if (heroBtn) heroBtn.innerText = "Go to Dashboard";
            if (heroBtn) heroBtn.onclick = () => this.navigate('dashboard');
            navDash.classList.remove('hidden');
            navReg.classList.remove('hidden');
            if (dispName) dispName.innerText = shortAddr;
        } else {
            btn.innerText = "Connect Wallet";
            if (heroBtn) heroBtn.innerText = "Connect Web3 Wallet";
            if (heroBtn) heroBtn.onclick = () => this.connectWallet();
            navDash.classList.add('hidden');
            navReg.classList.add('hidden');
        }
    },

    // --- HASHING UTILITY ---
    async handleFileSelect(event, context) {
        const file = event.target.files[0];
        if (!file) return;

        // Read file via ArrayBuffer and hash using Crypto API
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const finalHash = '0x' + hashHex;

            if (context === 'register') {
                this.currentHash = finalHash;
                document.getElementById('register-hash-display').innerText = finalHash;
                document.getElementById('register-preview').classList.remove('hidden');
                document.getElementById('register-status').classList.add('hidden');
            } else if (context === 'verify') {
                this.verifyOnBlockchain(finalHash);
            }
        };
        reader.readAsArrayBuffer(file);
    },

    // --- SMART CONTRACT INTERACTION (WEB3) ---

    // Registering logic
    async registerOnBlockchain() {
        if (!this.currentHash || !this.contract) return;

        const statusEl = document.getElementById('register-status');
        statusEl.classList.remove('hidden', 'badge-success', 'badge-error');

        // Simulate Blockchain / Supabase call state
        statusEl.innerHTML = "Opening MetaMask... please sign the transaction.";
        statusEl.style.backgroundColor = 'rgba(255,255,255,0.1)';
        statusEl.style.color = 'white';

        try {
            // 1. First, CHECK if it's already registered via the read function to save gas
            const [owner, timestamp, exists] = await this.contract.getContent(this.currentHash);

            if (exists) {
                statusEl.className = 'mt-4 p-3 rounded badge-error';
                statusEl.innerHTML = `<strong>Registration Failed: Duplicate</strong><br>This content is already copyrighted by <strong>${owner.substring(0, 8)}...</strong> on ${new Date(Number(timestamp) * 1000).toLocaleString()}.<br><span style="font-size:0.8rem; margin-top:8px; display:block;">Tamper-proof record verified on-chain.</span>`;
                return;
            }

            // 2. If it does not exist, send the Write Transaction
            statusEl.innerText = "Transaction Sent! Waiting for block confirmation...";

            const tx = await this.contract.registerContent(this.currentHash);
            await tx.wait(); // Wait for it to be mined

            statusEl.className = 'mt-4 p-3 rounded badge-success';
            statusEl.innerHTML = `<strong>Successfully Minted!</strong><br>Hash confirmed in block.<br><a href="#" style="color:#4ade80;">View TX</a>`;

            setTimeout(() => {
                this.viewCertificate(this.currentHash);
            }, 1500);

        } catch (err) {
            console.error(err);

            let errMsg = "Blockchain error. Did you reject the transaction?";
            if (err.reason && err.reason.includes("already registered")) {
                errMsg = "Execution Reverted: This hash is already minted!";
            }

            statusEl.className = 'mt-4 p-3 rounded badge-error';
            statusEl.innerText = errMsg;
        }
    },

    // Verification Logic
    async verifyOnBlockchain(hashHex) {
        const resEl = document.getElementById('verify-result');
        resEl.classList.remove('hidden', 'badge-success', 'badge-error');

        resEl.innerText = `Querying Blockchain State for hash: ${hashHex.substring(0, 10)}...`;
        resEl.style.backgroundColor = 'rgba(255,255,255,0.1)';
        resEl.style.color = 'white';

        try {
            // Connect a read-only provider if wallet not connected, otherwise use contract.
            let readContract = this.contract;
            if (!readContract) {
                const readProvider = new ethers.BrowserProvider(window.ethereum);
                readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
            }

            const [owner, timestamp, exists] = await readContract.getContent(hashHex);

            if (exists) {
                resEl.className = 'mt-4 p-3 rounded badge-success';
                resEl.innerHTML = `<h3 style="margin-bottom:0.5rem; color: var(--success);">This content is copyrighted.</h3>
          <p style="margin-bottom: 0;">Original Owner Wallet: <strong>${owner.substring(0, 6)}...${owner.substring(38)}</strong></p>
          <p style="margin-bottom: 0; font-size: 0.9rem;">Registered on block at: ${new Date(Number(timestamp) * 1000).toLocaleString()}</p>`;
            } else {
                resEl.className = 'mt-4 p-3 rounded badge-error';
                resEl.innerHTML = `<h3 style="margin-bottom:0.5rem; color: var(--warning);">This content is not copyrighted.</h3>
          <p style="margin-bottom: 0; font-size: 0.9rem;">No record found on the ProofOfCreate Smart Contract for this hash.</p>`;
            }
        } catch (err) {
            console.error(err);
            resEl.className = 'mt-4 p-3 rounded badge-error';
            resEl.innerText = "RPC Error: Ensure you are connected to the correct network where the contract is deployed.";
        }
    },

    // --- DASHBOARD AND CERTIFICATE VIEWS ---
    async renderDashboard() {
        const grid = document.getElementById('dashboard-grid');
        const empty = document.getElementById('dashboard-empty');
        if (!this.currentAccount || !this.contract) return;

        // A real dApp would typically rely on an indexer (like The Graph) or event querying here.
        // Since we just have a basic contract, we will query the past ContentRegistered events to find the user's items.
        grid.innerHTML = '<p>Querying Ethereum logs for your certificates...</p>';
        empty.classList.add('hidden');
        grid.classList.remove('hidden');

        try {
            const filter = this.contract.filters.ContentRegistered(null, this.currentAccount);
            const events = await this.contract.queryFilter(filter, 0, "latest"); // Fetch all from block 0

            if (!events || events.length === 0) {
                grid.classList.add('hidden');
                empty.classList.remove('hidden');
            } else {
                empty.classList.add('hidden');
                grid.classList.remove('hidden');

                grid.innerHTML = events.map(event => {
                    const evHash = event.args.contentHash;
                    const evTime = Number(event.args.timestamp) * 1000;

                    return `
          <div class="glass-card cert-card" onclick="app.viewCertificate('${evHash}')">
            <div class="badge badge-success mb-2" style="font-size: 0.7rem;">Verified on Chain</div>
            <h4 style="margin-bottom: 0.5rem;">Digital Asset</h4>
            <p style="font-family: monospace; font-size: 0.8rem; margin-bottom: 1rem; color: var(--text-tertiary); word-break: break-all;">
              ${evHash.substring(0, 20)}...
            </p>
            <p style="font-size: 0.85rem; margin-bottom: 0; color: var(--text-secondary);">
              ${new Date(evTime).toLocaleDateString()}
            </p>
          </div>
        `}).join('');
            }
        } catch (err) {
            console.error(err);
            grid.innerHTML = '<p style="color:red;">Failed to query blockchain events. Ensure network connection.</p>';
        }
    },

    async viewCertificate(hashHex) {
        try {
            let readContract = this.contract;
            if (!readContract && window.ethereum) {
                const readProvider = new ethers.BrowserProvider(window.ethereum);
                readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
            }

            const [owner, timestamp, exists] = await readContract.getContent(hashHex);

            if (!exists) throw new Error("Cert not found on chain");

            document.getElementById('cert-owner').innerText = owner;
            document.getElementById('cert-owner-id').innerText = "MetaMask Wallet Address";
            document.getElementById('cert-hash').innerText = hashHex;
            document.getElementById('cert-timestamp').innerText = new Date(Number(timestamp) * 1000).toLocaleString();

            this.navigate('certificate');
        } catch (err) {
            console.error(err);
            alert("Could not load certificate from the blockchain.");
        }
    }
};

// Start App
window.onload = () => app.init();
