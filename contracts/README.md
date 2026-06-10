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

---

# SiggyChronicle (Ritual)

`SiggyChronicle.sol` is the on-chain passport contract for Siggy Land project and skill-pack passports.

## Deploy Target

```
Chain ID: 1979
RPC: https://rpc.ritualfoundation.org
Explorer: https://explorer.ritualfoundation.org
Native token: RITUAL
```

## After Deployment

Set:

```
NEXT_PUBLIC_SIGGY_CHRONICLE_ADDRESS=<deployed SiggyChronicle address>
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
OPENAI_API_KEY=<for Siggy + AI cover generation>
OPENAI_IMAGE_MODEL=gpt-image-1
PROFILE_DB_PATH=<persistent sqlite path>
```

## Foundry Deploy

The repo includes `foundry.toml`, so the contracts can be compiled and deployed with Foundry:

```
forge build

forge create contracts/SiggyChronicle.sol:SiggyChronicle \
  --rpc-url https://rpc.ritualfoundation.org \
  --private-key $RITUAL_DEPLOYER_PRIVATE_KEY \
  --broadcast
```

## Mint Flow

1. User chooses a skill pack or asks Siggy for a build recipe.
2. User signs the metadata payload with their wallet.
3. Backend stores the manifest, AI cover, content hash, and metadata route.
4. User signs `mintChronicle(...)` on Ritual Chain.
5. `tokenURI()` points to `/api/chronicles/:id/metadata`.
6. Metadata points to `/api/chronicles/:id/image.svg`, which overlays live status from RitualWallet.

No backend private key is required.

---

# SiggyAgentRegistry (Ritual)

`SiggyAgentRegistry.sol` is the lightweight registry for agent instances created in the Agent Foundry.
It does not run agents by itself. It records the user's configured agent manifest, skill pack, manifest hash, and status.

## Why separate from the NFT?

- `SiggyChronicle` is the visible passport NFT.
- `SiggyAgentRegistry` is the operational registry for agent instances and status.

This keeps collectibles and operational state separate.

## Status Model

```
Draft -> Configured -> Funded -> Launched -> Running
                              -> Paused / Failed / Archived
```

For the first production deploy, the app can mint passports immediately and register agents once:

```
NEXT_PUBLIC_SIGGY_CHRONICLE_ADDRESS=<deployed SiggyChronicle>
NEXT_PUBLIC_SIGGY_AGENT_REGISTRY_ADDRESS=<deployed SiggyAgentRegistry>
```

Future Ritual launch buttons can update registry status after:

- RitualWallet deposit is detected.
- Sovereign/Persistent agent launch tx is submitted.
- Scheduler/agent callback confirms progress.

## Agent Registry Deploy

```
forge create contracts/SiggyAgentRegistry.sol:SiggyAgentRegistry \
  --rpc-url https://rpc.ritualfoundation.org \
  --private-key $RITUAL_DEPLOYER_PRIVATE_KEY \
  --broadcast
```

After deployment, set:

```
NEXT_PUBLIC_SIGGY_AGENT_REGISTRY_ADDRESS=<deployed SiggyAgentRegistry>
```

## Agent Application Flow

1. User selects an agent blueprint and skill pack.
2. User clicks **Use Agent** to run the selected product workspace in the app.
3. User can sign and save the run output.
4. If `SiggyAgentRegistry` is deployed and the agent is registered, the app can call `recordRun(...)`.
5. The registry stores the latest output hash, run URI, status, and run count.
