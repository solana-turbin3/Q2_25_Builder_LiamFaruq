use solana_idlgen::idlgen;

idlgen!({
  "version": "0.1.0",
  "name": "turbine_prereq",
  "metadata": {
    "address": "ADcaide4vBtKuyZQqdU689YqEGZMCmS4tL35bdTv9wJa"
  },
  "instructions": [
    {
      "name": "complete",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "prereq",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              { "kind": "const", "value": [112,114,101,114,101,113] },
              { "kind": "account", "path": "signer" }
            ]
          }
        },
        {
          "name": "system_program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        { "name": "github", "type": "bytes" }
      ]
    },
    {
      "name": "update",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "prereq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "system_program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        { "name": "github", "type": "bytes" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "SolanaCohort5Account",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "github", "type": "bytes" },
          { "name": "key", "type": "pubkey" }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidGithubAccount",
      "msg": "Invalid Github account"
    }
  ]
});
