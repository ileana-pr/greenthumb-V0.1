# 🌱 GreenThumb - AI Cultivation Assistant

GreenThumb is an AI-powered gardening assistant built on ElizaOS, integrated with Privy for seamless Web3 wallet authentication and USDC stablecoin tipping functionality. Get personalized plant care advice, troubleshooting help, and expert guidance for your gardening journey.

## ✨ Features

- **🤖 AI-Powered Chat Assistant**: Real-time gardening advice powered by ElizaOS
- **🔐 Web3 Authentication**: Seamless login with Google OAuth via Privy
- **💼 Embedded Wallets**: Automatic wallet creation for all users
- **💰 USDC Tipping**: Support your AI assistant with stablecoin tips on Base Sepolia
- **🌐 Multi-Wallet Support**: Works with embedded wallets and external wallets (MetaMask, etc.)
- **📊 Real-Time Balances**: View your ETH and USDC balances in the chat interface
- **🔗 Block Explorer Integration**: Clickable transaction links for transparency

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: ElizaOS (AI agent framework)
- **Web3**: Privy SDK (`@privy-io/react-auth`)
- **Blockchain**: Base Sepolia Testnet
- **Stablecoin**: USDC (ERC-20)
- **Real-time Communication**: Socket.IO
- **Routing**: React Router DOM

## 📋 Prerequisites

- Node.js 18+ and npm/bun
- A Privy App ID ([Get one here](https://privy.io))
- Google OAuth credentials (for Google login)
- Base Sepolia testnet ETH and USDC for testing

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ileana-pr/greenthumb-V0.1.git
cd greenthumb-V0.1
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```bash
# Privy Configuration
VITE_PRIVY_APP_ID=your_privy_app_id_here

# Agent Wallet (for receiving tips)
VITE_AGENT_WALLET_ADDRESS=0xYourWalletAddressHere
```

### 4. Configure Privy Dashboard

1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Enable **Google** login method
3. Configure Google OAuth:
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
   - **Authorized Redirect URIs**: 
     - `https://auth.privy.io/api/v1/oauth/callback`
4. Set **Base Sepolia** as your default chain

### 5. Start Development

```bash
# Start the ElizaOS backend server
npm run dev

# In another terminal, start the frontend (if needed)
cd src/frontend
npm run dev
```

The app will be available at `http://localhost:5173`

## 💡 Usage

### Authentication

1. Click **"Connect Wallet"** on the homepage
2. Choose your login method:
   - **Google**: Sign in with your Google account (creates embedded wallet automatically)
   - **Email**: Email-based authentication
   - **Wallet**: Connect external wallet (MetaMask, etc.)

### Chatting with GreenThumb

1. Navigate to the chat interface
2. Ask questions about:
   - Plant care and maintenance
   - Troubleshooting plant issues
   - Growing tips and best practices
   - Seasonal gardening advice

### Tipping the AI Assistant

1. After receiving a response from GreenThumb, click **"Tip GreenThumb"**
2. Select a tip amount (1, 5, 10, or 25 USDC) or enter a custom amount
3. Confirm the transaction
4. View your transaction on the block explorer

## 🔧 Configuration

### Agent Wallet Setup

To receive USDC tips, configure your wallet address:

1. Create or use an existing wallet on Base Sepolia testnet
2. Add to `.env`:
   ```bash
   VITE_AGENT_WALLET_ADDRESS=0xYourWalletAddressHere
   ```
3. ⚠️ **Important**: If not set, tips will be sent to a demo address and may be lost!

### Getting Test Tokens

#### ETH (for gas fees)

- [Alchemy Base Sepolia Faucet](https://basefaucet.com)
- [QuickNode Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

#### USDC (for tipping)

1. Get testnet ETH first (for gas)
2. Bridge or swap ETH to USDC on Base Sepolia
3. Or use a testnet USDC faucet if available

**Note**: Privy's `useFundWallet` feature does not support testnet USDC funding.

## 🏆 ETHGlobal Cannes Bounty Eligibility

This project is built for the **"Best App Using Stablecoin Built on Privy"** bounty ($5,000):

### ✅ Requirements Met

- ✅ **Privy Integration**: Full use of Privy's authentication and embedded wallet APIs
- ✅ **Stablecoin Functionality**: USDC tipping system on Base Sepolia
- ✅ **User Experience**: Seamless Web2-to-Web3 onboarding with Google OAuth
- ✅ **No Gambling/Wagering**: Pure utility application for gardening assistance

### 🎯 How We Use Privy

GreenThumb leverages Privy's embedded wallet infrastructure to create a seamless Web2-to-Web3 onboarding experience, enabling users to authenticate with Google OAuth and automatically receive embedded wallets for USDC stablecoin tipping. Our implementation showcases Privy's full potential by combining authentication, embedded wallet creation, real-time balance monitoring, and ERC-20 token transactions - all while maintaining a user-friendly interface that abstracts away blockchain complexity for mainstream adoption.

## 📁 Project Structure

```
greenthumb-V0.1/
├── src/
│   ├── frontend/          # React frontend application
│   │   ├── App.tsx        # Root component with PrivyProvider
│   │   ├── HomePage.tsx   # Landing page with wallet connection
│   │   └── GreenthumbApp.tsx  # Main chat interface
│   └── ...                # ElizaOS backend files
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🔐 Security Notes

- Never commit your `.env` file to version control
- Use testnet addresses for development
- Verify all transaction details before confirming
- Keep your private keys secure

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [ElizaOS](https://github.com/elizaos/elizaos) - AI agent framework
- Powered by [Privy](https://privy.io) - Web3 authentication and wallet infrastructure
- Deployed on [Base Sepolia](https://base.org) - Ethereum L2 testnet

## 📧 Contact

Built with 💚 by [cheddarqueso](https://github.com/ileana-pr)

---

**Note**: This is a hackathon project built for ETHGlobal Cannes. The app is currently running on Base Sepolia testnet for demonstration purposes.
