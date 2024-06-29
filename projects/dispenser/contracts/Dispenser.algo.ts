import { Contract } from '@algorandfoundation/tealscript';

export class Dispenser extends Contract {
  /** ID of the SPORE asa that we're dispensing. */
  assetId = GlobalStateKey<AssetID>();

  /** The amount to dispense per call. */
  unitaryDispense = GlobalStateKey<uint64>();

  /** Number of times SPORE has been dispensed. */
  dispenseCount = GlobalStateKey<uint64>();

  createApplication(): void {
    assert(!this.unitaryDispense.exists);
    assert(!this.dispenseCount.exists);
    this.unitaryDispense.value = 1_000;
    this.dispenseCount.value = 0;
  }

  getAssetId(): AssetID {
    return this.assetId.value;
  }

  getDispenseAmount(): uint64 {
    return this.unitaryDispense.value;
  }

  getSporeBalance(): uint64 {
    return this.app.address.assetBalance(this.assetId.value);
  }

  getDispenseCount(): uint64 {
    return this.dispenseCount.value;
  }

  /**
   * Create SPORE coin asset
   *
   * @param name The name of the asset
   * @param unitName The unit name of the asset
   * @returns The id of the asset
   */
  createSporeAsset(name: string, unitName: string): AssetID {
    verifyTxn(this.txn, { sender: this.app.creator });
    assert(!this.assetId.exists);
    this.assetId.value = sendAssetCreation({
      configAssetName: name,
      configAssetUnitName: unitName,
      configAssetTotal: 1_000_000_000,
      configAssetDecimals: 0,
      configAssetDefaultFrozen: 0,
    });

    return this.assetId.value;
  }

  /**
   * Dispense the asset
   *
   * @param assetId The id of the asset
   *
   */
  // eslint-disable-next-line no-unused-vars
  dispense(assetId: AssetID): void {
    // Send asset to sender
    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetAmount: this.unitaryDispense.value,
      assetReceiver: this.txn.sender,
    });

    this.dispenseCount.value += 1;
  }
}
