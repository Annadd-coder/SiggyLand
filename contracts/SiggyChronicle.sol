// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SiggyChronicle is ERC721 {
  struct Chronicle {
    address author;
    string title;
    string metadataURI;
    bytes32 contentHash;
    uint16 primitiveMask;
    uint64 createdAt;
  }

  uint256 public totalSupply;
  mapping(uint256 => Chronicle) private chronicles;

  event ChronicleMinted(
    uint256 indexed tokenId,
    address indexed author,
    bytes32 indexed contentHash,
    string metadataURI,
    uint16 primitiveMask
  );

  constructor() ERC721("Siggy Chronicle", "SIGGY") {}

  function mintChronicle(
    string calldata title,
    string calldata metadataURI,
    bytes32 contentHash,
    uint16 primitiveMask
  ) external returns (uint256 tokenId) {
    bytes memory titleBytes = bytes(title);
    bytes memory uriBytes = bytes(metadataURI);

    require(titleBytes.length >= 3 && titleBytes.length <= 96, "Invalid title length");
    require(uriBytes.length >= 16 && uriBytes.length <= 512, "Invalid URI length");
    require(contentHash != bytes32(0), "Empty content hash");

    tokenId = ++totalSupply;

    chronicles[tokenId] = Chronicle({
      author: msg.sender,
      title: title,
      metadataURI: metadataURI,
      contentHash: contentHash,
      primitiveMask: primitiveMask,
      createdAt: uint64(block.timestamp)
    });

    _safeMint(msg.sender, tokenId);
    emit ChronicleMinted(tokenId, msg.sender, contentHash, metadataURI, primitiveMask);
  }

  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireOwned(tokenId);
    return chronicles[tokenId].metadataURI;
  }

  function getChronicle(uint256 tokenId) external view returns (Chronicle memory) {
    _requireOwned(tokenId);
    return chronicles[tokenId];
  }
}
