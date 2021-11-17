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
            <button onClick={connectWeb3}>Connect Web3</button>
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
