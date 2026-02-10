// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { PRBMathUD60x18 } from "prb-math/contracts/PRBMathUD60x18.sol";

contract PredictionMarkets is ReentrancyGuard, Ownable {
  using SafeERC20 for IERC20;

  struct Market {
    string question;
    uint40 endTime;
    uint256 b; // LMSR liquidity parameter (1e18)
    uint256 qYes; // shares (1e18)
    uint256 qNo; // shares (1e18)
    uint256 volumeUsdc; // 6 decimals
    bool resolved;
    bool outcomeYes;
    address creator;
  }

  IERC20 public immutable usdc;

  uint256 public marketCount;
  mapping(uint256 => Market) public markets;
  mapping(uint256 => mapping(address => uint256)) public yesShares;
  mapping(uint256 => mapping(address => uint256)) public noShares;

  uint256 private constant ONE = 1e18;
  uint256 private constant USDC_SCALE = 1e12; // 18 -> 6
  uint256 private constant LN2 = 693147180559945309; // ln(2) * 1e18
  event MarketCreated(uint256 indexed id, string question, uint40 endTime, uint256 b);
  event Trade(uint256 indexed id, address indexed user, bool isYes, bool isBuy, uint256 shares, uint256 usdcAmount);
  event Resolved(uint256 indexed id, bool outcomeYes);
  event Redeemed(uint256 indexed id, address indexed user, uint256 payoutUsdc);

  constructor(address usdc_) Ownable(msg.sender) {
    usdc = IERC20(usdc_);
  }

  function createMarket(
    string calldata question,
    uint40 endTime,
    uint256 b,
    uint256 seedUsdc
  ) external nonReentrant returns (uint256 id) {
    require(bytes(question).length >= 8, "Question too short");
    require(endTime > block.timestamp + 1 hours, "End time too soon");
    require(b >= 1e18, "b too small");

    uint256 minSeed18 = (b * LN2) / ONE; // b * ln(2)
    uint256 minSeedUsdc = _toUsdcUp(minSeed18);
    require(seedUsdc >= minSeedUsdc, "Seed too small");

    usdc.safeTransferFrom(msg.sender, address(this), seedUsdc);

    id = marketCount++;
    markets[id] = Market({
      question: question,
      endTime: endTime,
      b: b,
      qYes: 0,
      qNo: 0,
      volumeUsdc: 0,
      resolved: false,
      outcomeYes: false,
      creator: msg.sender,
      creator: msg.sender
    });

    emit MarketCreated(id, question, endTime, b);
  }

  function buyYes(uint256 id, uint256 shares, uint256 maxCostUsdc) external nonReentrant {
    _trade(id, true, true, shares, maxCostUsdc);
  }

  function buyNo(uint256 id, uint256 shares, uint256 maxCostUsdc) external nonReentrant {
    _trade(id, false, true, shares, maxCostUsdc);
  }

  function sellYes(uint256 id, uint256 shares, uint256 minPayoutUsdc) external nonReentrant {
    _trade(id, true, false, shares, minPayoutUsdc);
  }

  function sellNo(uint256 id, uint256 shares, uint256 minPayoutUsdc) external nonReentrant {
    _trade(id, false, false, shares, minPayoutUsdc);
  }

  function _trade(
    uint256 id,
    bool isYes,
    bool isBuy,
    uint256 shares,
    uint256 limitUsdc
  ) internal {
    Market storage m = markets[id];
    require(block.timestamp < m.endTime, "Market ended");
    require(!m.resolved, "Market resolved");
    require(shares > 0, "Shares=0");

    uint256 qYes = m.qYes;
    uint256 qNo = m.qNo;
    uint256 b = m.b;

    if (!isBuy) {
      if (isYes) require(yesShares[id][msg.sender] >= shares, "Not enough YES");
      else require(noShares[id][msg.sender] >= shares, "Not enough NO");
    }

    uint256 costBefore = _cost(qYes, qNo, b);
    if (isYes) {
      qYes = isBuy ? qYes + shares : qYes - shares;
    } else {
      qNo = isBuy ? qNo + shares : qNo - shares;
    }
    uint256 costAfter = _cost(qYes, qNo, b);

    uint256 usdcAmount;
    if (isBuy) {
      uint256 cost = costAfter - costBefore;
      uint256 costUsdc = _toUsdcUp(cost);
      require(costUsdc <= limitUsdc, "Slippage" );
      usdc.safeTransferFrom(msg.sender, address(this), costUsdc);
      m.volumeUsdc += costUsdc;
      usdcAmount = costUsdc;
      if (isYes) yesShares[id][msg.sender] += shares;
      else noShares[id][msg.sender] += shares;
    } else {
      uint256 payout = costBefore - costAfter;
      uint256 payoutUsdc = _toUsdc(payout);
      require(payoutUsdc >= limitUsdc, "Slippage" );
      if (isYes) yesShares[id][msg.sender] -= shares;
      else noShares[id][msg.sender] -= shares;
      usdc.safeTransfer(msg.sender, payoutUsdc);
      m.volumeUsdc += payoutUsdc;
      usdcAmount = payoutUsdc;
    }

    m.qYes = qYes;
    m.qNo = qNo;

    emit Trade(id, msg.sender, isYes, isBuy, shares, usdcAmount);
  }

  function resolveMarket(uint256 id, bool outcomeYes) external onlyOwner {
    Market storage m = markets[id];
    require(block.timestamp >= m.endTime, "Not ended");
    require(!m.resolved, "Resolved");
    m.resolved = true;
    m.outcomeYes = outcomeYes;
    emit Resolved(id, outcomeYes);
  }

  function redeem(uint256 id) external nonReentrant {
    Market storage m = markets[id];
    require(m.resolved, "Not resolved");

    uint256 shares = m.outcomeYes ? yesShares[id][msg.sender] : noShares[id][msg.sender];
    require(shares > 0, "No shares");

    if (m.outcomeYes) yesShares[id][msg.sender] = 0;
    else noShares[id][msg.sender] = 0;

    uint256 payout = _toUsdc(shares);
    usdc.safeTransfer(msg.sender, payout);

    emit Redeemed(id, msg.sender, payout);
  }

  function priceYes(uint256 id) public view returns (uint256) {
    Market storage m = markets[id];
    return _price(m.qYes, m.qNo, m.b, true);
  }

  function priceNo(uint256 id) public view returns (uint256) {
    Market storage m = markets[id];
    return _price(m.qYes, m.qNo, m.b, false);
  }

  function getMarket(uint256 id)
    external
    view
    returns (
      string memory question,
      uint40 endTime,
      uint256 b,
      uint256 qYes,
      uint256 qNo,
      uint256 volumeUsdc,
      bool resolved,
      bool outcomeYes
    )
  {
    Market storage m = markets[id];
    return (m.question, m.endTime, m.b, m.qYes, m.qNo, m.volumeUsdc, m.resolved, m.outcomeYes);
  }

  function _price(uint256 qYes, uint256 qNo, uint256 b, bool yes) internal pure returns (uint256) {
    uint256 expYes = PRBMathUD60x18.exp(PRBMathUD60x18.div(qYes, b));
    uint256 expNo = PRBMathUD60x18.exp(PRBMathUD60x18.div(qNo, b));
    uint256 sum = expYes + expNo;
    if (sum == 0) return 0;
    return yes ? PRBMathUD60x18.div(expYes, sum) : PRBMathUD60x18.div(expNo, sum);
  }

  function _cost(uint256 qYes, uint256 qNo, uint256 b) internal pure returns (uint256) {
    uint256 expYes = PRBMathUD60x18.exp(PRBMathUD60x18.div(qYes, b));
    uint256 expNo = PRBMathUD60x18.exp(PRBMathUD60x18.div(qNo, b));
    uint256 sum = expYes + expNo;
    return PRBMathUD60x18.mul(b, PRBMathUD60x18.ln(sum));
  }

  function _toUsdc(uint256 amount18) internal pure returns (uint256) {
    return amount18 / USDC_SCALE;
  }

  function _toUsdcUp(uint256 amount18) internal pure returns (uint256) {
    return (amount18 + USDC_SCALE - 1) / USDC_SCALE;
  }
}
