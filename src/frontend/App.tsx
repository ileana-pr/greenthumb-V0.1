import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import HomePage from "./HomePage";
import GreenthumbApp from "./GreenthumbApp";

const queryClient = new QueryClient();

const App: React.FC = () => {
  // Debug: Check environment variable loading
  console.log("Environment check:", {
    VITE_PRIVY_APP_ID: import.meta.env.VITE_PRIVY_APP_ID,
    length: import.meta.env.VITE_PRIVY_APP_ID?.length,
    type: typeof import.meta.env.VITE_PRIVY_APP_ID,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID!}
        config={{
          loginMethods: ["google", "email", "wallet"],
          appearance: {
            theme: "light",
            accentColor: "#10b981",
          },
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
          },
          defaultChain: {
            id: 84532, // Base Sepolia testnet
            name: "Base Sepolia",
            network: "base-sepolia",
            nativeCurrency: {
              decimals: 18,
              name: "Ether",
              symbol: "ETH",
            },
            rpcUrls: {
              default: {
                http: ["https://sepolia.base.org"],
              },
              public: {
                http: ["https://sepolia.base.org"],
              },
            },
            blockExplorers: {
              blockscout: {
                name: "Basescout",
                url: "https://base-sepolia.blockscout.com",
              },
              default: {
                name: "Basescan",
                url: "https://sepolia.basescan.org",
              },
            },
            testnet: true,
          },
        }}
      >
        <Router basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<GreenthumbApp />} />
          </Routes>
        </Router>
      </PrivyProvider>
    </QueryClientProvider>
  );
};

export default App;
