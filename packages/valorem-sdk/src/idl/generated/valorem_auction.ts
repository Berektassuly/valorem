/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/valorem_auction.json`.
 */
export type ValoremAuction = {
  "address": "FG6nnyfyztJyn1Yzov6xHqfjRMJGTpHd6T5LwPJuruPS",
  "metadata": {
    "name": "valoremAuction",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "advanceToReveal",
      "discriminator": [
        137,
        109,
        48,
        201,
        93,
        38,
        29,
        171
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "claimRefund",
      "discriminator": [
        15,
        16,
        30,
        161,
        255,
        228,
        97,
        60
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "paymentVault",
          "writable": true
        },
        {
          "name": "bidderPaymentAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "closeReveal",
      "discriminator": [
        178,
        16,
        118,
        36,
        7,
        42,
        184,
        51
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "currentCandidateState",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "depositAsset",
      "discriminator": [
        107,
        93,
        89,
        87,
        226,
        203,
        154,
        19
      ],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "assetVault",
          "writable": true
        },
        {
          "name": "issuerAssetAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initializeAuction",
      "discriminator": [
        37,
        10,
        117,
        197,
        208,
        88,
        117,
        62
      ],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "reviewer"
        },
        {
          "name": "assetMint"
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "issuer"
              },
              {
                "kind": "arg",
                "path": "args.auction_seed"
              }
            ]
          }
        },
        {
          "name": "assetVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "issuerPaymentDestination"
        },
        {
          "name": "hookConfig",
          "writable": true
        },
        {
          "name": "extraAccountMetaList",
          "writable": true
        },
        {
          "name": "transferHookProgram",
          "address": "JCdjqNU5JEfuupjT6EAuBphhALhyiBRJy9E3fstwR1Yd"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initializeAuctionArgs"
            }
          }
        }
      ]
    },
    {
      "name": "reclaimUnsoldAsset",
      "discriminator": [
        22,
        222,
        45,
        12,
        181,
        62,
        253,
        86
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "assetMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "assetVault",
          "writable": true
        },
        {
          "name": "issuerAssetAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "recordCompliance",
      "discriminator": [
        152,
        200,
        174,
        203,
        214,
        238,
        172,
        245
      ],
      "accounts": [
        {
          "name": "reviewer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bidder"
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "complianceRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  108,
                  105,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "status",
          "type": {
            "defined": {
              "name": "complianceStatus"
            }
          }
        },
        {
          "name": "attestationDigest",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "expiresAt",
          "type": "i64"
        }
      ]
    },
    {
      "name": "revealBid",
      "discriminator": [
        48,
        73,
        28,
        255,
        202,
        126,
        236,
        196
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "bidAmount",
          "type": "u64"
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "settleCandidate",
      "discriminator": [
        192,
        233,
        48,
        39,
        225,
        220,
        237,
        87
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "assetMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "complianceRecord",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  108,
                  105,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "paymentVault",
          "writable": true
        },
        {
          "name": "bidderPaymentAccount",
          "writable": true
        },
        {
          "name": "assetVault",
          "writable": true
        },
        {
          "name": "bidderAssetAccount",
          "writable": true
        },
        {
          "name": "hookConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                255,
                145,
                155,
                101,
                187,
                115,
                162,
                4,
                71,
                252,
                163,
                174,
                92,
                172,
                28,
                170,
                111,
                14,
                125,
                33,
                246,
                36,
                46,
                50,
                194,
                146,
                219,
                12,
                186,
                81,
                214,
                170
              ]
            }
          }
        },
        {
          "name": "extraAccountMetaList",
          "writable": true
        },
        {
          "name": "transferPermit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "account",
                "path": "assetVault"
              },
              {
                "kind": "account",
                "path": "bidderAssetAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                255,
                145,
                155,
                101,
                187,
                115,
                162,
                4,
                71,
                252,
                163,
                174,
                92,
                172,
                28,
                170,
                111,
                14,
                125,
                33,
                246,
                36,
                46,
                50,
                194,
                146,
                219,
                12,
                186,
                81,
                214,
                170
              ]
            }
          }
        },
        {
          "name": "transferHookProgram",
          "address": "JCdjqNU5JEfuupjT6EAuBphhALhyiBRJy9E3fstwR1Yd"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "slashCandidateAndAdvance",
      "discriminator": [
        180,
        54,
        39,
        145,
        104,
        193,
        212,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "currentBidderState",
          "writable": true
        },
        {
          "name": "complianceRecord",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  108,
                  105,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "current_bidder_state.bidder",
                "account": "bidderState"
              }
            ]
          }
        },
        {
          "name": "nextCandidateState",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "reason",
          "type": {
            "defined": {
              "name": "slashReason"
            }
          }
        }
      ]
    },
    {
      "name": "slashUnrevealed",
      "discriminator": [
        255,
        64,
        98,
        195,
        123,
        40,
        38,
        243
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidderState",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "submitCommitment",
      "discriminator": [
        48,
        171,
        16,
        125,
        219,
        133,
        58,
        87
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "paymentVault",
          "writable": true
        },
        {
          "name": "bidderPaymentAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "withdrawProceeds",
      "discriminator": [
        124,
        68,
        215,
        12,
        201,
        136,
        54,
        72
      ],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "paymentVault",
          "writable": true
        },
        {
          "name": "issuerPaymentDestination",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "bidderState",
      "discriminator": [
        73,
        170,
        154,
        242,
        223,
        51,
        146,
        126
      ]
    },
    {
      "name": "complianceRecord",
      "discriminator": [
        147,
        228,
        164,
        27,
        251,
        44,
        67,
        185
      ]
    },
    {
      "name": "hookConfig",
      "discriminator": [
        137,
        155,
        101,
        95,
        138,
        72,
        8,
        182
      ]
    },
    {
      "name": "transferPermit",
      "discriminator": [
        87,
        42,
        149,
        94,
        190,
        218,
        130,
        255
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized action."
    },
    {
      "code": 6001,
      "name": "invalidPhase",
      "msg": "Auction is in the wrong phase."
    },
    {
      "code": 6002,
      "name": "biddingClosed",
      "msg": "Bidding is closed."
    },
    {
      "code": 6003,
      "name": "revealClosed",
      "msg": "Reveal is closed."
    },
    {
      "code": 6004,
      "name": "biddingStillOpen",
      "msg": "Bidding is still open."
    },
    {
      "code": 6005,
      "name": "revealStillOpen",
      "msg": "Reveal is still open."
    },
    {
      "code": 6006,
      "name": "settlementWindowElapsed",
      "msg": "Settlement window elapsed."
    },
    {
      "code": 6007,
      "name": "settlementWindowStillOpen",
      "msg": "Settlement window is still open."
    },
    {
      "code": 6008,
      "name": "bidderCapReached",
      "msg": "Bidder cap reached."
    },
    {
      "code": 6009,
      "name": "revealMismatch",
      "msg": "Reveal does not match commitment."
    },
    {
      "code": 6010,
      "name": "bidAlreadyRevealed",
      "msg": "Bid already revealed."
    },
    {
      "code": 6011,
      "name": "bidNotRevealed",
      "msg": "Bid not revealed."
    },
    {
      "code": 6012,
      "name": "notActiveSettlementCandidate",
      "msg": "Not the active settlement candidate."
    },
    {
      "code": 6013,
      "name": "complianceNotApproved",
      "msg": "Compliance approval required."
    },
    {
      "code": 6014,
      "name": "complianceExpired",
      "msg": "Compliance approval expired."
    },
    {
      "code": 6015,
      "name": "complianceStillPending",
      "msg": "Compliance still pending."
    },
    {
      "code": 6016,
      "name": "depositNotPaid",
      "msg": "Deposit not paid."
    },
    {
      "code": 6017,
      "name": "depositAlreadyResolved",
      "msg": "Deposit already refunded or slashed."
    },
    {
      "code": 6018,
      "name": "bidderStillEligibleForSettlement",
      "msg": "Bidder is still eligible for fallback settlement."
    },
    {
      "code": 6019,
      "name": "assetAlreadyDeposited",
      "msg": "Asset already deposited."
    },
    {
      "code": 6020,
      "name": "assetNotDeposited",
      "msg": "Asset not deposited."
    },
    {
      "code": 6021,
      "name": "auctionAlreadySettled",
      "msg": "Auction already settled."
    },
    {
      "code": 6022,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow."
    },
    {
      "code": 6023,
      "name": "paymentMintMismatch",
      "msg": "Payment mint mismatch."
    },
    {
      "code": 6024,
      "name": "assetMintMismatch",
      "msg": "Asset mint mismatch."
    },
    {
      "code": 6025,
      "name": "bidAmountBelowDeposit",
      "msg": "Bid amount must exceed deposit."
    },
    {
      "code": 6026,
      "name": "currentCandidateAccountMismatch",
      "msg": "Current candidate account mismatch."
    },
    {
      "code": 6027,
      "name": "nextCandidateAccountMismatch",
      "msg": "Next candidate account mismatch."
    },
    {
      "code": 6028,
      "name": "invalidHookConfigAccount",
      "msg": "Hook config PDA mismatch."
    },
    {
      "code": 6029,
      "name": "invalidHookValidationAccount",
      "msg": "Hook validation PDA mismatch."
    },
    {
      "code": 6030,
      "name": "invalidDepositAmount",
      "msg": "Deposit amount must be positive."
    },
    {
      "code": 6031,
      "name": "invalidAssetAmount",
      "msg": "Asset amount must be positive."
    },
    {
      "code": 6032,
      "name": "invalidAuctionWindow",
      "msg": "Auction windows are invalid."
    },
    {
      "code": 6033,
      "name": "invalidSettlementWindow",
      "msg": "Settlement window must be positive."
    },
    {
      "code": 6034,
      "name": "invalidMaxBidders",
      "msg": "max_bidders is out of range."
    },
    {
      "code": 6035,
      "name": "bidderNotRanked",
      "msg": "Bidder not found in ranked ladder."
    },
    {
      "code": 6036,
      "name": "bidderMismatch",
      "msg": "Bidder mismatch."
    },
    {
      "code": 6037,
      "name": "insufficientWithdrawableProceeds",
      "msg": "Insufficient withdrawable proceeds."
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "reviewerAuthority",
            "type": "pubkey"
          },
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "assetVault",
            "type": "pubkey"
          },
          {
            "name": "paymentVault",
            "type": "pubkey"
          },
          {
            "name": "issuerPaymentDestination",
            "type": "pubkey"
          },
          {
            "name": "transferHookConfig",
            "type": "pubkey"
          },
          {
            "name": "transferHookValidation",
            "type": "pubkey"
          },
          {
            "name": "auctionSeed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "phase",
            "type": {
              "defined": {
                "name": "auctionPhase"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "assetDeposited",
            "type": "bool"
          },
          {
            "name": "hasSettledBidder",
            "type": "bool"
          },
          {
            "name": "settledBidder",
            "type": "pubkey"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "reservePrice",
            "type": "u64"
          },
          {
            "name": "assetAmount",
            "type": "u64"
          },
          {
            "name": "totalDepositsHeld",
            "type": "u64"
          },
          {
            "name": "totalSlashed",
            "type": "u64"
          },
          {
            "name": "totalProceeds",
            "type": "u64"
          },
          {
            "name": "totalWithdrawn",
            "type": "u64"
          },
          {
            "name": "biddingEndAt",
            "type": "i64"
          },
          {
            "name": "revealEndAt",
            "type": "i64"
          },
          {
            "name": "settlementWindow",
            "type": "i64"
          },
          {
            "name": "activeSettlementStartedAt",
            "type": "i64"
          },
          {
            "name": "maxBidders",
            "type": "u16"
          },
          {
            "name": "registeredBidders",
            "type": "u16"
          },
          {
            "name": "currentSettlementIndex",
            "type": "u16"
          },
          {
            "name": "rankedBidders",
            "type": {
              "vec": {
                "defined": {
                  "name": "rankedBid"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "auctionPhase",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "bidding"
          },
          {
            "name": "reveal"
          },
          {
            "name": "settlement"
          },
          {
            "name": "completed"
          }
        ]
      }
    },
    {
      "name": "bidderState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "commitment",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "commitmentSubmittedAt",
            "type": "i64"
          },
          {
            "name": "bidAmount",
            "type": "u64"
          },
          {
            "name": "revealTimestamp",
            "type": "i64"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "rank",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "depositPaid",
            "type": "bool"
          },
          {
            "name": "revealed",
            "type": "bool"
          },
          {
            "name": "settlementEligible",
            "type": "bool"
          },
          {
            "name": "complianceApproved",
            "type": "bool"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "depositRefunded",
            "type": "bool"
          },
          {
            "name": "depositSlashed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "complianceRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "reviewer",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "complianceStatus"
              }
            }
          },
          {
            "name": "attestationDigest",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reviewedAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "complianceStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "approved"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "hookConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "controller",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "initializeAuctionArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionSeed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "reservePrice",
            "type": "u64"
          },
          {
            "name": "assetAmount",
            "type": "u64"
          },
          {
            "name": "biddingEndAt",
            "type": "i64"
          },
          {
            "name": "revealEndAt",
            "type": "i64"
          },
          {
            "name": "settlementWindow",
            "type": "i64"
          },
          {
            "name": "maxBidders",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "rankedBid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "revealTimestamp",
            "type": "i64"
          },
          {
            "name": "disqualified",
            "type": "bool"
          },
          {
            "name": "settled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "slashReason",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "missedSettlementWindow"
          },
          {
            "name": "rejectedCompliance"
          },
          {
            "name": "expiredCompliance"
          }
        ]
      }
    },
    {
      "name": "transferPermit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "sourceToken",
            "type": "pubkey"
          },
          {
            "name": "destinationToken",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "allowedAmount",
            "type": "u64"
          },
          {
            "name": "remainingAmount",
            "type": "u64"
          },
          {
            "name": "issuedAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "consumed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
