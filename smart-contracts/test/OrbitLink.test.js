const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('OrbitToken (Orbs)', function () {
  let orbitToken;
  let owner, user1, user2, minter;

  beforeEach(async function () {
    [owner, user1, user2, minter] = await ethers.getSigners();
    const OrbitToken = await ethers.getContractFactory('OrbitToken');
    orbitToken = await OrbitToken.deploy();
    await orbitToken.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set correct name and symbol', async function () {
      expect(await orbitToken.name()).to.equal('Orbs');
      expect(await orbitToken.symbol()).to.equal('ORBS');
    });

    it('should mint initial supply to deployer', async function () {
      const balance = await orbitToken.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther('100000000'));
    });

    it('should set deployer as owner', async function () {
      expect(await orbitToken.owner()).to.equal(owner.address);
    });

    it('should have correct max supply', async function () {
      expect(await orbitToken.MAX_SUPPLY()).to.equal(ethers.parseEther('1000000000'));
    });
  });

  describe('Minting', function () {
    it('should allow owner to mint', async function () {
      await orbitToken.mint(user1.address, ethers.parseEther('1000'));
      expect(await orbitToken.balanceOf(user1.address)).to.equal(ethers.parseEther('1000'));
    });

    it('should allow approved minter to mint', async function () {
      await orbitToken.addMinter(minter.address);
      await orbitToken.connect(minter).mint(user1.address, ethers.parseEther('500'));
      expect(await orbitToken.balanceOf(user1.address)).to.equal(ethers.parseEther('500'));
    });

    it('should reject unauthorized minter', async function () {
      await expect(
        orbitToken.connect(user1).mint(user2.address, ethers.parseEther('100'))
      ).to.be.revertedWith('Orbs: caller is not a minter');
    });

    it('should reject minting beyond max supply', async function () {
      await expect(
        orbitToken.mint(user1.address, ethers.parseEther('999999999'))
      ).to.be.revertedWith('Orbs: max supply exceeded');
    });
  });

  describe('Minter Management', function () {
    it('should add and remove minters', async function () {
      await orbitToken.addMinter(minter.address);
      expect(await orbitToken.minters(minter.address)).to.be.true;

      await orbitToken.removeMinter(minter.address);
      expect(await orbitToken.minters(minter.address)).to.be.false;
    });

    it('should emit events for minter changes', async function () {
      await expect(orbitToken.addMinter(minter.address))
        .to.emit(orbitToken, 'MinterAdded')
        .withArgs(minter.address);

      await expect(orbitToken.removeMinter(minter.address))
        .to.emit(orbitToken, 'MinterRemoved')
        .withArgs(minter.address);
    });

    it('should only allow owner to manage minters', async function () {
      await expect(
        orbitToken.connect(user1).addMinter(minter.address)
      ).to.be.reverted;
    });
  });

  describe('Burning', function () {
    it('should allow token holders to burn', async function () {
      await orbitToken.mint(user1.address, ethers.parseEther('1000'));
      await orbitToken.connect(user1).burn(ethers.parseEther('500'));
      expect(await orbitToken.balanceOf(user1.address)).to.equal(ethers.parseEther('500'));
    });
  });
});

describe('RewardDistributor', function () {
  let orbitToken, distributor;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const OrbitToken = await ethers.getContractFactory('OrbitToken');
    orbitToken = await OrbitToken.deploy();
    await orbitToken.waitForDeployment();

    const RewardDistributor = await ethers.getContractFactory('RewardDistributor');
    distributor = await RewardDistributor.deploy(await orbitToken.getAddress());
    await distributor.waitForDeployment();

    // Grant minter role
    await orbitToken.addMinter(await distributor.getAddress());
  });

  describe('Batch Distribution', function () {
    it('should distribute rewards to multiple users', async function () {
      const recipients = [user1.address, user2.address, user3.address];
      const amounts = [
        ethers.parseEther('100'),
        ethers.parseEther('200'),
        ethers.parseEther('300'),
      ];

      await distributor.batchDistribute('epoch-1', recipients, amounts);

      expect(await orbitToken.balanceOf(user1.address)).to.equal(ethers.parseEther('100'));
      expect(await orbitToken.balanceOf(user2.address)).to.equal(ethers.parseEther('200'));
      expect(await orbitToken.balanceOf(user3.address)).to.equal(ethers.parseEther('300'));
    });

    it('should track epoch distributions', async function () {
      await distributor.batchDistribute(
        'epoch-1',
        [user1.address],
        [ethers.parseEther('100')]
      );
      expect(await distributor.epochDistributed('epoch-1')).to.equal(ethers.parseEther('100'));
    });

    it('should prevent double claims', async function () {
      await distributor.batchDistribute('epoch-1', [user1.address], [ethers.parseEther('100')]);
      await expect(
        distributor.batchDistribute('epoch-1', [user1.address], [ethers.parseEther('100')])
      ).to.be.revertedWith('Already claimed');
    });

    it('should reject mismatched arrays', async function () {
      await expect(
        distributor.batchDistribute('epoch-1', [user1.address, user2.address], [ethers.parseEther('100')])
      ).to.be.revertedWith('Length mismatch');
    });

    it('should emit events', async function () {
      await expect(distributor.batchDistribute('epoch-1', [user1.address], [ethers.parseEther('100')]))
        .to.emit(distributor, 'RewardDistributed')
        .withArgs('epoch-1', user1.address, ethers.parseEther('100'));
    });
  });

  describe('Point Redemption', function () {
    it('should redeem points for tokens at correct rate', async function () {
      // Default rate: 1000 points = 1 ORBS token
      await distributor.redeemPoints(user1.address, 5000);
      expect(await orbitToken.balanceOf(user1.address)).to.equal(ethers.parseEther('5'));
    });

    it('should reject insufficient points', async function () {
      await expect(
        distributor.redeemPoints(user1.address, 500)
      ).to.be.revertedWith('Insufficient points');
    });

    it('should allow updating conversion rate', async function () {
      await distributor.setConversionRate(500);
      expect(await distributor.conversionRate()).to.equal(500);

      // Now 500 points = 1 ORBS
      await distributor.redeemPoints(user1.address, 1000);
      expect(await orbitToken.balanceOf(user1.address)).to.equal(ethers.parseEther('2'));
    });
  });

  describe('Access Control', function () {
    it('should only allow owner to distribute', async function () {
      await expect(
        distributor.connect(user1).batchDistribute('epoch-1', [user2.address], [ethers.parseEther('100')])
      ).to.be.reverted;
    });

    it('should only allow owner to redeem points', async function () {
      await expect(
        distributor.connect(user1).redeemPoints(user2.address, 5000)
      ).to.be.reverted;
    });
  });
});
