// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract SiggyAgentRegistry {
  enum AgentStatus {
    Draft,
    Configured,
    Funded,
    Launched,
    Running,
    Paused,
    Failed,
    Archived
  }

  struct AgentRecord {
    address owner;
    string name;
    string blueprintId;
    string skillPackId;
    string manifestURI;
    bytes32 manifestHash;
    bytes32 lastRunHash;
    string lastRunURI;
    AgentStatus status;
    uint32 runCount;
    uint64 createdAt;
    uint64 updatedAt;
  }

  uint256 public agentCount;
  mapping(uint256 => AgentRecord) private agents;

  event AgentRegistered(
    uint256 indexed agentId,
    address indexed owner,
    bytes32 indexed manifestHash,
    string blueprintId,
    string skillPackId,
    string manifestURI
  );
  event AgentStatusUpdated(uint256 indexed agentId, AgentStatus status);
  event AgentManifestUpdated(uint256 indexed agentId, bytes32 indexed manifestHash, string manifestURI);
  event AgentRunRecorded(
    uint256 indexed agentId,
    bytes32 indexed outputHash,
    string outputURI,
    AgentStatus status,
    uint32 runCount
  );

  modifier onlyAgentOwner(uint256 agentId) {
    require(_exists(agentId), "Unknown agent");
    require(agents[agentId].owner == msg.sender, "Not agent owner");
    _;
  }

  function registerAgent(
    string calldata name,
    string calldata blueprintId,
    string calldata skillPackId,
    string calldata manifestURI,
    bytes32 manifestHash
  ) external returns (uint256 agentId) {
    require(bytes(name).length >= 3 && bytes(name).length <= 96, "Invalid name length");
    require(bytes(blueprintId).length >= 3 && bytes(blueprintId).length <= 64, "Invalid blueprint");
    require(bytes(skillPackId).length >= 3 && bytes(skillPackId).length <= 64, "Invalid skill pack");
    require(bytes(manifestURI).length >= 16 && bytes(manifestURI).length <= 512, "Invalid URI length");
    require(manifestHash != bytes32(0), "Empty manifest hash");

    agentId = ++agentCount;
    agents[agentId] = AgentRecord({
      owner: msg.sender,
      name: name,
      blueprintId: blueprintId,
      skillPackId: skillPackId,
      manifestURI: manifestURI,
      manifestHash: manifestHash,
      lastRunHash: bytes32(0),
      lastRunURI: "",
      status: AgentStatus.Configured,
      runCount: 0,
      createdAt: uint64(block.timestamp),
      updatedAt: uint64(block.timestamp)
    });

    emit AgentRegistered(agentId, msg.sender, manifestHash, blueprintId, skillPackId, manifestURI);
  }

  function updateManifest(
    uint256 agentId,
    string calldata manifestURI,
    bytes32 manifestHash
  ) external onlyAgentOwner(agentId) {
    require(bytes(manifestURI).length >= 16 && bytes(manifestURI).length <= 512, "Invalid URI length");
    require(manifestHash != bytes32(0), "Empty manifest hash");

    AgentRecord storage record = agents[agentId];
    record.manifestURI = manifestURI;
    record.manifestHash = manifestHash;
    record.updatedAt = uint64(block.timestamp);

    emit AgentManifestUpdated(agentId, manifestHash, manifestURI);
  }

  function updateStatus(uint256 agentId, AgentStatus status) external onlyAgentOwner(agentId) {
    AgentRecord storage record = agents[agentId];
    record.status = status;
    record.updatedAt = uint64(block.timestamp);
    emit AgentStatusUpdated(agentId, status);
  }

  function recordRun(
    uint256 agentId,
    bytes32 outputHash,
    string calldata outputURI,
    AgentStatus status
  ) external onlyAgentOwner(agentId) {
    require(outputHash != bytes32(0), "Empty output hash");
    require(bytes(outputURI).length <= 512, "Invalid URI length");

    AgentRecord storage record = agents[agentId];
    record.lastRunHash = outputHash;
    record.lastRunURI = outputURI;
    record.status = status;
    record.runCount += 1;
    record.updatedAt = uint64(block.timestamp);

    emit AgentRunRecorded(agentId, outputHash, outputURI, status, record.runCount);
  }

  function getAgent(uint256 agentId) external view returns (AgentRecord memory) {
    require(_exists(agentId), "Unknown agent");
    return agents[agentId];
  }

  function _exists(uint256 agentId) private view returns (bool) {
    return agentId > 0 && agentId <= agentCount && agents[agentId].owner != address(0);
  }
}
