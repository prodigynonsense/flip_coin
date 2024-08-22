import { NETWORK } from "@/constants";
import { Aptos, AptosConfig, MoveModule, MoveStructId } from "@aptos-labs/ts-sdk";

export const aptos = new Aptos(new AptosConfig({ network: NETWORK as any }));

export function useABI(abi: MoveModule) {
  return {
    view: new Proxy({} as any, {
      get: (_, prop) => {
        const functionName = prop.toString();
        const func = abi.exposed_functions.find((f:any) => f.is_view && f.name === functionName);
        //console.log('view function:', func);
        if (!func) throw new Error(`${functionName} method not found`);
        return (payload: {typeArguments: any[], functionArguments: any[]}) => {
          //console.log('payload:', payload);
          return aptos.view({
            payload: {
              function: `${abi.address}::${abi.name}::${func.name}`,
              functionArguments: payload.functionArguments,
              typeArguments: payload.typeArguments,
            }
          });
        }
      }
    }),
  };
}

export async function getModuleEvents(eventType: MoveStructId) {
    const events = await aptos.getModuleEventsByEventType({eventType});
    return events
}

export const getEventByHash = async (transactionHash: string, eventType: MoveStructId) => {
    const transaction: any = await aptos.getTransactionByHash({
      transactionHash
    });
    if (transaction && transaction.events) {
      for (const event of transaction.events) {
        if (event.type === eventType)
          return event;
      }
    }
}

export async function getAPTBalance(userAddr: string) {
  return await aptos.getAccountAPTAmount({
    accountAddress: userAddr,
  });
}
