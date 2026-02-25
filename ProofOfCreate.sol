// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfCreate
 * @dev A smart contract to register digital content hashes and prove ownership.
 *      First-come-first-served logic: the first person to register a hash owns it forever.
 */
contract ProofOfCreate {
    
    struct Certificate {
        address ownerWallet;
        string ownerId;        // E.g., User ID from the frontend auth
        uint256 timestamp;     // Block timestamp of registration
        bool exists;
    }

    // Mapping from a SHA-256 hash (bytes32) to its Certificate
    mapping(bytes32 => Certificate) public registry;

    // Events for the frontend to listen to
    event ContentRegistered(bytes32 indexed contentHash, address indexed owner, string ownerId, uint256 timestamp);

    /**
     * @dev Registers a new content hash.
     * @param _hash The SHA-256 hash of the digital content.
     * @param _ownerId The string identifier of the user (e.g. Google Auth ID).
     */
    function registerContent(bytes32 _hash, string memory _ownerId) public {
        // Enforce First-Come-First-Served Immutable Ownership
        require(!registry[_hash].exists, "ProofOfCreate: This content hash is already registered and copyrighted.");

        // Record the ownership
        registry[_hash] = Certificate({
            ownerWallet: msg.sender,
            ownerId: _ownerId,
            timestamp: block.timestamp,
            exists: true
        });

        // Emit event
        emit ContentRegistered(_hash, msg.sender, _ownerId, block.timestamp);
    }

    /**
     * @dev Verifies if a content hash exists and returns its details.
     * @param _hash The SHA-256 hash to verify.
     * @return ownerWallet The wallet address of the owner.
     * @return ownerId The string ID of the owner.
     * @return timestamp The time it was registered.
     * @return isRegistered Boolean indicating if it exists.
     */
    function verifyContent(bytes32 _hash) public view returns (
        address ownerWallet,
        string memory ownerId,
        uint256 timestamp,
        bool isRegistered
    ) {
        Certificate memory cert = registry[_hash];
        return (cert.ownerWallet, cert.ownerId, cert.timestamp, cert.exists);
    }
}
