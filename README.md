# Merkle Tree Basic Concepts

Merkle Trees are an integral part of any blockchain system and are used extensively for its benefits. The Merkle Tree (or hash tree) was invented in 1979 by Ralph Merkle as a cryptographic means of validating data efficiently and securely for rather large data structures. It allows validation of data without exposing a full data set. The verification of existence of any child data set (leaf node) is possible using a fixed number of other data nodes. We will implement a simple example of Merkle Proofs in this tutorial.

Here is an example of a simple Merkle tree.
![Simple Merkle](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0vp0d1ypz1c8nzt5oyiy.png)

The top level is known as the root of the Merkle tree, which we will store as an immutable bytes32 object in our Solidity code. The bottom most nodes are known as the leaf nodes (which will be the hash of our whitelisted addresses), which are then used to generate the intermediate nodes and the root. The intermediate nodes are the hash of it's child nodes. As long as we keep the addresses and the order we hashed them private, no one will be able to reverse engineer our Merkle Tree or root, and bypass our validation. 

If your address list needs to be public, you may consider hashing a concatenated string of a static variable (such as your contract address) and wallet addresses to prevent someone from recreating your Merkle Tree and bypassing validation.

I highly encourage reading up on the concepts of a [Merkle Tree](https://blog.iden3.io/merkle-trees-visual-introduction.html), while you can just copy and paste this code and make it work, the underlying concepts are both highly interesting and can be applied to other places in your development journey. Or, you can just skip to the [repo](https://github.com/0xMoJo7/merkle-tree-solidity-example) :)

Before we get too far...This tutorial assumes you have a basic understanding of Solidity, React, Ethers.js and Hardhat. If you are new or need a refresher, there is a fantastic tutorial by [Nader](https://dev.to/dabit3) located [here](https://dev.to/dabit3/the-complete-guide-to-full-stack-ethereum-development-3j13).

# Contract

Ok, let's jump in. Here is the full contract:

#### Whitelist.sol
```javascript
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
```

As mentioned before, we are going to pass the `merkleRoot` to the constructor of the Whitelist contract when we deploy it. We will generate it using the `merklejs` library in the next step.

Since computation on the Ethereum blockchain is expensive (each byte of data costs additional gas), the rest of the hashing and parameter generation will be done off-chain. 
* The leaf node generation, which is a hash of our `msg.sender`, is done inside the `verifyWhitelist` function in the contract. 
* The `_proof` array will be another hash of that specific leaf. This allows us to prove "Proof-of-inclusion" in our Merkle Tree without revealing or calculating all of the information in the tree.
* Finally, the `_positions` array contains the positions of the corresponding proof (aka node) in the Merkle Tree, so that users can verify the consistency by computing the root value directly.

# Generating our Merkle Root

This script (which you will see parts of later in our `App.js`) generates the Merkle Root. It requires that you have the packages `merkletreejs` and `keccack256` (hashing function also available in Solidity) installed.


#### generateMerkleRoot.mjs

```javascript
import whitelist from "./whitelist.js";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const buf2hex = x => '0x' + x.toString('hex')
const leaves = whitelist.map(x => keccak256(x))
const tree = new MerkleTree(leaves, keccak256)
// This is what we will pass in to our contract when we deploy it
console.log(buf2hex(tree.getRoot()))
```

For the sake of example, the variable `whitelist` is simply an array of Ethereum addresses imported from a file in the same directory. In production, you should consider using a json, or something a bit more secure/efficient. You can add your own Ethereum address or a test account address in the array so you can test the functionality when we are done.

- `buf2hex` is a function that converts our buffered array to hexadecimal. 
- We create the leaves after hashing them with `keccak256` and pass them to the `MerkleTree` constructor to generate the actual tree. 
- Finally, we call `tree.getRoot()` and convert it to hexadecimal, while logging the output to the console. (Save this somewhere safe for your deployment.)


# React / App.js

After compiling your contract using `npx hardhat compile` and deploying to a test network (or localhost) we can now take a look at our actual dapp implementation. For simplicity, we are going to keep all of our Merkle logic in `App.js`


#### App.js

```javascript
import logo from "./logo.png";
import "./App.css";
import React, { useContext, useState, useEffect } from "react";
import { Web3Context } from "./web3";
import contract from './artifacts/contracts/Merkle.sol/Whitelist.json'
import { ethers } from 'ethers'
import whitelist from './merkle/whitelist'
const { MerkleTree } = require("merkletreejs");
const keccak256 = require('keccak256')

function App() {
  const { account, connectWeb3, logout, provider } = useContext(Web3Context)
  const [approved, setApproved] = useState(false);

  const whitelistContractAddress = "0x49F59D1b3035055a5DF5F4EbF876b33f204E5aB1"   // Rinkeby

  const merkle = async () => {
    const whitelistContract = new ethers.Contract(whitelistContractAddress, contract.abi, provider.getSigner())

    const buf2hex = x => '0x' + x.toString('hex')
    const leaves = whitelist.map(x => keccak256(x))
    const tree = new MerkleTree(leaves, keccak256);
    const leaf = keccak256(account)
    const hexProof = tree.getProof(leaf).map(x => buf2hex(x.data))
    const positions = tree.getProof(leaf).map(x => x.position === 'right' ? 1 : 0)
    let result = await whitelistContract.functions.verifyWhitelist(hexProof, positions);
    setApproved(result[0]);
  }

  useEffect(() => {
    if (account != null) {
        merkle(); 
    }
  }, [account])

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="ethereum_logo" />
        <div>
          {account == null ? (
            <button onClick={connectWeb3}>Connect to MetaMask</button>
          ) : (
            <div>
              <p>Account: {account}</p>
              {approved ? <p>Congratulations, you are approved!</p> : <p>Sorry, you are not approved</p>}
              <button onClick={logout}>Logout</button>
            </div>
          )}
        </div>
        <br />
      </header>
    </div>
  );
}
export default App;
```

Again, this tutorial assumes you do know a bit of React and ethers.js, so we won't be diving into the nitty gritty of every line. 

In the main `<div>` of the webpage, you will see a conditional rendering based on the `account` being instantiated (see the web3 directory and Web3Context in the git repo for more details). Since the user hasn't connected their wallet to the website this will return a "Connect to MetaMask" button. Once you have connected to an Ethereum network **(make sure you connect to the same network you deployed your contract to)**, React's `useEffect()` function will be called since your `account` is no longer null. In turn, we call the `merkle()` function within the `useEffect()`. 

Fortunately, we do not have to compute the root again, but we do need other parameters passed into the smart contract. Lucky for us, it calculates and hashes our parameters very quickly, all based on the end user's wallet address. You'll recognize some code from our `generateMerkleTreeRoot.mjs` file. It would be possible to export/import the `leaves` and `tree` if we reworked the `generateMerkleTreeRoot.mjs`, but for the sake of simplicity, we will keep the logic here and recompute these variables.

Once `hexProof` and `positions` are generated, we pass them to our contract and await for our boolean response. Using React's `useState()`, if the smart contract and Merkle Tree return true, we set `approved` to true, which renders "Congratulations, you are approved!".

You can use this frontend logic to conditionally render a mint button or build an address gated site for a select group of users. (For example, you could use [moralis](https://moralis.io/) or a subgraph to gather all your token holders and give access to exclusive content).

If you are going to render a whitelist mint button for a NFT, make sure that you include the Merkle Proof validation logic in your contract's mint function too, with `require(verifyWhitelist(_proof, _positions))` to prevent people from just going around your website and minting on contract.

#### Thanks For Reading!
I hope you found this tutorial helpful! Due to lack of available material, it took me longer than expected to implement this, so hopefully this helps someone! If you have any questions, suggestions on how to improve this solution, or think I could simply explain this better; feel free to leave me a note in the comments.

Feel free to follow me on [Twitter](https://twitter.com/0xMojo7) and [Github](https://github.com/0xmojo7) as I plan on building more tutorials and blogging about the new things I learn upon my journey into web3. 

Special thanks to [Sudeep](https://github.com/sudeepb02) for the frontend and writing help! We used his very nice bare minimum template based on `create-react-app` that installs all the main tools needed to build a dapp without the extra bloat, check it out [here](https://github.com/sudeepb02/cra-template-bm-dapp#readme). We became friends in [DEV_DAO](https://www.developerdao.com/), which is a DAO dedicated to helping web3 developers connect and provide learning resources. 
