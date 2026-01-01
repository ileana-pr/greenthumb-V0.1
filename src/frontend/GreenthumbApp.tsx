import React, { useState, useRef, useEffect } from 'react';
import { Send, Leaf, Bot, User, Sprout, TreePine, Flower, Wallet, Heart, DollarSign, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePrivy, useWallets, useCreateWallet, useFundWallet } from '@privy-io/react-auth';
import type { UUID } from '@elizaos/core';

// Remove or simplify this:
declare global {
  interface Window {
    // empty - we're not using window storage anymore
  }
  
}

interface Message {
  id: UUID;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

function uuidv4(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as UUID;
}

const callbacks: {[key: string]: (response: any) => void} = {}

class SimpleSocketManager {
  private static socket: any = null;
  private static callbacks: Map<string, (response: any) => void> = new Map();
  private static currentChannelId: string | null = null;
  private static currentUserId: string | null = null;
  private static agentId: string | null = null;

  static async getSocket() {
    if (this.socket?.connected) {
      console.log('🔄 Using existing connected socket');
      return this.socket;
    }

    console.log('🚀 Creating new socket connection');
    const { io } = await import('socket.io-client');
    
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: true,
      query: {
        source: 'greenthumb-frontend',
        timestamp: Date.now()
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to ElizaOS server');
      // get agent id first, then join channel
      console.log('🤖 Getting agent ID...');
      this.getAgentId().then(() => {
        console.log('✅ Agent ID obtained, now joining channel...');
        this.joinChannel().catch(error => {
          console.error('❌ Failed to join channel during connection:', error);
        });
      }).catch(error => {
        console.error('❌ Failed to get agent ID:', error);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from ElizaOS server');
      // reset state on disconnect
      this.currentChannelId = null;
      this.currentUserId = null;
    });

    // listen for ANY and ALL socket events to debug
    // this.socket.onAny((event: string, data: any) => {
    //   console.log('🔍 Socket event received:', event, data);
      
    //   // check for agent responses in any event
    //   if (this.callbacks.size > 0) {
    //     // look for text content in various formats
    //     let responseText = null;
        
    //     if (data && data.content) {
    //       responseText = typeof data.content === 'string' ? data.content : data.content.text;
    //     } else if (data && data.text) {
    //       responseText = data.text;
    //     } else if (data && data.message && data.message.content) {
    //       responseText = typeof data.message.content === 'string' ? data.message.content : data.message.content.text;
    //     }
        
    //     if (responseText && typeof responseText === 'string' && responseText.length > 0) {
    //       console.log('🎯 Found potential response text:', responseText);
          
    //       // trigger all pending callbacks
    //       for (const [id, callback] of this.callbacks.entries()) {
    //         console.log("in for loop LMAO", id, callback)
    //         callback({ content: { text: responseText } });
    //         this.callbacks.delete(id);
    //         break;
    //       }
    //     }
    //   }
    // });

    // also listen for specific events that might contain responses
    const responseEvents = [
      'messageBroadcast',
      'messageComplete', 
      'message',
      'response',
      'agentResponse',
      'newMessage',
      'messageReceived'
    ];

    responseEvents.forEach(eventName => {
      this.socket.on(eventName, (data: any) => {
        console.log(`📨 Received ${eventName} event:`, data);
        this.handlePotentialResponse(data);
      });
    });

    // wait for connection to be established
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.socket.on('connect', () => {
        console.log('🎉 Socket connection established and ready');
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('❌ Socket connection error:', error);
        reject(error);
      });

      // timeout after 10 seconds
      setTimeout(() => {
        if (!this.socket?.connected) {
          console.error('⏰ Socket connection timeout');
          reject(new Error('Socket connection timeout'));
        }
      }, 10000);
    });
  }

