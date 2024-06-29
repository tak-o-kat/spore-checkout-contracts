import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { algos } from '@algorandfoundation/algokit-utils';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';

import { DispenserClient } from '../contracts/clients/DispenserClient';
import { VerifierClient } from '../contracts/clients/VerifierClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let dispenserClient: DispenserClient;
let verifierClient: VerifierClient;

describe('Dispenser', () => {
  beforeEach(fixture.beforeEach);
  let sender: algosdk.Account;
  let asaId: bigint;

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, testAccount, kmd } = fixture.context;

    sender = await algokit.getOrCreateKmdWalletAccount(
      {
        name: 'sender',
        fundWith: algokit.algos(10),
      },
      algod,
      kmd
    );

    dispenserClient = new DispenserClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    verifierClient = new VerifierClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await dispenserClient.create.createApplication({});
    await verifierClient.create.createApplication({});
  });

  test('checkGlobals', async () => {
    const asset = await dispenserClient.getAssetId({}, { sender });
    expect(asset.return?.valueOf()).toEqual(0n);

    const amount = await dispenserClient.getDispenseAmount({});
    expect(amount.return?.valueOf()).toBe(1_000n);
  });

  test('createSporeAsset', async () => {
    await dispenserClient.appClient.fundAppAccount(algokit.microAlgos(500_000));
    const result = await dispenserClient.createSporeAsset(
      { name: 'SPORE', unitName: 'SPORE' },
      {
        sendParams: {
          fee: algokit.microAlgos(2_000),
        },
      }
    );
    const asset = await dispenserClient.getAssetId({});
    asaId = asset.return?.valueOf() as bigint;
    expect(result.return?.valueOf()).toBe(asaId);
  });

  test('initVerifier', async () => {
    await verifierClient.appClient.fundAppAccount(algokit.microAlgos(500_000));
    const { appAddress } = await dispenserClient.appClient.getAppReference();
    console.log(`dispenser address: ${appAddress}`);
    await verifierClient.initVerifier(
      {
        assetId: asaId,
        dispenserAddress: appAddress,
      },
      {
        sender,
        sendParams: {
          fee: algokit.microAlgos(2_000),
        },
      }
    );
    const { assetId, maxAssetAmount } = await verifierClient.appClient.getGlobalState();
    const dispAddy = await verifierClient.getDispenserAddress({});
    expect(BigInt(assetId?.value)).toBe(BigInt(asaId));
    expect(maxAssetAmount?.value).toBe(1_000);
    expect(dispAddy.return?.valueOf()).toBe(appAddress);
  });

  test('checkDispenserAccountInVerifier', async () => {
    const { appAddress } = await dispenserClient.appClient.getAppReference();
    const result = await verifierClient.getDispenserAddress({});
    expect(result.return?.valueOf()).toBe(appAddress);
  });

  test('sporeBeforeDispense', async () => {
    const balance = await dispenserClient.getSporeBalance({});
    expect(balance.return?.valueOf()).toBe(1_000_000_000n);
  });

  test('dispenseCountBeforeDispense', async () => {
    const balance = await dispenserClient.getDispenseCount({});
    expect(balance.return?.valueOf()).toBe(0n);
  });

  test('dispenseToSender', async () => {
    try {
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: sender.addr,
        to: sender.addr,
        assetIndex: Number(asaId),
        amount: 0,
        suggestedParams: await algokit.getTransactionParams(undefined, fixture.context.algod),
      });

      await algokit.sendTransaction({ from: sender, transaction: optInTxn }, fixture.context.algod);

      await dispenserClient.dispense(
        {
          assetId: asaId,
        },
        {
          sender,
          sendParams: {
            fee: algokit.microAlgos(3_000),
          },
        }
      );
      const balance = await dispenserClient.getSporeBalance({});
      expect(balance.return?.valueOf()).toBe(999_999_000n);
    } catch (e) {
      console.warn(e);
      throw e;
    }
  });

  test('dispenseCountAfterDispense', async () => {
    const balance = await dispenserClient.getDispenseCount({});
    expect(balance.return?.valueOf()).toBe(1n);
  });

  test('sporeAfterDispense', async () => {
    const balance = await dispenserClient.getSporeBalance({});
    expect(balance.return?.valueOf()).toBe(999_999_000n);
  });

  // test('verifyAmount (Positive)', async () => {
  //   const result1 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 500,
  //     },
  //     {
  //       sender,
  //     }
  //   );
  //   expect(result1.return?.valueOf()).toBe(true);

  //   const result2 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 1_000,
  //     },
  //     {
  //       sender,
  //     }
  //   );

  //   expect(result2.return?.valueOf()).toBe(true);

  //   const result3 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 100,
  //     },
  //     {
  //       sender,
  //     }
  //   );

  //   expect(result3.return?.valueOf()).toBe(true);

  //   const result4 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 900,
  //     },
  //     {
  //       sender,
  //     }
  //   );

  //   expect(result4.return?.valueOf()).toBe(true);

  //   const result5 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 550,
  //     },
  //     {
  //       sender,
  //     }
  //   );

  //   expect(result5.return?.valueOf()).toBe(true);

  //   const result6 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 50,
  //     },
  //     {
  //       sender,
  //     }
  //   );

  //   expect(result6.return?.valueOf()).toBe(true);
  // });

  // test('verifyAmount (Negative)', async () => {
  //   const result1 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 0,
  //     },
  //     {
  //       sender,
  //     }
  //   );
  //   expect(result1.return?.valueOf()).toBe(false);

  //   const result2 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 1_001,
  //     },
  //     {
  //       sender,
  //     }
  //   );
  //   expect(result2.return?.valueOf()).toBe(false);

  //   const result3 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 1_000_000,
  //     },
  //     {
  //       sender,
  //     }
  //   );
  //   expect(result3.return?.valueOf()).toBe(false);

  //   const result4 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 108,
  //     },
  //     {
  //       sender,
  //     }
  //   );
  //   expect(result4.return?.valueOf()).toBe(false);

  //   const result5 = await verifierClient.verifyAssetTxnAmount(
  //     {
  //       amount: 51,
  //     },
  //     {
  //       sender,
  //     }
  //   );
  //   expect(result5.return?.valueOf()).toBe(false);
  // });

  test('sendAssetToContract', async () => {
    // const { algod } = fixture.context;
    // const { appAddress } = await verifierClient.appClient.getAppReference();

    // const suggestedParams = await algod.getTransactionParams().do();
    // suggestedParams.flatFee = true;
    // suggestedParams.fee = suggestedParams.minFee;

    // let axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    //   from: sender.addr,
    //   to: appAddress,
    //   assetIndex: Number(asaId),
    //   amount: 257,
    //   suggestedParams,
    // });

    // console.log(`sender: ${sender.addr}`);
    // let result = await verifierClient.sendAssetToContract(
    //   {
    //     axfer,
    //   },
    //   {
    //     sender,
    //     sendParams: {
    //       fee: algokit.microAlgos(2_000),
    //     },
    //   }
    // );

    // console.log(result);

    // axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    //   from: sender.addr,
    //   to: appAddress,
    //   assetIndex: Number(asaId),
    //   amount: 500,
    //   suggestedParams,
    // });

    // result = await verifierClient.sendAssetToContract(
    //   {
    //     axfer,
    //   },
    //   {
    //     sender,
    //     sendParams: {
    //       fee: algokit.microAlgos(2_000),
    //     },
    //   }
    // );

    // console.log(result);

    const amount = 500n;
    const { algorand } = fixture;
    const { appAddress } = await verifierClient.appClient.getAppReference();
    try {
      const result = await verifierClient.verifyAssetTxnAmount(
        {
          amount,
        },
        {
          sender,
        }
      );
      // Return value must be true in order to proceed
      expect(result.return?.valueOf()).toBe(true);

      console.log(`App address: ${appAddress}`);
      // transfer asset to app contract
      const sendAssetTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: sender.addr,
        to: appAddress,
        assetIndex: Number(asaId),
        amount,
        suggestedParams: await algokit.getTransactionParams(undefined, fixture.context.algod),
      });

      await algokit.sendTransaction({ from: sender, transaction: sendAssetTxn }, fixture.context.algod);

      const { balance } = await algorand.account.getAssetInformation(appAddress, asaId);
      expect(balance).toBe(amount);
    } catch (e) {
      console.warn(e);
      throw e;
    }
  });

  test('returnAssetBalanceToDispenser', async () => {
    const { algorand } = fixture;
    const { appAddress } = await verifierClient.appClient.getAppReference();
    let { balance } = await algorand.account.getAssetInformation(appAddress, asaId);
    expect(balance).toBe(500n);

    await verifierClient.sendAssetBalanceToDispenser(
      {},
      {
        sender,
        sendParams: {
          fee: algokit.microAlgos(2_000),
        },
      }
    );

    ({ balance } = await algorand.account.getAssetInformation(appAddress, asaId));
    expect(balance).toBe(0n);
  });

  test('sporeBeforeAssetReturn', async () => {
    const balance = await dispenserClient.getSporeBalance({});
    expect(balance.return?.valueOf()).toBe(999_999_500n);
  });
});
