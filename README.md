# 🐾 Animint

**Animint** is a decentralized pedigree registry for purebred animals, built on the **Internet Computer (ICP)**. It combines blockchain, IoT, and verifiable credentials to create tamper-proof, self-assembling animal family trees.

---

## 🌐 What is Animint?

Animint is a secure, verifiable platform where breeders, veterinarians, and owners can register and manage purebred animal lineages without relying on centralized databases. Each animal is registered on-chain using:

- **ISO-compliant microchip UIDs**
- **Vet-issued verifiable credentials**
- **Optional DNA hash proofs**

Every new litter generates a **“Puppy NFT”** (or species equivalent), which automatically links to its sire and dam’s on-chain identities, forming a multigenerational, immutable pedigree record.

---

## 🔐 Core Features

### ✅ Authenticity
- **Microchip Scans**: On-chain hash of ISO-compliant microchip IDs.
- **Vet-Signed Credentials**: Verifiable signatures validate legitimacy.
- **DNA Reports**: Optional genomic hashes stored off-chain, referenced by IPFS CID.

### 🧬 Self-Assembling Lineage
- Each offspring’s NFT links directly to its parents’ IDs.
- No need for centralized authorities — pedigree builds automatically on-chain.

### 🏅 Reputation Badges
- **Non-transferable tokens** for breeders, representing:
  - Show titles
  - Health certifications
  - Registry contributions

### 💎 Fractional Stud Shares
- Powered by a custom **ICP-1155-style** token standard.
- Enables shared breeding rights, royalties, and automated revenue splits.

### 🗳️ DAO Governance
- Community votes define:
  - Breed standards
  - Registration and minting fees
- Revenue flows into a DAO-controlled treasury.

---

## 💰 Economic Model

| Revenue Source             | Purpose                                    |
|---------------------------|--------------------------------------------|
| Minting Fees              | Fund DAO treasury and core maintenance     |
| Secondary Market Royalties| 1–2% fee to breeders + DAO                 |
| Premium Subscriptions     | Advanced dashboards & IoT integrations     |
| Incentive Discounts       | Top breeders earn fee discounts via badges |

---

## 📦 Off-Chain Metadata

Stored on IPFS and referenced via CIDs, metadata includes:

- Health records
- Vet credentials
- DNA report hashes
- IoT-captured life events (GPS, temperature, vaccination logs)

---

## 🔒 Security & Trust

- **On-Chain Microchip Proofs**: Immutable device identity anchors
- **IoT Integration**: Oracles verify GPS collars, vet devices, sequencers
- **Tamper-Resistant**: Automated validation prevents counterfeits or fraud

---

## 🛠️ Tech Stack

| Layer           | Tech |
|-----------------|------|
| Smart Contracts | Motoko on ICP |
| Storage         | IPFS (off-chain metadata) |
| Identity/Auth   | Internet Identity / Plug Wallet |
| Token Standards | Custom NFT (ICP-721) & Multi-Token (ICP-1155) |

---

## 📈 Premium Tools (Coming Soon)

- Lineage risk trend analysis
- Cross-breeding compatibility insights
- Health history visualization
- IoT device dashboard (microchip, collar, sequencer)

---

## 👫 Community & Governance

- **DAO Voting**: Decide on key platform rules
- **Open Standards**: Breed definitions and genetic health policies
- **Developer Tools**: SDKs for integrating vet systems and breeders' apps

---

## 🚀 Getting Started

### Prerequisites

- DFX SDK
- Node.js (for frontend, if applicable)
- Plug Wallet or Internet Identity

### Deployment

```bash
dfx start --background
dfx deploy