  static handlePotentialResponse(data: any) {
    console.log("HELLLOOOOO", Object.keys(callbacks).length)
    if (Object.keys(callbacks).length === 0) return;
    console.log("in handle potential res")

    let responseText = null;
    
    // try multiple ways to extract response text
    if (data && data.content) {
      responseText = typeof data.content === 'string' ? data.content : data.content.text;
    } else if (data && data.text) {
      responseText = data.text;
      console.log("in data text", responseText)
    } else if (data && data.message) {
      if (typeof data.message === 'string') {
        responseText = data.message;
      } else if (data.message.content) {
        responseText = typeof data.message.content === 'string' ? data.message.content : data.message.content.text;
      }
    }
    
    if (responseText && typeof responseText === 'string' && responseText.length > 0) {
      console.log('🎯 Processing response text:', responseText);
      
      // trigger the first pending callback
      for (const [id, callback] of Object.entries(callbacks)) {
        if(data.senderName === "GreenThumb") {
          callback({ content: { text: responseText } });
          delete callbacks[id];
          break;
        }
      }
    }
  }

  static async getAgentId(): Promise<void> {
    try {
      // hardcode the agent ID from the logs since we know it works
      this.agentId = "7b13fa42-026d-06c3-9a41-891fe15757f9";
      console.log('🤖 Using GreenThumb agent ID:', this.agentId);
    } catch (error) {
      console.error('❌ Failed to get agent ID:', error);
      this.agentId = "7b13fa42-026d-06c3-9a41-891fe15757f9";
    }
  }

  static async joinChannel() {
    console.log('🔗 joinChannel called');
    const socket = await this.getSocket();
    if (!socket?.connected || !this.agentId) {
      console.error('🚫 Cannot join channel: socket connected?', !!socket?.connected, 'agent ID?', !!this.agentId);
      throw new Error('Cannot join channel: socket not connected or agent ID missing');
    }

    // generate consistent IDs for this session
    this.currentChannelId = this.generateChannelId();
    this.currentUserId = this.generateUserId();

    console.log('🔗 Joining channel with IDs:', {
      channelId: this.currentChannelId,
      userId: this.currentUserId,
      agentId: this.agentId
    });

    // send room joining message (type 1)
    const joinPayload = {
      type: 1, // ROOM_JOINING
      payload: {
        channelId: this.currentChannelId,
        roomId: this.currentChannelId,
        entityId: this.currentUserId
      }
    };

    console.log('🔗 Emitting join message:', joinPayload);
    socket.emit('message', joinPayload);

    // wait a moment for channel to be established
    console.log('⏳ Waiting for channel to be established...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // increased to 2 seconds
    console.log('✅ Channel join process completed');
  }

  static generateChannelId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static generateUserId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static generateMessageId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static async sendMessage(text: string): Promise<any> {
    console.log('🚀 sendMessage called with:', text);
    console.log('📊 Current state:', {
      socketConnected: this.socket?.connected,
      currentChannelId: this.currentChannelId,
      currentUserId: this.currentUserId,
      agentId: this.agentId
    });

    const socket = await this.getSocket();
    
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        console.error('❌ Socket not connected');
        reject(new Error('Not connected to ElizaOS server'));
        return;
      }

      if (!this.currentChannelId || !this.currentUserId) {
        console.error('❌ Channel not joined yet - attempting to join now');
        // Try to join channel if not already joined
        this.joinChannel().then(() => {
          console.log('✅ Channel joined successfully, retrying message send');
          // Retry the message after joining
          return this.sendMessage(text);
        }).then(resolve).catch(reject);
        return;
      }

      if (!this.agentId) {
        console.error('❌ Agent ID not found');
        reject(new Error('Agent ID not found'));
        return;
      }

      console.log('✅ All conditions met, proceeding with message send');

      const messageId = this.generateMessageId();

      // set up response callback before sending
      callbacks[messageId] = (response: any) => {
        console.log('🎯 Processing response for message:', messageId, response);
        
        // handle different response formats
        if (response && response.content) {
          if (typeof response.content === 'string') {
            // content is a string
            resolve({ text: response.content, success: true });
          } else if (response.content.text) {
            // content is an object with text property
            resolve({ text: response.content.text, success: true });
          } else {
            resolve({ text: JSON.stringify(response.content), success: true });
          }
        } else if (response && response.text) {
          resolve({ text: response.text, success: true });
        } else if (typeof response === 'string') {
          resolve({ text: response, success: true });
        } else {
          console.warn('🤔 Unexpected response format:', response);
          resolve({ text: "I received your message but had trouble generating a response.", success: true });
        }
      };

      console.log("in send message LOOK HERE", Object.keys(callbacks).length)

      // use the exact format from the working dashboard
      const messagePayload = {
        type: 2, // SEND_MESSAGE
        payload: {
          senderId: this.currentUserId,
          senderName: "user",
          message: text,
          channelId: this.currentChannelId,
          roomId: this.currentChannelId,
          serverId: "00000000-0000-0000-0000-000000000000",
          messageId: messageId,
          source: "client_chat",
          metadata: {
            channelType: "DM", // force DM type
            isDm: true,        // force DM flag
            targetUserId: this.agentId
          }
        }
      };

      console.log('📤 Sending message to ElizaOS:', messagePayload);
      socket.emit('message', messagePayload);

      // shorter timeout since the agent is clearly responding
      setTimeout(() => {
        console.log("in send message TIMEOUT", Object.keys(callbacks).length)

        if (callbacks[messageId]) {
          delete callbacks[messageId];
          console.log('⏰ Message timeout for:', messageId);
          resolve({ 
            text: "I'm taking a bit longer to respond than usual. Please try again!", 
            success: true 
          });
        }
      }, 30000); // 10 second timeout
    });
  }

  static isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

