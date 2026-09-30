import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { walletSource } from "./api/source";
import { WalletProvider } from "./wallet/WalletProvider";
import { WalletPage } from "./wallet/WalletPage";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root.");

createRoot(root).render(
  <StrictMode>
    <WalletProvider source={walletSource}>
      <main><WalletPage /></main>
    </WalletProvider>
  </StrictMode>,
);
