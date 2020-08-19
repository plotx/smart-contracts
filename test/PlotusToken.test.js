const Master = artifacts.require("Master");
const TokenController = artifacts.require("TokenController");
const PlotusToken = artifacts.require("PlotusToken.sol");
const Web3 = require("web3");
const { assertRevert } = require("./utils/assertRevert.js");
const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

contract("PlotusToken", ([owner, account2, account3]) => {
	let plotusToken, tokenControllerInstance;

	const name = "PLOT";
	const symbol = "PLOT";
	const decimals = 18;
	const nullAddress = "0x0000000000000000000000000000000000000000";

	before(async () => {
		const masterInstance = await Master.deployed();
		const tc = await masterInstance.getLatestAddress("0x5443");
		tokenControllerInstance = await TokenController.at(tc);
		plotusToken = await tokenControllerInstance.token();
		plotusToken = await PlotusToken.at(plotusToken);
		await plotusToken.changeOperator(owner);
		assert.equal(await plotusToken.operator(), owner);
	});

	describe("Check Initialization Data", () => {
		it("Check for token creation", () => {
			assert.ok(plotusToken);
		});

		it("Should have correct initialization data", async () => {
			const tokenName = await plotusToken.name();
			const tokenSymbol = await plotusToken.symbol();
			const tokenDecimals = await plotusToken.decimals();
			const totalSupply = await plotusToken.totalSupply();
			const ownerBalance = await plotusToken.balanceOf(owner);
			const operator = await plotusToken.operator();

			assert.equal(tokenName, name);
			assert.equal(tokenSymbol, symbol);
			assert.equal(tokenDecimals.toNumber(), decimals);
			assert.equal(totalSupply.toNumber(), 0);
			assert.equal(ownerBalance.toNumber(), 0);
			assert.equal(operator, nullAddress);
		});
	});

	describe("Change operator functionality", () => {
		it("Should be able to change operator to owner", async () => {
			const oldOperator = await plotusToken.operator();
			await plotusToken.changeOperator(owner);
			const newOperator = await plotusToken.operator();

			assert.equal(oldOperator, nullAddress);
			assert.equal(newOperator, owner);
		});
	});

	describe("Mint functionality", () => {
		it("Should be able to mint tokens", async () => {
			let receipt = await plotusToken.mint.call(owner, 2000, { from: owner });
			assert.equal(receipt, true);

			receipt = await plotusToken.mint(owner, 2000, { from: owner });
			const ownerBalance = await plotusToken.balanceOf(owner);
			const totalSupply = await plotusToken.totalSupply();

			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Transfer");
			assert.equal(receipt.logs[0].args.from, nullAddress);
			assert.equal(receipt.logs[0].args.to, owner);
			assert.equal(receipt.logs[0].args.value.toNumber(), 2000);

			assert.equal(ownerBalance.toNumber(), 2000);
			assert.equal(totalSupply.toNumber(), 2000);
		});

		it("Should NOT mint if caller is not operator", async () => {
			const oldAccount2Balance = await plotusToken.balanceOf(account2);
			await assertRevert(plotusToken.mint(account2, 1000, { from: account2 }));
			const newAccount2Balance = await plotusToken.balanceOf(account2);

			assert.equal(oldAccount2Balance.toNumber(), newAccount2Balance.toNumber());
		});
	});

	describe("Modifier reverts", () => {
		it("Should revert if not operator", async () => {
			await assertRevert(plotusToken.changeOperator(account3, { from: account2 }));
			await assertRevert(plotusToken.mint(account2, 1000, { from: account2 }));
			await plotusToken.transfer(account2, 500, { from: owner });
			await assertRevert(plotusToken.operatorTransfer(account2, 500, { from: account3 }));
			await assertRevert(plotusToken.lockForGovernanceVote(account2, 10, { from: account2 }));
		});
	});

	describe("Burn functionality (Burn and burnFrom)", () => {
		it("Should be able to burn tokens", async () => {
			let receipt = await plotusToken.burn.call(500, { from: account2 });
			assert.equal(receipt, true);
			receipt = await plotusToken.burn(500, { from: account2 });
			const newOwnerBalance = await plotusToken.balanceOf(account2);

			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Transfer");
			assert.equal(receipt.logs[0].args.from, account2);
			assert.equal(receipt.logs[0].args.to, nullAddress);
			assert.equal(receipt.logs[0].args.value.toNumber(), 500);
			assert.equal(newOwnerBalance.toNumber(), 0);
		});

		it("Should burn from another account if allowance is enough", async () => {
			await plotusToken.transfer(account2, 500, { from: owner });
			await plotusToken.approve(owner, 500, { from: account2 });
			assert.equal((await plotusToken.allowance(account2, owner)).toNumber(), 500);
			const receipt = await plotusToken.burnFrom.call(account2, 500, { from: owner });
			await plotusToken.burnFrom(account2, 500, { from: owner });

			const account2Balance = await plotusToken.balanceOf(account2);
			assert.equal(receipt, true);
			assert.equal(account2Balance.toNumber(), 0);
			assert.equal((await plotusToken.totalSupply()).toNumber(), 1000);
			assert.equal((await plotusToken.allowance(account2, owner)).toNumber(), 0);
		});

		it("Should revert burnFrom if allowance is not enough", async () => {
			await plotusToken.transfer(account2, 500, { from: owner });
			await expectRevert(plotusToken.burnFrom(account2, 1000, { from: owner }), "SafeMath: subtraction overflow");
			assert.equal((await plotusToken.balanceOf(account2)).toNumber(), 500);
		});
	});

	describe("Transfer function", () => {
		it("Should be able to transfer tokens", async () => {
			const transferCall = await plotusToken.transfer.call(account2, 500, { from: owner });
			const receipt = await plotusToken.transfer(account2, 500, { from: owner });
			const newOwnerBalance = await plotusToken.balanceOf(owner);
			const account2Balance = await plotusToken.balanceOf(account2);

			assert.equal(transferCall, true);
			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Transfer");
			assert.equal(receipt.logs[0].args.from, owner);
			assert.equal(receipt.logs[0].args.to, account2);
			assert.equal(receipt.logs[0].args.value.toNumber(), 500);
			assert.equal(newOwnerBalance.toNumber(), 0);
			assert.equal(account2Balance.toNumber(), 1000);

			await plotusToken.mint(owner, 1000, { from: owner });
		});

		it("Should NOT transfer tokens if recipient is null address", async () => {
			const ownerBalance = await plotusToken.balanceOf(owner);
			await expectRevert(
				plotusToken.transfer(nullAddress, 100, { from: owner }),
				"ERC20: transfer to the zero address"
			);
			const newOwnerBalance = await plotusToken.balanceOf(owner);
			assert.equal(newOwnerBalance.toNumber(), ownerBalance.toNumber());
		});

		it("Should NOT transfer tokens greater than transferable balance", async () => {
			const balance = await plotusToken.balanceOf(owner);
			await assertRevert(plotusToken.transfer(account2, balance + 1, { from: owner }));
		});

		it("Should revert transfer between governance lock", async () => {
			await plotusToken.transfer(account3, 1000, { from: owner });
			const lockDays = 30;
			await plotusToken.lockForGovernanceVote(account3, lockDays);
			await assertRevert(plotusToken.transfer(owner, 1000, { from: account3 }));
		});

		it("Should transfer after governance lock", async () => {
			const lockValidity = await plotusToken.lockedForGV(account3);
			await time.increaseTo(lockValidity.toNumber() + 1);
			await plotusToken.transfer(owner, 1000, { from: account3 });

			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), 1000);
			assert.equal((await plotusToken.balanceOf(account3)).toNumber(), 0);
		});
	});

	describe("Approve function", () => {
		it("Should approve tokens for delegated transfer", async () => {
			let receipt = await plotusToken.approve.call(account2, 1000, { from: owner });
			let allowanceAmount = await plotusToken.allowance(owner, account2);
			assert.equal(receipt, true);
			assert.equal(allowanceAmount.toNumber(), 0);

			receipt = await plotusToken.approve(account2, 500, { from: owner });
			allowanceAmount = await plotusToken.allowance(owner, account2);
			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Approval");
			assert.equal(receipt.logs[0].args.owner, owner);
			assert.equal(receipt.logs[0].args.spender, account2);
			assert.equal(receipt.logs[0].args.value.toNumber(), 500);
			assert.equal(allowanceAmount.toNumber(), 500);
		});
		it("Should increase allowance", async () => {
			const receipt = await plotusToken.increaseAllowance.call(account2, 500, { from: owner });
			await plotusToken.increaseAllowance(account2, 500, { from: owner });
			allowanceAmount = await plotusToken.allowance(owner, account2);

			assert.equal(receipt, true);
			assert.equal(allowanceAmount.toNumber(), 1000);
		});
		it("Should decrease allowance", async () => {
			const receipt = await plotusToken.decreaseAllowance.call(account2, 1000, { from: owner });
			await plotusToken.decreaseAllowance(account2, 1000, { from: owner });
			allowanceAmount = await plotusToken.allowance(owner, account2);

			assert.equal(receipt, true);
			assert.equal(allowanceAmount.toNumber(), 0);
		});
	});

	describe("Operator transfer", () => {
		it("Should be able to transfer tokens to the operator from the specified address", async () => {
			const oldOwnerBalance = await plotusToken.balanceOf(owner);
			const oldAccount2Balance = await plotusToken.balanceOf(account2);
			await plotusToken.operatorTransfer(account2, 1000);

			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), oldOwnerBalance.toNumber() + 1000);
			assert.equal((await plotusToken.balanceOf(account2)).toNumber(), oldAccount2Balance.toNumber() - 1000);
		});

		it("Should revert operator transfer if value > balance of From account", async () => {
			await assertRevert(plotusToken.operatorTransfer(account2, 2000));
		});
	});

	describe("TransferFrom function", () => {
		it("Handle delegate token transfer", async () => {
			await plotusToken.approve(account2, 1000, { from: owner });
			await expectRevert(
				plotusToken.transferFrom(owner, account3, 10000, { from: account2 }),
				"SafeMath: subtraction overflow"
			);
			const transferFromCall = await plotusToken.transferFrom.call(owner, account3, 500, { from: account2 });
			const receipt = await plotusToken.transferFrom(owner, account3, 500, { from: account2 });
			const fromAccountBalance = await plotusToken.balanceOf(owner);
			const toAccountBalance = await plotusToken.balanceOf(account3);
			const allowanceAmount = await plotusToken.allowance(owner, account2);

			assert.equal(transferFromCall, true);
			assert.equal(fromAccountBalance.toNumber(), 1500);
			assert.equal(toAccountBalance.toNumber(), 500);
			assert.equal(receipt.logs.length, 2);
			assert.equal(receipt.logs[0].event, "Transfer");
			assert.equal(receipt.logs[0].args.from, owner);
			assert.equal(receipt.logs[0].args.to, account3);
			assert.equal(receipt.logs[0].args.value.toNumber(), 500);
			assert.equal(receipt.logs[1].event, "Approval");
			assert.equal(receipt.logs[1].args.owner, owner);
			assert.equal(receipt.logs[1].args.spender, account2);
			assert.equal(receipt.logs[1].args.value.toNumber(), 500);
			assert.equal(allowanceAmount.toNumber(), 500);
		});

		it("Should NOT transferFrom tokens if recipient is null address", async () => {
			const ownerBalance = await plotusToken.balanceOf(owner);
			await expectRevert(
				plotusToken.transferFrom(owner, nullAddress, 5, { from: account2 }),
				"ERC20: transfer to the zero address"
			);
			const newOwnerBalance = await plotusToken.balanceOf(owner);
			assert.equal(newOwnerBalance.toNumber(), ownerBalance.toNumber());
		});

		it("Should NOT transferFrom tokens greater than transferable balance", async () => {
			const balance = await plotusToken.balanceOf(owner);
			await plotusToken.approve(account2, balance, { from: owner });
			await expectRevert(
				plotusToken.transferFrom(owner, account3, balance + 1, { from: account2 }),
				"SafeMath: subtraction overflow"
			);
		});

		it("Should revert transferFrom between governance lock", async () => {
			const lockDays = 1;
			await plotusToken.lockForGovernanceVote(owner, lockDays);
			await assertRevert(plotusToken.transferFrom(owner, account3, 5, { from: account2 }));
		});

		it("Should be able to transferFrom after governance lock", async () => {
			const oldOwnerBalance = await plotusToken.balanceOf(owner);
			const oldAccount3Balance = await plotusToken.balanceOf(account3);
			const lockValidity = await plotusToken.lockedForGV(owner);
			await time.increaseTo(lockValidity.toNumber() + 1);
			await plotusToken.transferFrom(owner, account3, 500, { from: account2 });
			assert.equal((await plotusToken.balanceOf(account3)).toNumber(), oldAccount3Balance.toNumber() + 500);
			assert.equal((await plotusToken.balanceOf(owner)).toNumber(), oldOwnerBalance.toNumber() - 500);
		});
	});

	describe("Governance Lock", () => {
		it("Should be able to lock for Governance Vote", async () => {
			let lockedForGV = await plotusToken.lockedForGV(account2);
			let isLocked = await plotusToken.isLockedForGV(account2);
			assert.equal(lockedForGV.toNumber(), 0);
			assert.equal(isLocked, false);
			const lockDays = 5;
			let latestTime = await time.latest();
			await plotusToken.lockForGovernanceVote(account2, lockDays);
			isLocked = await plotusToken.isLockedForGV(account2);
			lockedForGV = await plotusToken.lockedForGV(account2);
			assert.equal(isLocked, true);
		});
		it("Should not increase lock for governance if lock time is less than existing lock time", async () => {
			const oldLockedForGV = await plotusToken.lockedForGV(account2);
			const lockDays = 5;
			await plotusToken.lockForGovernanceVote(account2, lockDays);
			const newLockedForGV = await plotusToken.lockedForGV(account2);
			assert(oldLockedForGV.toNumber(), newLockedForGV.toNumber());
		});
	});
});
