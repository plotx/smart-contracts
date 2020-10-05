const Master = artifacts.require("Master");
const TokenController = artifacts.require("MockTokenController");
const PlotusToken = artifacts.require("MockPLOT.sol");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const MockUniswapRouter = artifacts.require('MockUniswapRouter');
// const BLOT = artifacts.require("bLOTToken");

const Web3 = require("web3");
const { assertRevert } = require("./utils/assertRevert.js");
const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

contract("TokenController", ([owner, account2, account3]) => {
	let plotusToken, tokenController, uniswapRouter;

	const lockReason1 = web3.utils.fromAscii("DR");
	const lockReason2 = web3.utils.fromAscii("SM");
	const lockedAmount = 200;
	const lockPeriod = 1000;
	const thirtyDayPeriod = 30 * 24 * 60 * 60;
	const ALREADY_LOCKED = "Tokens already locked";
	const NOT_LOCKED = "No tokens locked";
	const AMOUNT_ZERO = "Amount can not be 0";
	const nullAddress = "0x0000000000000000000000000000000000000000";

	before(async () => {
		// masterInstance = await Master.deployed();
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		const tc = await masterInstance.getLatestAddress("0x5443");
		tokenController = await TokenController.at(tc);
		plotusToken = await tokenController.token();
		plotusToken = await PlotusToken.at(plotusToken);
		await tokenController.changeOperator(owner);
		assert.equal(await plotusToken.operator(), owner);
		await plotusToken.approve(tokenController.address, "1000000000000000000000000");
	});

	describe("1. Check Initialization Data", () => {
		it("1.1 Check for token creation", () => {
			assert.ok(tokenController);
		});

		it("1.2 Should have correct initialization data", async () => {
			const tokenInstance = await tokenController.token();

			assert.equal(tokenInstance, plotusToken.address);
		});

		it("1.3 Should not allow to call unauthorized functions", async() => {
			await assertRevert(tokenController.swapBLOT(owner, owner, 100));
			await assertRevert(tokenController.initiateVesting(owner));
			await assertRevert(tokenController.setMasterAddress());
		})
	});

	// describe("Swap BLOT functionality", () => {
	// 	it("Should be able to swap BLOT");
	// });

	// describe("Uint Parameter functionality", () => {
	// 	// let uintParameters = await tokenController.getUintParameters(web3.utils.fromAscii("SMLP"));
	// 	// 	assert.equal(web3.utils.toAscii(uintParameters.codeVal).replace(/\0/g, ""), "SMLP");
	// 	// 	assert.equal(uintParameters.val.toNumber(), 30);
	// 	it("Should be able to get unit parameters", async () => {
	// 		const undefinedCode1 = web3.utils.toHex("TRY");
	// 		const codeSMPL = web3.utils.toHex("SMPL");
	// 		const codeBRLIM = web3.utils.toHex("BRLIM");
	// 		const uintParameters1 = await tokenController.getUintParameters(undefinedCode1);
	// 		const uintParameters2 = await tokenController.getUintParameters(codeSMPL);
	// 		const uintParameters3 = await tokenController.getUintParameters(codeBRLIM);

	// 		// assert.equal(web3.utils.toAscii(uintParameters1.codeVal).replace(/\0/g, ""), "TRY");
	// 		assert.equal(uintParameters1.val.toNumber(), 0);
	// 		// assert.equal(web3.utils.toAscii(uintParameters2.codeVal).replace(/\0/g, ""), "SMPL");
	// 		assert.equal(uintParameters2.val.toNumber(), 30);
	// 		// assert.equal(web3.utils.toAscii(uintParameters3.codeVal).replace(/\0/g, ""), "BRLIM");
	// 		assert.equal(uintParameters3.val.toNumber(), 20000000);
	// 	});
	// 	it("Should be able to update unit parameters");
	// });

	describe("Lock Functionality", () => {
		before(async () => {
			await plotusToken.burn( await plotusToken.balanceOf(owner), { from: owner });
			uniswapRouter = await MockUniswapRouter.deployed();
			await plotusToken.burnTokens(uniswapRouter.address, await plotusToken.balanceOf(uniswapRouter.address), { from: owner });
			await plotusToken.mint(owner, 2000, { from: owner });
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), 2000);
			assert.equal(parseInt(web3.utils.fromWei(await tokenController.totalSupply())), 1e4);
			await assertRevert(plotusToken.changeOperator(nullAddress));
			await plotusToken.changeOperator(tokenController.address);
			assert.equal(await plotusToken.operator(), tokenController.address);
		});

		it("Should revert lock token with amount zero", async () => {
			await assertRevert(tokenController.lock(lockReason1, 0, lockPeriod));
		});

		it("Should revert locking tokens with unspecified reason or time", async () => {
			await assertRevert(tokenController.lock(lockReason2, lockedAmount, lockPeriod));
			const unspecifiedReason = web3.utils.fromAscii("TRY");
			await assertRevert(tokenController.lock(unspecifiedReason, lockedAmount, lockPeriod));
		});

		it("Should revert if try to lock amount > than balance", async () => {
			await assertRevert(
				tokenController.lock(lockReason1, (await plotusToken.balanceOf(owner)).toNumber() + 1, lockPeriod)
			);
		});

		it("Should be able to lock", async () => {
			const origBalance = await plotusToken.balanceOf(owner);
			// await plotusToken.transfer(account2, value);
			// await plotusToken.operatorTransfer(account2,)
			let receipt = await tokenController.lock.call(lockReason1, lockedAmount, lockPeriod, { from: owner });
			assert.equal(receipt, true);

			let newLockTimestamp = await time.latest();
			receipt = await tokenController.lock(lockReason1, lockedAmount, lockPeriod);

			const lockReason = await tokenController.lockReason(owner, 0);
			const tokensUnlockable = await tokenController.tokensUnlockable(owner, lockReason1);
			const getUnlockableTokens = await tokenController.getUnlockableTokens(owner);
			const tokensLocked = await tokenController.tokensLocked(owner, lockReason1);
			const tokensLockedStruct = await tokenController.locked(owner, lockReason1);

			assert.equal(web3.utils.toAscii(lockReason).replace(/\0/g, ""), web3.utils.toAscii(lockReason1));
			assert.equal(tokensUnlockable.toNumber(), 0);
			assert.equal(getUnlockableTokens.toNumber(), 0);
			assert.equal(tokensLocked.toNumber(), lockedAmount);
			assert.equal(tokensLockedStruct.amount.toNumber(), lockedAmount);
			assert(tokensLockedStruct.validity.toNumber() >= lockPeriod + newLockTimestamp.toNumber());
			assert.equal(tokensLockedStruct.claimed, false);

			let tokenLockedAtTime = await tokenController.tokensLockedAtTime(owner, lockReason1, newLockTimestamp);
			assert.equal(tokenLockedAtTime.toNumber(), lockedAmount);
			tokenLockedAtTime = await tokenController.tokensLockedAtTime(
				owner,
				lockReason1,
				newLockTimestamp + lockPeriod + 1
			);
			assert.equal(tokenLockedAtTime.toNumber(), 0);

			const balance = await plotusToken.balanceOf(owner);
			const totalBalance = await tokenController.totalBalanceOf(owner);
			assert.equal(balance.toNumber(), origBalance.toNumber() - lockedAmount);
			assert.equal(totalBalance.toNumber(), origBalance.toNumber());
			// assert.equal(receipt.logs.length, 2);
			// assert.equal(receipt.logs[0].event, "Transfer");
			// assert.equal(receipt.logs[0].args.from, owner);
			// assert.equal(receipt.logs[0].args.to, tokenController.address);
			// assert.equal(receipt.logs[0].args.value.toNumber(), lockedAmount);
			assert.equal(receipt.logs[0].event, "Locked");
			assert.equal(receipt.logs[0].args._of, owner);
			assert.equal(
				web3.utils.toAscii(receipt.logs[0].args._reason).replace(/\0/g, ""),
				web3.utils.toAscii(lockReason1)
			);
			assert.equal(receipt.logs[0].args._amount.toNumber(), lockedAmount);
			assert(receipt.logs[0].args._validity.toNumber() >= lockPeriod + newLockTimestamp.toNumber());
		});

		it("Should be able to transfer the remaining tokens after lock", async () => {
			await plotusToken.transfer(account2, 300, { from: owner });
			const newSenderBalance = await plotusToken.balanceOf(owner);
			const newReceiverBalance = await plotusToken.balanceOf(account2);
			assert.equal(newSenderBalance.toNumber(), 1500);
			assert.equal(newReceiverBalance.toNumber(), 300);
		});

		it("Should NOT be able to transfer more than the remaining tokens after lock", async () => {
			const transferAmount = await tokenController.totalBalanceOf(owner);
			const oldReceiverBalance = await plotusToken.balanceOf(account2);
			await assertRevert(plotusToken.transfer(account2, transferAmount, { from: owner }));
			const newSenderBalance = await plotusToken.balanceOf(owner);
			const newReceiverBalance = await plotusToken.balanceOf(account2);
			assert.equal(newSenderBalance.toNumber(), 1500);
			assert.equal(newReceiverBalance.toNumber(), oldReceiverBalance.toNumber());
		});

		it("Should revert lock for if already locked for same account and reason", async () => {
			const balance = await plotusToken.balanceOf(owner);
			await assertRevert(tokenController.lock(lockReason1, balance, lockPeriod));
		});

		it("Should allow to lock token again", async () => {
			const lockStruct = await tokenController.locked(owner, lockReason1);
			await time.increaseTo(lockStruct.validity.toNumber() + 1);
			await tokenController.unlock(owner);
			await tokenController.lock(lockReason1, 1, 0);
			await tokenController.unlock(owner);
			await tokenController.lock(lockReason1, lockedAmount, lockPeriod);
		});
	});

	describe("Unlock Functionality", () => {
		it("Should not unlock before lock time has completed", async () => {
			const balance = await plotusToken.balanceOf(owner);
			const tokensLocked = await tokenController.tokensLocked(owner, lockReason1);
			const receipt = await tokenController.unlock.call(owner);
			assert.equal(receipt.toNumber(), 0);
			await tokenController.unlock(owner);
			const newBalance = await plotusToken.balanceOf(owner);
			const newTokensLocked = await tokenController.tokensLocked(owner, lockReason1);
			assert.equal(balance.toNumber(), newBalance.toNumber());
			assert.equal(tokensLocked.toNumber(), newTokensLocked.toNumber());
		});

		it("Should be able to unlock after lock time has passed", async () => {
			const lockStruct = await tokenController.locked(owner, lockReason1);
			const totalBalance = await tokenController.totalBalanceOf(owner);
			let tokensLocked = await tokenController.tokensLocked(owner, lockReason1);
			await time.increaseTo(lockStruct.validity.toNumber() + 1);
			let unlockableToken = await tokenController.getUnlockableTokens(owner);
			assert.equal(tokensLocked.toNumber(), unlockableToken.toNumber());
			let receipt = await tokenController.unlock.call(owner);
			assert.equal(receipt.toNumber(), lockedAmount);
			receipt = await tokenController.unlock(owner);
			tokensLocked = await tokenController.tokensLocked(owner, lockReason1);
			unlockableToken = await tokenController.getUnlockableTokens(owner);
			const newBalance = await plotusToken.balanceOf(owner);
			assert.equal(tokensLocked.toNumber(), 0);
			assert.equal(unlockableToken.toNumber(), 0);
			assert.equal(newBalance.toNumber(), totalBalance.toNumber());

			// assert.equal(receipt.logs.length, 2);
			assert.equal(receipt.logs[0].event, "Unlocked");
			assert.equal(receipt.logs[0].args._of, owner);
			assert.equal(
				web3.utils.toAscii(receipt.logs[0].args._reason).replace(/\0/g, ""),
				web3.utils.toAscii(lockReason1)
			);
			assert.equal(receipt.logs[0].args._amount.toNumber(), lockedAmount);
			// assert.equal(receipt.logs[1].event, "Transfer");
			// assert.equal(receipt.logs[1].args.from, tokenController.address);
			// assert.equal(receipt.logs[1].args.to, owner);
			// assert.equal(receipt.logs[1].args.value.toNumber(), lockedAmount);

			await tokenController.unlock(owner);
			const newNewBalance = await plotusToken.balanceOf(owner);
			assert.equal(newBalance.toNumber(), newNewBalance.toNumber());
		});

		// it("Should revert unlock if governance participation is there", async () => {
		// 	await tokenController.lock(lockReason3, 1, 0);
		// 	await tokenController.lockForGovernanceVote(owner, 5);
		// 	await assertRevert(tokenController.unlock(owner));
		// });
	});

	describe("Try lock/unlock for all three reasons", () => {
		let totalBalance;
		before(async () => {
			totalBalance = (await plotusToken.balanceOf(owner)).toNumber();
			assert.equal(totalBalance, (await tokenController.totalBalanceOf(owner)).toNumber());
		});

		// it("Should be able to lock for reason 1", async () => {
		// 	await tokenController.lock(lockReason2, lockedAmount, lockPeriod);
		// 	assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount);
		// 	assert.equal((await tokenController.tokensLocked(owner, lockReason2)).toNumber(), lockedAmount);
		// });
		it("Should be able to lock for reason 2", async () => {
			await tokenController.lock(lockReason1, lockedAmount, lockPeriod);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount);
			assert.equal((await tokenController.tokensLocked(owner, lockReason1)).toNumber(), lockedAmount);
		});
		it("Should be able to lock for reason 3", async () => {
			await assertRevert(tokenController.lock(lockReason2, lockedAmount, lockPeriod));
			await tokenController.lock(lockReason2, lockedAmount, thirtyDayPeriod);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount * 2);
			assert.equal((await tokenController.tokensLocked(owner, lockReason2)).toNumber(), lockedAmount);
		});
		it("Should show correct result for all lock related functions", async () => {
			assert.equal((await tokenController.getUnlockableTokens(owner)).toNumber(), 0);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason1)).toNumber(), 0);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason1)).toNumber(), 0);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason2)).toNumber(), 0);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount * 2);
			assert.equal((await tokenController.totalBalanceOf(owner)).toNumber(), totalBalance);
			await tokenController.unlock(owner);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount * 2);
		});

		it("Increasing time by loadPeriod should unlock Unlockable tokens", async () => {
			await time.increase(lockPeriod);
			assert.equal((await tokenController.getUnlockableTokens(owner)).toNumber(), lockedAmount * 1);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason1)).toNumber(), lockedAmount);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason1)).toNumber(), lockedAmount);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount * 2);
			await tokenController.unlock(owner);
			assert.equal((await tokenController.getUnlockableTokens(owner)).toNumber(), 0);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason1)).toNumber(), 0);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason1)).toNumber(), 0);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount);
		});

		it("Increasing time by 30 days should unlock the lock with reason 3", async () => {
			await time.increase(thirtyDayPeriod);
			assert.equal((await tokenController.getUnlockableTokens(owner)).toNumber(), lockedAmount);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason2)).toNumber(), lockedAmount);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance - lockedAmount);
			await tokenController.unlock(owner);
			assert.equal((await tokenController.getUnlockableTokens(owner)).toNumber(), 0);
			assert.equal((await tokenController.tokensUnlockable(owner, lockReason2)).toNumber(), 0);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), totalBalance);
		});
	});

	describe("Extend Lock functionality", () => {
		before(async () => {
			await tokenController.lock(lockReason1, lockedAmount, lockPeriod);
		});

		it("Should be able to extend lock period for an existing lock", async () => {
			const lockValidityOrig = await tokenController.locked(owner, lockReason1);
			let receipt = await tokenController.extendLock.call(lockReason1, lockPeriod);
			assert.equal(receipt, true);
			receipt = await tokenController.extendLock(lockReason1, lockPeriod);
			const lockValidityExtended = await tokenController.locked(owner, lockReason1);
			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Locked");
			assert.equal(receipt.logs[0].args._of, owner);
			assert.equal(
				web3.utils.toAscii(receipt.logs[0].args._reason).replace(/\0/g, ""),
				web3.utils.toAscii(lockReason1)
			);
			assert.equal(receipt.logs[0].args._amount.toNumber(), lockedAmount);
			assert(receipt.logs[0].args._validity.toNumber() >= lockValidityOrig[1].toNumber() + lockPeriod);
			assert.equal(lockValidityExtended[1].toNumber(), lockValidityOrig[1].toNumber() + lockPeriod);
		});

		it("Should NOT be able to extend lock for lockReason3 by any period other than 30 days", async () => {
			await tokenController.lock(lockReason2, lockedAmount, thirtyDayPeriod);
			await assertRevert(tokenController.extendLock(lockReason2, lockPeriod));
			await tokenController.extendLock(lockReason2, thirtyDayPeriod);
			await time.increase(thirtyDayPeriod * 2 + 1);
			await tokenController.unlock(owner)
		});

		it("Should NOT be able to extend lock if NOT locked for the reason", async () => {
			await expectRevert(tokenController.extendLock(lockReason1, lockPeriod), NOT_LOCKED);
		});

		it("Should revert when try to extend lock with unspecified reason", async () => {
			const unspecifiedReason = web3.utils.fromAscii("TRY");
			await assertRevert(tokenController.extendLock(unspecifiedReason, 1000));
		});

		it("Should revert when try to extend lock by 0 time", async () => {
			await assertRevert(tokenController.extendLock(lockReason1, 0));
		});
	});

	describe("Increase locked amount functionality", () => {
		before(async () => {
			await tokenController.lock(lockReason1, lockedAmount, lockPeriod);
		});
		it("Should be able to increase the number of tokens locked", async () => {
			const lockValidityOrig = await tokenController.locked(owner, lockReason1);
			const actualLockedAmount = await tokenController.tokensLocked(owner, lockReason1);
			let receipt = await tokenController.increaseLockAmount.call(lockReason1, lockedAmount);
			assert.equal(receipt, true);
			receipt = await tokenController.increaseLockAmount(lockReason1, lockedAmount);
			const increasedLockAmount = await tokenController.tokensLocked(owner, lockReason1);
			assert.equal(increasedLockAmount.toNumber(), actualLockedAmount.toNumber() + lockedAmount);
			assert.equal(receipt.logs.length, 1);
			// assert.equal(receipt.logs[0].event, "Transfer");
			// assert.equal(receipt.logs[0].args.from, owner);
			// assert.equal(receipt.logs[0].args.to, tokenController.address);
			// assert.equal(receipt.logs[0].args.value.toNumber(), lockedAmount);
			assert.equal(receipt.logs[0].event, "Locked");
			assert.equal(receipt.logs[0].args._of, owner);
			assert.equal(web3.utils.toAscii(receipt.logs[0].args._reason).replace(/\0/g, ""), web3.utils.toAscii(lockReason1));
			assert.equal(receipt.logs[0].args._amount.toNumber(), 2 * lockedAmount);
			assert(receipt.logs[0].args._validity.toNumber() === lockValidityOrig.validity.toNumber());
		});

		it("Should revert if NO tokens locked for the reason", async () => {
			await expectRevert(tokenController.increaseLockAmount(lockReason2, thirtyDayPeriod), NOT_LOCKED);
		});

		it("Should revert when increasing lock time with unspecified reason", async () => {
			const unspecifiedReason = web3.utils.fromAscii("TRY");
			await assertRevert(tokenController.increaseLockAmount(unspecifiedReason, 1000));
		});

		it("Should not allow to increase lock amount by more than balance", async () => {
			await assertRevert(tokenController.increaseLockAmount(lockReason1, (await plotusToken.balanceOf(owner)).toNumber() + 1));
		});

		it("Should revert when increase lock amount by 0 amount", async () => {
			await assertRevert(tokenController.increaseLockAmount(lockReason1, 0));
		});
		it("Should increaseLockAmount and time for reason3", async () => {
			await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: account2 });
			await tokenController.lock(lockReason2, lockedAmount, thirtyDayPeriod, { from: account2 });
			let oldStatus = await tokenController.locked(account2, lockReason2);
			await tokenController.increaseLockAmount(lockReason2, 1, { from: account2 });
			let newStatus = await tokenController.locked(account2, lockReason2);
			assert.equal(parseFloat(newStatus.amount), lockedAmount + 1);
			assert.equal(parseFloat(newStatus.validity)-parseFloat(oldStatus.validity), thirtyDayPeriod);
			await time.increase(thirtyDayPeriod * 2 + 5);
			await tokenController.unlock(account2, { from: account2 });
		});
		it("Should increaseLockAmount and time for reason2", async () => {
			await tokenController.lock(lockReason1, lockedAmount, lockPeriod, { from: account2 });
			await tokenController.increaseLockAmount(lockReason1, 1, { from: account2 });
			let newStatus = await tokenController.locked(account2, lockReason1);
			assert.equal(parseFloat(newStatus.amount), lockedAmount + 1);
			await time.increase(lockPeriod + 5);
			await tokenController.unlock(account2, { from: account2 });
		});
	});

	describe("Transfer with lock functionality", () => {
		before(async () => {
			assert(
				(await plotusToken.balanceOf(owner)).toNumber() !== (await tokenController.totalBalanceOf(owner)).toNumber()
			);
			await time.increase(lockPeriod * 2 + 1);
			await tokenController.unlock(owner);
			assert.equal(
				(await plotusToken.balanceOf(owner)).toNumber(),
				(await tokenController.totalBalanceOf(owner)).toNumber()
			);
			await plotusToken.transfer(owner, 300, { from: account2 });
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), 2000);
		});

		it("Should be able to lock", async () => {
			const ownerBalance = (await plotusToken.balanceOf(owner)).toNumber();
			const account2Balance = (await plotusToken.balanceOf(account2)).toNumber();
			await plotusToken.transfer(account2, lockedAmount);
			let receipt = await tokenController.lock.call(lockReason1, lockedAmount, lockPeriod, {
				from: account2,
			});
			assert.equal(receipt, true);
			const latestTime = await time.latest();
			receipt = await tokenController.lock(lockReason1, lockedAmount, lockPeriod, {
				from: account2,
			});
			await expectRevert(tokenController.lock(lockReason1, account2Balance, lockPeriod, { from: account2 }), ALREADY_LOCKED);
			const tokensLocked = await tokenController.tokensLocked(account2, lockReason1);
			assert.equal((await tokenController.totalBalanceOf(account2)).toNumber(), account2Balance + lockedAmount);
			// assert.equal((await tokenController.totalBalanceOf(owner)).toNumber(), ownerBalance - lockedAmount);
			assert.equal((await plotusToken.balanceOf(account2)).toNumber(), 0);
			assert.equal(tokensLocked.toNumber(), lockedAmount);
			assert.equal(receipt.logs.length, 1);
			// assert.equal(receipt.logs[0].event, "Transfer");
			// assert.equal(receipt.logs[0].args.from, owner);
			// assert.equal(receipt.logs[0].args.to, tokenController.address);
			// assert.equal(receipt.logs[0].args.value.toNumber(), lockedAmount);
			assert.equal(receipt.logs[0].event, "Locked");
			assert.equal(receipt.logs[0].args._of, account2);
			assert.equal(web3.utils.toAscii(receipt.logs[0].args._reason).replace(/\0/g, ""), web3.utils.toAscii(lockReason1));
			assert.equal(receipt.logs[0].args._amount.toNumber(), lockedAmount);
			assert(receipt.logs[0].args._validity.toNumber() >= latestTime.toNumber() + lockPeriod);
		});

		it("Should not unlock before lock time has completed", async () => {
			const balance = await plotusToken.balanceOf(account2);
			const tokensLocked = await tokenController.tokensLocked(account2, lockReason1);
			await tokenController.unlock(account2);
			const newBalance = await plotusToken.balanceOf(account2);
			const newTokensLocked = await tokenController.tokensLocked(account2, lockReason1);
			assert.equal(balance.toNumber(), newBalance.toNumber());
			assert.equal(tokensLocked.toNumber(), newTokensLocked.toNumber());
		});

		it("Should not be able to transfer tokens before unlocking", async () => {
			const totalBalance = await tokenController.totalBalanceOf(account2);
			await assertRevert(plotusToken.transfer(account3, totalBalance.toNumber(), { from: account2 }));
		});
		it("Should be able to transfer token after unlocking", async () => {
			const totalBalance = await tokenController.totalBalanceOf(account2);
			assert.equal((await tokenController.getUnlockableTokens(account2)).toNumber(), 0);
			await time.increase(lockPeriod);
			assert.equal((await tokenController.getUnlockableTokens(account2)).toNumber(), lockedAmount);
			await tokenController.unlock(account2);
			await plotusToken.transfer(account3, totalBalance.toNumber(), { from: account2 });
			assert.equal((await plotusToken.balanceOf(account2)).toNumber(), 0);
			assert.equal((await tokenController.totalBalanceOf(account2)).toNumber(), 0);
			assert.equal((await plotusToken.balanceOf(account3)).toNumber(), lockedAmount);
			assert.equal((await tokenController.totalBalanceOf(account3)).toNumber(), lockedAmount);
		});
	});
	// describe("Burn Commission tokens", () => {
	// 	it("Burn commission tokens", async () => {
	// 		const receipt = await tokenController.burnCommissionTokens.call(10);
	// 		assert.equal(receipt, false);
	// 	});
	// });
});