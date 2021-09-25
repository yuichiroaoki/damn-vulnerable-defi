import { ethers } from "hardhat";
const { BigNumber } = ethers;

const BASE_TEN = 10;

// Defaults to e18 using amount * 10^18
export const getBigNumber = (amount: number, decimals = 18) => {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals));
};

export const daysToSeconds = (day: number) => {
  return day*60*60*24
}