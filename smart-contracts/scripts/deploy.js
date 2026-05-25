const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy OrbitToken
  console.log('\n1. Deploying OrbitToken...');
  const OrbitToken = await hre.ethers.getContractFactory('OrbitToken');
  const orbitToken = await OrbitToken.deploy();
  await orbitToken.waitForDeployment();
  const tokenAddress = await orbitToken.getAddress();
  console.log('   OrbitToken deployed to:', tokenAddress);

  // Deploy RewardDistributor
  console.log('\n2. Deploying RewardDistributor...');
  const RewardDistributor = await hre.ethers.getContractFactory('RewardDistributor');
  const distributor = await RewardDistributor.deploy(tokenAddress);
  await distributor.waitForDeployment();
  const distributorAddress = await distributor.getAddress();
  console.log('   RewardDistributor deployed to:', distributorAddress);

  // Grant minter role to RewardDistributor
  console.log('\n3. Granting minter role to RewardDistributor...');
  const tx = await orbitToken.addMinter(distributorAddress);
  await tx.wait();
  console.log('   Minter role granted!');

  console.log('\n═══════════════════════════════════════');
  console.log('  Deployment Summary');
  console.log('═══════════════════════════════════════');
  console.log('  OrbitToken:         ', tokenAddress);
  console.log('  RewardDistributor:  ', distributorAddress);
  console.log('  Deployer:           ', deployer.address);
  console.log('═══════════════════════════════════════\n');

  // Save deployment info
  const fs = require('fs');
  const deployment = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      OrbitToken: tokenAddress,
      RewardDistributor: distributorAddress,
    },
    deployer: deployer.address,
  };
  fs.writeFileSync('./deployments.json', JSON.stringify(deployment, null, 2));
  console.log('Deployment info saved to deployments.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
