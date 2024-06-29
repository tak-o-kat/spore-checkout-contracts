import { Contract } from '@algorandfoundation/tealscript';

export class Verifier extends Contract {
  /** ID of the SPORE asa that we're dispensing. */
  assetId = GlobalStateKey<AssetID>();

  /** Account address of dispenser contract. */
  dispenserAddress = GlobalStateKey<Address>();

  /** The maximum amount of SPORE that can be applied. */
  maxAssetAmount = GlobalStateKey<uint64>();

  createApplication(): void {
    this.maxAssetAmount.value = 1_000;
  }

  /**
   * Initializes the Verifier smart contract
   *
   * @param assetId
   * @returns The id of the asset
   */
  initVerifier(assetId: AssetID, dispenserAddress: Address): void {
    assert(!this.assetId.exists);
    assert(!this.dispenserAddress.exists);

    this.assetId.value = assetId;
    this.dispenserAddress.value = dispenserAddress;

    // opt in to asset
    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetAmount: 0,
      assetReceiver: this.app.address,
    });
  }

  /**
   * Verifies the amount being sent is within the bounds
   *
   * @param amount
   * @returns
   */
  verifyAssetTxnAmount(amount: uint64): boolean {
    assert(this.assetId.exists);

    if (amount <= 0 || amount > this.maxAssetAmount.value) {
      return false;
    }

    if (amount % 50 !== 0) {
      return false;
    }
    return true;
  }

  /**
   * Send asset to contract
   *
   * @returns The id of the asset
   */
  sendAssetToContract(axfer: AssetTransferTxn): string {
    assert(this.assetId.exists);
    assert(this.dispenserAddress.exists);

    if (this.verifyAssetTxnAmount(axfer.assetAmount)) {
      return this.txn.txID;
    }

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetAmount: axfer.assetAmount,
      assetReceiver: this.txn.sender,
    });
    return this.txn.txID;
  }

  /**
   * Get dispenser address
   *
   * @returns The address of the dispenser
   */
  getDispenserAddress(): Address {
    return this.dispenserAddress.value;
  }

  sendAssetBalanceToDispenser(): void {
    assert(this.dispenserAddress.exists);
    assert(this.assetId.exists);

    const appAddress = this.app.address;
    const assetBalance = appAddress.assetBalance(this.assetId.value);
    if (assetBalance > 0) {
      sendAssetTransfer({
        xferAsset: this.assetId.value,
        assetAmount: assetBalance,
        assetReceiver: this.dispenserAddress.value,
      });
    }
  }
}
