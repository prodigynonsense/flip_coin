"use client";

import { WalletSelector } from "./WalletSelector";
import Image from "next/image";

export function Header({ title }: {title?: string}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 mx-auto w-full flex-wrap">
      <h1 className="text-white select-none font-semibold uppercase ltr:ml-2 rtl:mr-2 gap-3 flex items-center">
        <Image
          alt={"Treasure Hunt"}
          src="/aptos-white.svg"
          width={0}
          height={0}
          style={{ width: '32px', height: 'auto' }}
        />
        {title ? title : "Treasure Hunt" }</h1>

      <div className="flex gap-2 items-center flex-wrap">
        <WalletSelector />
      </div>
    </div>
  );
}

