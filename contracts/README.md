# PredictionMarkets (Base)

This folder contains the on-chain contract used by the **Predict** section in `/ask`.

## Deploy

You can deploy with Hardhat, Foundry, or your preferred tool. The constructor args are:

1. `USDC` address on Base mainnet

After deployment, set:

```
PREDICT_MARKET_ADDRESS=<deployed address>
NEXT_PUBLIC_PREDICT_MARKET_ADDRESS=<same>
BASE_RPC_URL=<your Base RPC>
NEXT_PUBLIC_BASE_RPC_URL=<same or public RPC>
```

## How It Works

- YES/NO market using LMSR AMM pricing.
- Admin (`owner`) resolves the market after `endTime`.
- Winners redeem payouts automatically on-chain.

## Notes

- Shares are 1e18, USDC uses 6 decimals.
