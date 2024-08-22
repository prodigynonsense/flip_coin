"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useWallet, InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getEventByHash, getAPTBalance } from "@/utils/aptosClient";
import { sleep, convertAmountFromOnChainToHumanReadable, convertAmountFromHumanReadableToOnChain } from "@/utils/helpers";
import { ACCOUNT_ADDRESS, FLIP_MODULE_NAME, APT_COIN } from "@/constants";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

enum Direction {
  HEADS = "Heads",
  TAILS = "Tails",
}

const BETS = {
  normal: [0.05, 0.1, 0.5, 1],
  whale: [2, 3, 4, 5],
};

export default function Coin() {
  const { account, signAndSubmitTransaction } = useWallet();
  const { toast, dismiss } = useToast();
  const [result, setResult] = useState("");
  const [balance, setBalance] = useState(0);
  const [bets, setBets] = useState(BETS.normal);
  const [curBetDirection, setCurBetDirection] = useLocalStorage("curBetDirection", Direction.HEADS);
  const [curBet, setCurBet] =  useState(0.1);
  const [whaleMode, setWhaleMode] =  useState(false);
  const [submitting, setSubmitting] = useState(false);
  const animRef = useRef(null);

  const fetchData = async () => {
    if(!account) return;
    const balance = await getAPTBalance(account.address);
    setBalance(balance);
  };

  useEffect(() => {
    const bets = whaleMode ? BETS.whale : BETS.normal;
    setBets(bets);
    if (!bets.includes(curBet)) {
      setCurBet(bets[1]);
    }
  }, [whaleMode]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 6000);
    return () => clearInterval(intervalId);
  }, [result, account?.address]);

  const getAngel = () => {
    const element: any = animRef.current;
    if (!element) return 0;
    const computedStyle = window.getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(computedStyle.transform);

    const angle = Math.round(Math.atan2(matrix.m21, matrix.m11) * (180 / Math.PI));
    return angle;
  };

  const stopAnimation = async (direction: Direction, data: any) => {
    //console.log("win:", direction);
    const element: any = animRef.current;
    if (!element) return;
    if (direction == Direction.HEADS) {
      element.style.animation = 'flip2 forwards 2s';
    } else {
      element.style.animation = 'flipReverse2 forwards 2s';
    }
    element.addEventListener("animationend", function r() {
      setResult(direction);
      setSubmitting(false);
      if (data.is_won)
        toast({
          description: <div className="text-green-600 font-semibold">You won {curBet} APT 🎉🎉🎉!</div>,
          duration: 3000,
        });
      else
        toast({
          //variant: "destructive",
          description: <div className="text-red-600 font-semibold">You lost {curBet} APT!</div>,
          duration: 2000,
        });
      element.removeEventListener("animationend", r);
    });
  };

  const flipHandler = async () => {
    if (!account || submitting) {
      if (!account) toast({
        title: "wallet not connected!",
        duration: 1000,
      });
      return;
    }
    dismiss();
    setSubmitting(true);
    const element: any = animRef.current;
    if (!element) return;
    setResult("");
    const typeArgs: any = [APT_COIN];
    const args: any = [convertAmountFromHumanReadableToOnChain(curBet)|0, curBetDirection == Direction.HEADS? true : false];
    const transaction: InputTransactionData =  {
      sender: account!.address,
      data: {
        function: `${ACCOUNT_ADDRESS}::${FLIP_MODULE_NAME}::play`,
        typeArguments: typeArgs,
        functionArguments: args,
      }
    };
    try {
      const { hash } = await signAndSubmitTransaction(transaction);
      const angle = getAngel();
      //console.log('angle', angle);
      if ((angle + 360) % 360 === 0) {
        element.style.animation = 'flip forwards 3s infinite';
      } else {
        element.style.animation = 'flipReverse forwards 3s infinite';
      }
      const lastEvent = await getEventByHash(hash, `${ACCOUNT_ADDRESS}::${FLIP_MODULE_NAME}::FlipEvent`);
      //console.log(lastEvent);
      if (lastEvent.data.player === account.address) {
        if (lastEvent.data.heads)
          await stopAnimation(Direction.HEADS, lastEvent.data);
        else
          await stopAnimation(Direction.TAILS, lastEvent.data);
      } else {
        setSubmitting(false);
      }
    } catch(e) {
      console.error(e);
      setSubmitting(false);
      element.style.animation = '';
    }
  };

  const amountHandler = (bet: any) => {
    return () => {
      setCurBet(bet);
    };
  };

  const directionHandler = (direction: Direction) => {
    return () => {
      const element: any = animRef.current;
      const angle = getAngel();
      //console.log("angle", angle);
      if (element) {
        if (direction == Direction.HEADS) {
          if ((angle + 360) % 360 != 0)
            element.style.animation = 'flipSwitch 1s forwards';
        } else {
          if ((angle + 180) % 360 != 0)
            element.style.animation = 'flipSwitchReverse 1s forwards';
        }
        setResult("");
      }
      setCurBetDirection(direction);
    }
  };

  // 当默认方向为反面时，页面初始化后需要调整旋转方向
  useEffect(() => {
    if (curBetDirection == Direction.TAILS) {
      const angle = getAngel();
      const element: any = animRef.current;
      if (!element) return;
      if ((angle + 180) % 360 != 0)
        element.style.animation = 'flipSwitchReverse 1s forwards';
      //element.style.transform = "rotateY(-180deg)";
    }
  }, [curBetDirection]);

  const whaleHandler = (checked: boolean) => {
    setWhaleMode(checked);
  };

  return (
    <main>
      <Header title="Flip Coin" />
      <div className="bg-gray-100 min-h-screen p-6">
        { account &&
        <div className="text-right mb-4 font-semibold text-gray-600">balance: {convertAmountFromOnChainToHumanReadable(balance)} APT</div>
        }
        <div className="mb-8 flex flex-wrap items-center justify-center">
          <div className="flex items-center space-x-1 mr-2 mb-2">
            <Switch checked={whaleMode} onCheckedChange={whaleHandler} id="whale-mode" />
            <Label htmlFor="whale-mode">Whale</Label>
          </div>
          <div className="mb-2 rounded-full text-white bg-black coin-amount">
            {
              bets.map((bet, index) => (
                <button onClick={amountHandler(bet)} key={index} className={cn("rounded-full px-3 min-w-[90px] py-2",
                                    curBet == bet ? "bg-blue-400" : "",
                                    !(index == 0 || index == bets.length - 1) ? "py-1" : ""
                                     )}>
                  {bet}
                  <i className="apt-coin"></i>
                </button>
              ))
            }
          </div>
          <div className="mb-2 ml-4 rounded-full text-white bg-black">
            <button onClick={directionHandler(Direction.HEADS)} className={cn("rounded-full px-4 py-2", curBetDirection == Direction.HEADS ? "bg-orange-600" : "")}>
              Heads
            </button>
            <button onClick={directionHandler(Direction.TAILS)} className={cn("rounded-full px-4 py-2", curBetDirection == Direction.TAILS ? "bg-orange-600" : "")}>
              Tails
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div ref={animRef} className={cn("coin")}>
            <div className="heads shadow-lg"></div>
            <div className="tails shadow-lg"></div>
          </div>
        </div>
        { result &&
          <div className="text-center text-gray-600 font-semibold mt-4">{result}</div>
        }
        <div className="flex items-center justify-center my-4 mb-6">
          <Button disabled={submitting} onClick={ flipHandler } className="m-4">Flip Coin</Button>
        </div>
      </div>
    </main>
  );
}
