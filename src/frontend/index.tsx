import { createRoot } from "react-dom/client";
import "./index.css";
import React from "react";
import App from "./App";

// define the interface for the ELIZA_CONFIG
interface ElizaConfig {
  agentId: string;
  apiBase: string;
}

// declare global window extension for TypeScript
declare global {
  interface Window {
    ELIZA_CONFIG?: ElizaConfig;
  }
}

// initialize the application
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

// define types for integration with agent UI system
export interface AgentPanel {
  name: string;
  path: string;
  component: React.ComponentType<any>;
  icon?: string;
  public?: boolean;
  shortLabel?: string;
}

interface PanelProps {
  agentId: string;
}

/**
 * panel component for the ElizaOS dashboard
 */
const PanelComponent: React.FC<PanelProps> = ({ agentId }) => {
  return <App />;
};

// export the panel configuration for integration with the agent UI
export const panels: AgentPanel[] = [
  {
    name: "GreenThumb",
    path: "greenthumb",
    component: PanelComponent,
    icon: "Leaf",
    public: true,
    shortLabel: "GreenThumb",
  },
];

export * from "./utils";

// Add proper typing for socket events
// Socket interfaces moved to GreenthumbApp.tsx
