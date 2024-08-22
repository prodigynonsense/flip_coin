'use client'

import { useWallet, WalletName, Wallet, WalletReadyState } from '@aptos-labs/wallet-adapter-react';
import { Button } from "@/components/ui/button"
import { ReloadIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

export default function() {
  const {
    connect,
    isLoading,
    account,
    network,
    connected,
    disconnect,
    wallet,
    wallets,
  } = useWallet();

  const onConnect = (walletName: WalletName) => {
    connect(walletName);
  };

  const Action = ({ wallet }: {wallet: Wallet}) => {
    switch(wallet.readyState) {
      case WalletReadyState.Installed:
        return <Button>connect</Button>;
    }
    return <></>;
  }

  const ConnectButton = () => {
    return <Button><ReloadIcon className={cn("mr-2 h-4 w-4 animate-spin", isLoading ? "" : "hidden")} />Connect Wallet</Button>
  }

  return (<>
        <nav className="flex justify-between bg-gray-100 p-2 items-center">
          <span>Treasure Hunt</span>
          <ConnectButton />
        </nav>
          <ul>
          {
            wallets && wallets.map((walletItem, index) => (
              <li onClick={ () => onConnect(walletItem.name)} key={walletItem.name + index}>
              <span>{walletItem.name}{walletItem.readyState}</span>
              <Action wallet={walletItem as Wallet} />
              </li>
            ))
          }
          </ul>
        </>);
}
