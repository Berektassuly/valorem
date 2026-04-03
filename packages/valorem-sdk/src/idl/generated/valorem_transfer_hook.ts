/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/valorem_transfer_hook.json`.
 */
export type ValoremTransferHook = {
  "address": "JCdjqNU5JEfuupjT6EAuBphhALhyiBRJy9E3fstwR1Yd",
  "metadata": {
    "name": "valoremTransferHook",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "initializeHook",
      "discriminator": [
        37,
        101,
        119,
        255,
        156,
        39,
        252,
        232
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "config",
          "writable": true,
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
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "extraAccountMetaList",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "controller",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "issuePermit",
      "discriminator": [
        68,
        63,
        134,
        74,
        231,
        77,
        204,
        24
      ],
      "accounts": [
        {
          "name": "controller",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
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
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "permit",
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
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "sourceToken"
              },
              {
                "kind": "account",
                "path": "destinationToken"
              }
            ]
          }
        },
        {
          "name": "sourceToken"
        },
        {
          "name": "destinationToken"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "expiresAt",
          "type": "i64"
        }
      ]
    },
    {
      "name": "revokePermit",
      "discriminator": [
        1,
        245,
        99,
        29,
        176,
        216,
        229,
        206
      ],
      "accounts": [
        {
          "name": "controller",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
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
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "permit",
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
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "sourceToken"
              },
              {
                "kind": "account",
                "path": "destinationToken"
              }
            ]
          }
        },
        {
          "name": "sourceToken"
        },
        {
          "name": "destinationToken"
        }
      ],
      "args": []
    },
    {
      "name": "transferHook",
      "discriminator": [
        105,
        37,
        101,
        197,
        75,
        251,
        102,
        26
      ],
      "accounts": [
        {
          "name": "sourceToken"
        },
        {
          "name": "mint"
        },
        {
          "name": "destinationToken"
        },
        {
          "name": "owner"
        },
        {
          "name": "extraAccountMetaList",
          "writable": true
        },
        {
          "name": "permit",
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
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "sourceToken"
              },
              {
                "kind": "account",
                "path": "destinationToken"
              }
            ]
          }
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
      "name": "invalidController",
      "msg": "Only the configured settlement controller may issue permits."
    },
    {
      "code": 6001,
      "name": "invalidValidationAccount",
      "msg": "The supplied validation account does not match the mint's transfer-hook PDA."
    },
    {
      "code": 6002,
      "name": "permitMintMismatch",
      "msg": "The permit mint does not match the transfer mint."
    },
    {
      "code": 6003,
      "name": "permitSourceMismatch",
      "msg": "The permit source token account does not match the transfer source."
    },
    {
      "code": 6004,
      "name": "permitDestinationMismatch",
      "msg": "The permit destination token account does not match the transfer destination."
    },
    {
      "code": 6005,
      "name": "permitAuthorityMismatch",
      "msg": "The permit authority does not match the transfer authority."
    },
    {
      "code": 6006,
      "name": "permitAlreadyConsumed",
      "msg": "The permit has already been consumed."
    },
    {
      "code": 6007,
      "name": "permitExpired",
      "msg": "The transfer permit has expired."
    },
    {
      "code": 6008,
      "name": "invalidPermitAmount",
      "msg": "The permit amount must be greater than zero."
    },
    {
      "code": 6009,
      "name": "transferAmountExceedsPermit",
      "msg": "The transfer amount exceeds the remaining permit allowance."
    },
    {
      "code": 6010,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow while updating the permit."
    },
    {
      "code": 6011,
      "name": "accountMetaLayoutError",
      "msg": "Failed to derive or initialize the transfer-hook account metadata layout."
    },
    {
      "code": 6012,
      "name": "unsupportedTransferHookInstruction",
      "msg": "Only execute calls are supported through the fallback router."
    }
  ],
  "types": [
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
