// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IOrbitToken {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title RewardDistributor
 * @notice Distributes ORBIT tokens as epoch rewards
 * @dev Admin submits merkle-free batch distributions for simplicity on testnet
 */
contract RewardDistributor is Ownable, ReentrancyGuard {
    IOrbitToken public orbitToken;

    // Points-to-token conversion rate (e.g., 1000 points = 1 ORBIT token)
    uint256 public conversionRate = 1000;

    // Track claimed rewards per epoch per user
    mapping(string => mapping(address => bool)) public claimed;
    // Track total distributed per epoch
    mapping(string => uint256) public epochDistributed;

    event RewardDistributed(string indexed epochId, address indexed user, uint256 amount);
    event BatchDistributed(string indexed epochId, uint256 totalAmount, uint256 recipients);
    event ConversionRateUpdated(uint256 oldRate, uint256 newRate);
    event PointsRedeemed(address indexed user, uint256 points, uint256 tokens);

    constructor(address _orbitToken) Ownable(msg.sender) {
        orbitToken = IOrbitToken(_orbitToken);
    }

    /**
     * @notice Batch distribute epoch rewards
     * @param epochId The epoch identifier
     * @param recipients Array of recipient addresses
     * @param amounts Array of token amounts (in wei)
     */
    function batchDistribute(
        string calldata epochId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "Empty arrays");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            require(!claimed[epochId][recipients[i]], "Already claimed");
            claimed[epochId][recipients[i]] = true;
            orbitToken.mint(recipients[i], amounts[i]);
            totalAmount += amounts[i];
            emit RewardDistributed(epochId, recipients[i], amounts[i]);
        }

        epochDistributed[epochId] += totalAmount;
        emit BatchDistributed(epochId, totalAmount, recipients.length);
    }

    /**
     * @notice Redeem points for tokens (called by backend on behalf of user)
     * @param user The user's wallet address
     * @param points Number of points to redeem
     */
    function redeemPoints(address user, uint256 points) external onlyOwner nonReentrant {
        require(points >= conversionRate, "Insufficient points");
        uint256 tokens = (points / conversionRate) * 10 ** 18;
        orbitToken.mint(user, tokens);
        emit PointsRedeemed(user, points, tokens);
    }

    /**
     * @notice Update the points-to-token conversion rate
     */
    function setConversionRate(uint256 _rate) external onlyOwner {
        require(_rate > 0, "Rate must be > 0");
        emit ConversionRateUpdated(conversionRate, _rate);
        conversionRate = _rate;
    }

    /**
     * @notice Update the OrbitToken address
     */
    function setOrbitToken(address _token) external onlyOwner {
        orbitToken = IOrbitToken(_token);
    }
}
