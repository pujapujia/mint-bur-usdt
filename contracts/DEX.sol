// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./USDT.sol";

contract DEX {
    USDT public usdt;
    address public feeReceiver;
    uint256 public constant FEE = 0.1 ether; // 0.1 CHIPS

    constructor(address _usdt, address _feeReceiver) {
        usdt = USDT(_usdt);
        feeReceiver = _feeReceiver;
    }

    // Mint USDT dari CHIPS (1:1, bayar CHIPS + fee)
    function mintUsdt(uint256 amount) external payable {
        require(msg.value >= amount + FEE, "Insufficient CHIPS for mint");
        usdt.mint(msg.sender, amount);
        payable(feeReceiver).transfer(FEE);
        if (msg.value > amount + FEE) {
            payable(msg.sender).transfer(msg.value - amount - FEE);
        }
    }

    // Burn USDT ke CHIPS (1:1, bayar USDT + fee)
    function burnUsdt(uint256 amount) external payable {
        require(msg.value >= FEE, "Insufficient CHIPS fee");
        usdt.burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
        payable(feeReceiver).transfer(FEE);
    }

    // Reject ETH tanpa data
    receive() external payable {
        revert("Direct CHIPS not accepted");
    }
}
