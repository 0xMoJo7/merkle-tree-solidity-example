import whitelist from "./whitelist.js";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const buf2hex = x => '0x' + x.toString('hex')
const leaves = whitelist.map(x => keccak256(x))
const tree = new MerkleTree(leaves, keccak256)
// This is what we will pass in to our contract when we deploy it
console.log(buf2hex(tree.getRoot()))