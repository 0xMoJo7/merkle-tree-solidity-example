//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MerkleProof {
  function verify(
    bytes32 root,
    bytes32 leaf,
    bytes32[] memory proof,
    uint256[] memory positions
  )
    public
    pure
    returns (bool)
  {
    bytes32 computedHash = leaf;

    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 proofElement = proof[i];

      if (positions[i] == 1) {
        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
      } else {
        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
      }
    }

    return computedHash == root;
  }
}

contract Whitelist is MerkleProof {
  bytes32 public immutable merkleRoot;

  constructor (bytes32 _merkleRoot) {
      merkleRoot = _merkleRoot;
  }

  function verifyWhitelist(
      bytes32[] memory _proof, 
      uint256[] memory _positions
    ) 
      public 
      view 
      returns (bool) 
    {
        bytes32 _leaf = keccak256(abi.encodePacked(msg.sender));
        return MerkleProof.verify(merkleRoot, _leaf, _proof, _positions);
    }
}