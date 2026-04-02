# Valorem: Core Idea

Valorem is a Solana-based auction protocol for real-world assets where the auction result does not automatically equal asset transfer.

The protocol is designed for transactions that must satisfy three conditions at once:

1. Bid privacy during the auction.
2. Financial commitment from participants.
3. Compliance-gated settlement after the winner is determined.

The commercial thesis is straightforward:

- Standard NFT auction mechanics are not suitable for RWA transactions.
- Institutional buyers do not want public bidding visibility.
- Issuers cannot allow automatic asset transfer without KYC, AML, and legal completion.
- Winning an RWA auction should grant the right to settle a transaction, not immediate unrestricted ownership transfer.

Valorem solves this by combining sealed bidding with post-auction compliance control.

At the auction stage, users submit a commitment to a bid rather than the bid itself. The bid remains hidden until the reveal phase. A fixed earnest-money deposit makes participation economically credible and gives the seller an enforcement mechanism against non-serious or manipulative bidders.

At the settlement stage, the asset remains under protocol control until the winner satisfies off-chain requirements. Only after compliance approval and final payment does the protocol release the RWA position. If the winner fails to complete settlement, the protocol can slash the deposit and move settlement rights to the next qualified bidder.

In practical terms, Valorem is not an NFT marketplace with cosmetic compliance language. It is an auction and settlement framework for regulated, high-value asset transfers where price discovery, legal readiness, and settlement authority must remain separate.