class GreenthumbAPI {
  private baseUrl = 'http://localhost:3000';

  async sendMessage(text: string): Promise<any> {
    return SimpleSocketManager.sendMessage(text);
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  isConnected(): boolean {
    return SimpleSocketManager.isConnected();
  }
}

const GreenthumbApp: React.FC = () => {
  console.log(`🏗️ GreenThumb: Component initializing - NO socket created yet`);
  
  // add CSS animation for loading spinner
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Helper function to render text with clickable links
  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#10b981',
              textDecoration: 'underline',
              fontWeight: '500',
            }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };
  
  // navigation hook
  const navigate = useNavigate();
  
  // privy wallet hooks
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { fundWallet } = useFundWallet();
  
  // prevent multiple wallet creation attempts
  const [isCreatingWallet, setIsCreatingWallet] = React.useState(false);
  const [hasAttemptedWalletCreation, setHasAttemptedWalletCreation] = React.useState(false);
  
  // agent wallet for tips - configurable via environment variable
  const AGENT_WALLET_ADDRESS = import.meta.env.VITE_AGENT_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b8D591D3D5e0cc3b1c'; // fallback for demo
  
  // USDC contract address (Base Sepolia testnet) - Required for stablecoin bounty!
  const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
  
  // tipping state
  const [showTipModal, setShowTipModal] = React.useState(false);
  const [tipAmount, setTipAmount] = React.useState('1'); // USDC amounts (1 USDC = $1)
  const [isSendingTip, setIsSendingTip] = React.useState(false);
  const [userUSDCBalance, setUserUSDCBalance] = React.useState<string>('0');
  const [userETHBalance, setUserETHBalance] = React.useState<string>('0');
  
  // debug: log wallet info
  React.useEffect(() => {
    console.log('🔍 Auth State Changed:', { 
      authenticated, 
      walletsCount: wallets.length,
      isCreatingWallet,
      hasAttemptedWalletCreation 
    });
    
    if (authenticated) {
      console.log('✅ User is authenticated');
      console.log('User info:', user);
      console.log('Linked accounts:', user?.linkedAccounts);
      user?.linkedAccounts?.forEach((account, index) => {
        console.log(`Account ${index + 1} (${account.type}):`, account);
      });
      
      console.log('🔍 Wallet Debug Info:');
      console.log('Total wallets:', wallets.length);
      wallets.forEach((wallet, index) => {
        console.log(`Wallet ${index + 1}:`, {
          address: wallet.address,
          walletClientType: wallet.walletClientType,
          connectorType: wallet.connectorType
        });
      });

      const hasEmbeddedWallet = wallets.some(w => w.walletClientType === 'privy');
      
      if (hasEmbeddedWallet) {
        // reset wallet creation state when embedded wallet is found
        setIsCreatingWallet(false);
        setHasAttemptedWalletCreation(false);
      } else if (!isCreatingWallet && !hasAttemptedWalletCreation) {
        // only create embedded wallet if not already creating and haven't attempted yet
        console.log('⚠️ User is authenticated but has no embedded wallet');
        console.log('🔨 Creating embedded wallet...');
        setIsCreatingWallet(true);
        setHasAttemptedWalletCreation(true);
        
        createWallet().then(() => {
          console.log('✅ Embedded wallet created successfully!');
          setIsCreatingWallet(false);
        }).catch(error => {
          console.error('❌ Failed to create embedded wallet:', error);
          setIsCreatingWallet(false);
          // don't reset hasAttemptedWalletCreation on error to prevent retry loops
        });
      }
    } else {
      console.log('❌ User is not authenticated');
      // reset state when user logs out
      setIsCreatingWallet(false);
      setHasAttemptedWalletCreation(false);
    }
  }, [authenticated, wallets, user, isCreatingWallet, hasAttemptedWalletCreation]);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      text: "Hello! I'm Greenthumb, your AI cultivation assistant. I'm here to help you grow healthy, thriving plants. What would you like to know about gardening today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Create API instance lazily to avoid immediate socket connection
  const getAPI = () => {
    if (!api.current) {
      console.log(`⚡ GreenThumb: Creating API instance (but not connecting socket yet)`);
      api.current = new GreenthumbAPI();
    }
    return api.current;
  };
  const api = useRef<GreenthumbAPI | null>(null);

  useEffect(() => {
    // Test connection to ElizaOS backend
    const checkConnection = async () => {
      console.log(`🏥 GreenThumb: Health check only - NO socket creation`);
      try {
        // Only check health endpoint, don't create socket yet
        const response = await fetch('http://localhost:3000/api/health');
        const healthOk = response.ok;
        
        // Consider connected if health check passes (socket will connect when needed)
        setIsConnected(healthOk);
        console.log(healthOk ? `✅ GreenThumb: Server is healthy` : `❌ GreenThumb: Server health check failed`);
      } catch (error) {
        console.error(`GreenThumb: Connection check failed:`, error);
        setIsConnected(false);
      }
    };

    checkConnection();
    
    // Check connection less frequently to reduce load
    const interval = setInterval(checkConnection, 10000);
    
    return () => {
      console.log(`🧹 GreenThumb: Component unmounting - cleaning up`);
      clearInterval(interval);
      // No need for socket cleanup with static approach
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: uuidv4(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const messageText = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      console.log('📤 GreenThumb: Sending message to ElizaOS:', messageText);
      const response = await getAPI().sendMessage(messageText);
      
      console.log('📨 GreenThumb: Received response from ElizaOS:', response);
      
      if (response && response.text) {
        const botMsg: Message = {
          id: uuidv4(),
          text: response.text,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        // Handle case where response doesn't have expected format
        const errorMsg: Message = {
          id: uuidv4(),
          text: "I'm sorry, I didn't receive a proper response. Please try again.",
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMsg: Message = {
        id: uuidv4(),
        text: "I'm having trouble connecting right now. Please check that the ElizaOS server is running and try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      
      // Update connection status
      setIsConnected(false);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ETH balance checking
  const checkETHBalance = async () => {
    if (!authenticated || wallets.length === 0) return;
    
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) return;

    try {
      const provider = await embeddedWallet.getEthereumProvider();
      
      // Get ETH balance
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [embeddedWallet.address, 'latest']
      });

      // Convert from wei to ETH (18 decimals)
      const balanceInETH = parseInt(balance, 16) / 1e18;
      setUserETHBalance(balanceInETH.toFixed(4));
      console.log(`⚡ ETH Balance: ${balanceInETH.toFixed(4)} ETH`);
    } catch (error) {
      console.error('Failed to fetch ETH balance:', error);
    }
  };

  // USDC balance checking
  const checkUSDCBalance = async () => {
    if (!authenticated || wallets.length === 0) return;
    
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) return;

    try {
      const provider = await embeddedWallet.getEthereumProvider();
      
      // ERC-20 balanceOf function call
      const balanceData = '0x70a08231' + embeddedWallet.address.slice(2).padStart(64, '0');
      
      const balance = await provider.request({
        method: 'eth_call',
        params: [{
          to: USDC_CONTRACT_ADDRESS,
          data: balanceData
        }, 'latest']
      });

      // USDC has 6 decimals
      const balanceInUSDC = parseInt(balance, 16) / 1e6;
      setUserUSDCBalance(balanceInUSDC.toFixed(2));
      console.log(`💰 USDC Balance: ${balanceInUSDC.toFixed(2)} USDC`);
    } catch (error) {
      console.error('Failed to fetch USDC balance:', error);
    }
  };

  // check balances when wallet is connected
  React.useEffect(() => {
    if (authenticated && wallets.length > 0) {
      checkETHBalance();
      checkUSDCBalance();
    }
  }, [authenticated, wallets]);

  // tipping functionality (USDC stablecoin - required for bounty!)
  const sendTip = async () => {
    if (!authenticated || wallets.length === 0) {
      alert('Please connect your wallet to send tips!');
      return;
    }

    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) {
      alert('No embedded wallet found!');
      return;
    }

    setIsSendingTip(true);
    
    try {
      console.log(`💰 Sending tip of ${tipAmount} USDC to GreenThumb agent...`);
      
      // get ethereum provider from embedded wallet
      const provider = await embeddedWallet.getEthereumProvider();
      
      // convert USDC amount to smallest unit (6 decimals for USDC)
      const valueInSmallestUnit = Math.floor(parseFloat(tipAmount) * 1e6);
      const valueHex = valueInSmallestUnit.toString(16).padStart(64, '0');
      
      // ERC-20 transfer function signature + recipient address + amount
      const transferData = '0xa9059cbb' + // transfer(address,uint256)
                          AGENT_WALLET_ADDRESS.slice(2).padStart(64, '0') + // recipient
                          valueHex; // amount
      
      // send USDC transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: embeddedWallet.address,
          to: USDC_CONTRACT_ADDRESS,
          data: transferData,
          gas: '0x15F90', // 90000 gas for ERC-20 transfer
        }],
      });

      console.log('✅ USDC tip sent successfully! Transaction hash:', txHash);
      
      // add success message to chat with clickable transaction link
      const explorerUrl = `https://sepolia-explorer.base.org/tx/${txHash}`;
      const tipMsg: Message = {
        id: uuidv4(),
        text: `💚 Thank you for the $${tipAmount} USDC tip! Your support helps me grow and learn. 🌱\n\n📄 Transaction Hash: ${txHash}\n🔍 View on Block Explorer: ${explorerUrl}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, tipMsg]);
      
      // close modal and refresh balances
      setShowTipModal(false);
      setTipAmount('1');
      setTimeout(() => {
        checkETHBalance(); // refresh ETH balance (used for gas)
        checkUSDCBalance(); // refresh USDC balance (used for tip)
      }, 2000); // refresh balances after 2 seconds
      
    } catch (error: any) {
      console.error('❌ Failed to send USDC tip:', error);
      alert(`Failed to send USDC tip: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSendingTip(false);
    }
  };

  // fund wallet with USDC for testing
  const fundWithUSDC = async () => {
    if (!authenticated || wallets.length === 0) {
      alert('Please connect your wallet first!');
      return;
    }

    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) {
      alert('No embedded wallet found!');
      return;
    }

    try {
      await fundWallet(embeddedWallet.address, {
        chain: { id: 84532 }, // Base Sepolia
        amount: '10',
        asset: 'USDC'
      });
      console.log('✅ Wallet funded with USDC!');
      setTimeout(() => {
        checkETHBalance(); // refresh ETH balance
        checkUSDCBalance(); // refresh USDC balance
      }, 3000); // refresh balances after 3 seconds
    } catch (error) {
      console.error('❌ Failed to fund wallet:', error);
      alert('Failed to fund wallet. This feature may not be available on testnet.');
    }
  };

  const FloatingIcons = () => (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          color: 'rgba(34, 197, 94, 0.2)',
          animation: 'pulse 2s infinite',
        }}
      >
        <Leaf size={24} />
      </div>
      <div 
        style={{
          position: 'absolute',
          top: '128px',
          right: '64px',
          color: 'rgba(34, 197, 94, 0.15)',
          animation: 'bounce 2s infinite',
          animationDelay: '1s',
        }}
      >
        <Sprout size={20} />
      </div>
      <div 
        style={{
          position: 'absolute',
          bottom: '128px',
          left: '80px',
          color: 'rgba(34, 197, 94, 0.1)',
          animation: 'pulse 2s infinite',
          animationDelay: '2s',
        }}
      >
        <TreePine size={28} />
      </div>
      <div 
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '128px',
          color: 'rgba(34, 197, 94, 0.2)',
          animation: 'bounce 2s infinite',
          animationDelay: '0.5s',
        }}
      >
        <Flower size={22} />
      </div>
    </div>
  );

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <FloatingIcons />
      
      {/* Header */}
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div 
          style={{
            maxWidth: '1024px',
            margin: '0 auto',
            padding: '16px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Back button */}
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '8px',
                color: '#059669',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                e.currentTarget.style.borderColor = '#10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
              }}
              title="Back to Home"
            >
              <ArrowLeft size={20} />
            </button>
            
            {/* Logo */}
            <div 
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Leaf size={24} />
            </div>
            
            {/* Title and subtitle */}
            <div style={{ flex: 1 }}>
              <h1 
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#064e3b',
                  margin: 0,
                }}
              >
                Greenthumb
              </h1>
              <p 
                style={{
                  fontSize: '14px',
                  color: '#047857',
                  margin: 0,
                }}
              >
                AI Cultivation Assistant
              </p>
            </div>
            
            {/* Connection status and wallet */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Agent connection status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isConnected ? '#10b981' : '#ef4444',
                  }}
                />
                <span 
                  style={{
                    fontSize: '14px',
                    color: isConnected ? '#047857' : '#dc2626',
                    fontWeight: '500',
                  }}
                >
                  {isConnected ? '🌱 GreenThumb Ready' : '🔴 Agent Offline'}
                </span>
              </div>

              {/* Wallet status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={authenticated ? logout : login}
                  style={{
                    background: authenticated ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                    color: authenticated ? 'white' : '#059669',
                    border: authenticated ? 'none' : '1px solid #10b981',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  title={authenticated && wallets.length > 0 ? 
                    `${wallets[0].walletClientType} wallet: ${wallets[0].address}\nETH: ${userETHBalance}\nUSDC: ${userUSDCBalance}` : 
                    undefined
                  }
                >
                  <Wallet size={14} />
                  {authenticated ? 
                    (wallets.length > 0 ? 
                      `${wallets[0].address.slice(0, 6)}...${wallets[0].address.slice(-4)} (${wallets[0].walletClientType})` : 
                      'Connected'
                    ) : 
                    'Connect'
                  }
                </button>
                
                {/* Balance display when connected */}
                {authenticated && wallets.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '12px',
                    color: '#047857',
                    fontWeight: '500',
                    background: 'rgba(240, 253, 244, 0.8)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <span>⚡ {userETHBalance} ETH</span>
                    <span style={{ opacity: 0.6 }}>|</span>
                    <span>💰 ${userUSDCBalance} USDC</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1024px',
          width: '100%',
          margin: '0 auto',
          padding: '0 24px',
          paddingTop: '24px',
          paddingBottom: '120px', // Space for input area
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: message.sender === 'bot' ? '#10b981' : '#6b7280',
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {message.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
              </div>
              
              {/* Message bubble */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: message.sender === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                    backgroundColor: message.sender === 'user' ? '#10b981' : 'white',
                    color: message.sender === 'user' ? 'white' : '#1f2937',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: message.sender === 'bot' ? '1px solid rgba(34, 197, 94, 0.1)' : 'none',
                  }}
                >
                  <p style={{ margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {renderMessageText(message.text)}
                  </p>
                  <p 
                    style={{
                      margin: 0,
                      marginTop: '4px',
                      fontSize: '12px',
                      opacity: 0.7,
                    }}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {/* Tip button for bot messages */}
                {message.sender === 'bot' && authenticated && wallets.length > 0 && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #34d399, #10b981)',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <Heart size={12} />
                    Tip GreenThumb
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#10b981',
                  color: 'white',
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 6px',
                  backgroundColor: 'white',
                  border: '1px solid rgba(34, 197, 94, 0.1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div 
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <div 
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      animation: 'pulse 1.5s infinite',
                      animationDelay: '0.3s',
                    }}
                  />
                  <div 
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      animation: 'pulse 1.5s infinite',
                      animationDelay: '0.6s',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(34, 197, 94, 0.1)',
          padding: '16px',
          zIndex: 10,
        }}
      >
        <div 
          style={{
            maxWidth: '1024px',
            margin: '0 auto',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about plant care, growing tips, troubleshooting, or anything garden-related..."
              disabled={!isConnected}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '24px',
                border: '2px solid rgba(34, 197, 94, 0.2)',
                outline: 'none',
                fontSize: '16px',
                resize: 'none',
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || !isConnected}
            style={{
              padding: '12px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: inputText.trim() && isConnected ? '#10b981' : '#d1d5db',
              color: 'white',
              cursor: inputText.trim() && isConnected ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      
      {/* Tip Modal */}
      {showTipModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !isSendingTip && setShowTipModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <Heart size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
                  Tip GreenThumb
                </h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  Support your AI gardening assistant
                </p>
              </div>
            </div>
            
            {/* Balance display */}
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Your USDC Balance:</span>
                <span style={{ fontSize: '16px', color: '#1e293b', fontWeight: '600' }}>
                  ${userUSDCBalance} USDC
                </span>
              </div>
              {parseFloat(userUSDCBalance) === 0 && (
                <button
                  onClick={fundWithUSDC}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  💳 Get Test USDC (Privy Funding)
                </button>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>
                Tip Amount (USDC)
              </label>
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                step="0.1"
                min="0.1"
                disabled={isSendingTip}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {['1', '5', '10', '25'].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setTipAmount(amount)}
                    disabled={isSendingTip}
                    style={{
                      padding: '6px 12px',
                      border: tipAmount === amount ? '2px solid #10b981' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: tipAmount === amount ? '#f0fdf4' : 'white',
                      color: tipAmount === amount ? '#059669' : '#6b7280',
                      fontSize: '12px',
                      cursor: isSendingTip ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ${amount} USDC
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowTipModal(false)}
                disabled={isSendingTip}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isSendingTip ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendTip}
                disabled={isSendingTip || !tipAmount || parseFloat(tipAmount) <= 0}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isSendingTip ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (isSendingTip || !tipAmount || parseFloat(tipAmount) <= 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isSendingTip ? (
                  <>
                    <div 
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <DollarSign size={16} />
                    Send Tip
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GreenthumbApp; 