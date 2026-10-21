// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ISworn {
    function hasTrait(address wallet, uint16 traitId)
        external view returns (bool);
    function tokenOf(address wallet)
        external view returns (uint256);
}

contract SwornGate {
    ISworn public constant SWORN =
        ISworn(0x9Cb36ECcA47D753E4E62eD87C12A2B7B20dfa828);

    function canEnter(address wallet) external view returns (bool) {
        return SWORN.hasTrait(wallet, 701);
    }

    function cardOfWallet(address wallet) external view returns (uint256) {
        return SWORN.tokenOf(wallet);
    }
}
