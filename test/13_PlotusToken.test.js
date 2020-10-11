const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Master = artifacts.require("Master");
const TokenController = artifacts.require("TokenController");
const PlotusToken = artifacts.require("MockPLOT.sol");
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
	const initialSupply = web3.utils.fromWei("30000000000000000000000000");
	let defaultOperator;

	before(async () => {
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
  		masterInstance = await Master.at(masterInstance.address);
		const tc = await masterInstance.getLatestAddress("0x5443");
		tokenControllerInstance = await TokenController.at(tc);
		plotusToken = await tokenControllerInstance.token();
		plotusToken = await PlotusToken.at(plotusToken);
		defaultOperator = await masterInstance.getLatestAddress("0x5443");
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
			assert.equal(web3.utils.fromWei(totalSupply), initialSupply);
			assert.equal(web3.utils.fromWei(ownerBalance), initialSupply - web3.utils.fromWei("10100000000000000000000"));
			assert.equal(operator, defaultOperator);
		});
	});

	describe("Mint functionality", () => {
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
			await plotusToken.transfer(account2, web3.utils.toWei("5"), { from: owner }); //ownerBalance - 5
			await assertRevert(plotusToken.lockForGovernanceVote(account2, 10, { from: account2 }));
		});
	});

	describe("Burn functionality (Burn and burnFrom)", () => {
		it("Should be able to burn tokens", async () => {
			let receipt = await plotusToken.burn.call(web3.utils.toWei("5"), { from: account2 });
			// assert.equal(receipt, true);
			receipt = await plotusToken.burn(web3.utils.toWei("5"), { from: account2 });
			const account2Balance = await plotusToken.balanceOf(account2);

			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Transfer");
			assert.equal(receipt.logs[0].args.from, account2);
			assert.equal(receipt.logs[0].args.to, nullAddress);
			assert.equal(web3.utils.fromWei(receipt.logs[0].args.value), 5);
			assert.equal(account2Balance.toNumber(), 0);
		});

		it("Should burn from another account if allowance is enough", async () => {
			await plotusToken.transfer(account2, web3.utils.toWei("5"), { from: owner }); //ownerBalance - 10
			await plotusToken.approve(owner, web3.utils.toWei("5"), { from: account2 });
			assert.equal(web3.utils.fromWei(await plotusToken.allowance(account2, owner)), 5);
			await plotusToken.burnFrom.call(account2, web3.utils.toWei("5"), { from: owner });
			await plotusToken.burnFrom(account2, web3.utils.toWei("5"), { from: owner });

			const account2Balance = await plotusToken.balanceOf(account2);
			// assert.equal(receipt, true);
			assert.equal(account2Balance.toNumber(), 0);
			assert.equal(web3.utils.fromWei(await plotusToken.totalSupply()), initialSupply - 10);
			assert.equal(web3.utils.fromWei(await plotusToken.allowance(account2, owner)), 0);
		});

		it("Should revert burnFrom if allowance is not enough", async () => {
			await plotusToken.transfer(account2, web3.utils.toWei("5"), { from: owner }); //ownerBalance - 15
			await expectRevert(
				plotusToken.burnFrom(account2, web3.utils.toWei("5"), { from: owner }),
				"SafeMath: subtraction overflow"
			);
			assert.equal(web3.utils.fromWei(await plotusToken.balanceOf(account2)), 5);
		});
	});

	describe("Transfer function", () => {
		it("Should be able to transfer tokens", async () => {
			const transferCall = await plotusToken.transfer.call(account2, web3.utils.toWei("5"), { from: owner });
			const receipt = await plotusToken.transfer(account2, web3.utils.toWei("5"), { from: owner }); //ownerBalance - 20
			const newOwnerBalance = await plotusToken.balanceOf(owner);
			const account2Balance = await plotusToken.balanceOf(account2);

			assert.equal(transferCall, true);
			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Transfer");
			assert.equal(receipt.logs[0].args.from, owner);
			assert.equal(receipt.logs[0].args.to, account2);
			assert.equal(web3.utils.fromWei(receipt.logs[0].args.value), 5);
			assert.equal(web3.utils.fromWei(newOwnerBalance), 29989880);
			assert.equal(web3.utils.fromWei(account2Balance), 10); //account2Balance = 10
		});

		it("Should NOT transfer tokens if recipient is null address", async () => {
			const ownerBalance = web3.utils.fromWei(await plotusToken.balanceOf(owner));
			await expectRevert(
				plotusToken.transfer(nullAddress, 100, { from: owner }),
				"ERC20: transfer to the zero address"
			);
			const newOwnerBalance = web3.utils.fromWei(await plotusToken.balanceOf(owner));
			assert.equal(newOwnerBalance, ownerBalance);
		});

		it("Should NOT transfer tokens greater than transferable balance", async () => {
			const balance = web3.utils.fromWei(await plotusToken.balanceOf(owner));
			await assertRevert(plotusToken.transfer(account2, web3.utils.toWei(balance + 1), { from: owner }));
		});
	});

	describe("Approve function", () => {
		it("Should approve tokens for delegated transfer", async () => {
			let receipt = await plotusToken.approve.call(account2, web3.utils.toWei("10"), { from: owner });
			let allowanceAmount = web3.utils.fromWei(await plotusToken.allowance(owner, account2));
			assert.equal(receipt, true);
			assert.equal(allowanceAmount, 0);

			receipt = await plotusToken.approve(account2, web3.utils.toWei("5"), { from: owner });
			allowanceAmount = web3.utils.fromWei(await plotusToken.allowance(owner, account2));
			assert.equal(receipt.logs.length, 1);
			assert.equal(receipt.logs[0].event, "Approval");
			assert.equal(receipt.logs[0].args.owner, owner);
			assert.equal(receipt.logs[0].args.spender, account2);
			assert.equal(web3.utils.fromWei(receipt.logs[0].args.value), 5);
			assert.equal(allowanceAmount, 5);
		});
		it("Should increase allowance", async () => {
			const receipt = await plotusToken.increaseAllowance.call(account2, web3.utils.toWei("5"), { from: owner });
			await plotusToken.increaseAllowance(account2, web3.utils.toWei("5"), { from: owner });
			allowanceAmount = web3.utils.fromWei(await plotusToken.allowance(owner, account2));

			assert.equal(receipt, true);
			assert.equal(allowanceAmount, 10);
		});
		it("Should decrease allowance", async () => {
			const receipt = await plotusToken.decreaseAllowance.call(account2, web3.utils.toWei("10"), { from: owner });
			await plotusToken.decreaseAllowance(account2, web3.utils.toWei("10"), { from: owner });
			allowanceAmount = web3.utils.fromWei(await plotusToken.allowance(owner, account2));

			assert.equal(receipt, true);
			assert.equal(allowanceAmount, 0);
		});
	});

	describe("TransferFrom function", () => {
		it("Handle delegate token transfer", async () => {
			await plotusToken.approve(account2, web3.utils.toWei("10"), { from: owner });
			await expectRevert(
				plotusToken.transferFrom(owner, account3, web3.utils.toWei("100"), { from: account2 }),
				"SafeMath: subtraction overflow"
			);
			const transferFromCall = await plotusToken.transferFrom.call(owner, account3, web3.utils.toWei("5"), {
				from: account2,
			});
			const receipt = await plotusToken.transferFrom(owner, account3, web3.utils.toWei("5"), { from: account2 }); //ownerBalance - 25
			const fromAccountBalance = web3.utils.fromWei(await plotusToken.balanceOf(owner));
			const toAccountBalance = web3.utils.fromWei(await plotusToken.balanceOf(account3));
			const allowanceAmount = web3.utils.fromWei(await plotusToken.allowance(owner, account2));

			assert.equal(transferFromCall, true);
			assert.equal(fromAccountBalance, 29989875);
			assert.equal(toAccountBalance, 5);
			assert.equal(receipt.logs.length, 2);
			assert.equal(receipt.logs[0].event, "Transfer");
			assert.equal(receipt.logs[0].args.from, owner);
			assert.equal(receipt.logs[0].args.to, account3);
			assert.equal(web3.utils.fromWei(receipt.logs[0].args.value), 5);
			assert.equal(receipt.logs[1].event, "Approval");
			assert.equal(receipt.logs[1].args.owner, owner);
			assert.equal(receipt.logs[1].args.spender, account2);
			assert.equal(web3.utils.fromWei(receipt.logs[1].args.value), 5);
			assert.equal(allowanceAmount, 5);
		});

		it("Should NOT transferFrom tokens if recipient is null address", async () => {
			const ownerBalance = web3.utils.fromWei(await plotusToken.balanceOf(owner));
			await expectRevert(
				plotusToken.transferFrom(owner, nullAddress, 5, { from: account2 }),
				"ERC20: transfer to the zero address"
			);
			const newOwnerBalance = web3.utils.fromWei(await plotusToken.balanceOf(owner));
			assert.equal(newOwnerBalance, ownerBalance);
		});

		it("Should NOT transferFrom tokens greater than transferable balance", async () => {
			await plotusToken.approve(account3, web3.utils.toWei("200"), { from: account2 });
			await expectRevert(
				plotusToken.transferFrom(account2, owner, web3.utils.toWei("200"), { from: account2 }),
				"SafeMath: subtraction overflow"
			);
		});
	});
});
