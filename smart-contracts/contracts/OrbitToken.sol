// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OrbitToken (Orbs)
 * @notice ERC-20 testnet token for OrbitLink rewards ecosystem
 * @dev Deployed on Polygon Amoy testnet. Ticker: ORBS
 */
contract OrbitToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    // Minter role for the RewardDistributor contract
    mapping(address => bool) public minters;

    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Orbs: caller is not a minter");
        _;
    }

    constructor() ERC20("Orbs", "ORBS") Ownable(msg.sender) {
        // Mint initial supply to deployer (10% of max)
        _mint(msg.sender, 100_000_000 * 10 ** 18);
    }

    /**
     * @notice Mint new tokens (only minters or owner)
     * @param to Recipient address
     * @param amount Amount to mint (in wei)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "Orbs: max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @notice Add a minter (e.g., RewardDistributor contract)
     */
    function addMinter(address account) external onlyOwner {
        minters[account] = true;
        emit MinterAdded(account);
    }

    /**
     * @notice Remove a minter
     */
    function removeMinter(address account) external onlyOwner {
        minters[account] = false;
        emit MinterRemoved(account);
    }
}
