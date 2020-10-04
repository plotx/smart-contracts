const MemberRoles = artifacts.require("MemberRoles");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Governance = artifacts.require("Governance");
const ProposalCategory = artifacts.require("ProposalCategory");
const Master = artifacts.require("Master");
const TokenController = artifacts.require("TokenController");

const assertRevert = require("./utils/assertRevert").assertRevert;
const { toHex } = require("./utils/ethTools");
const gvProposal = require("./utils/gvProposal.js").gvProposal;
const { encode, encode1 } = require("./utils/encoder.js");
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const { takeSnapshot, revertSnapshot } = require("./utils/snapshot");

let pc;
let gv;
let mr;
let tc;
let master;
let nullAddress = "0x0000000000000000000000000000000000000000";
let snapshotId;

contract("Proposal Category", function ([owner, other]) {
	before(async function () {
		snapshotId = await takeSnapshot();

		master = await OwnedUpgradeabilityProxy.deployed();
		master = await Master.at(master.address);
		let address = await master.getLatestAddress(toHex("PC"));
		pc = await ProposalCategory.at(address);
		address = await master.getLatestAddress(toHex("GV"));
		gv = await Governance.at(address);
		address = await master.getLatestAddress(toHex("MR"));
		mr = await MemberRoles.at(address);
		address = await master.getLatestAddress(toHex("TC"));
		tc = await TokenController.at(address);
	});

	it("14.1 Should be initialized", async function () {
		await assertRevert(pc.proposalCategoryInitiate());
		const g1 = await pc.totalCategories();
		const g2 = await pc.category(1);
		assert.equal(g2[1].toNumber(), 1);
		const g5 = await pc.categoryAction(1);
		assert.equal(g5[2].toString(), "0x4d52");
		const g6 = await pc.totalCategories();
		assert.equal(g6.toNumber(), 24);
	});

	it("14.2 should not allow unauthorized to change master address", async function () {
		await assertRevert(pc.setMasterAddress({ from: other }));
	});

	it("14.3 Should not add a proposal category if member roles are invalid", async function () {
		let c1 = await pc.totalCategories();
		await assertRevert(pc.newCategory("Yo", 1, 1, 0, [1], 1, "", nullAddress, toHex("EX"), [0, 0, 0], ""));
		//proposal to add category
		let actionHash = encode(
			"addCategory(string,uint,uint,uint,uint[],uint,string,address,bytes2,uint[])",
			"Description",
			1,
			1,
			0,
			[5],
			1,
			"",
			nullAddress,
			toHex("EX"),
			[0, 0, 0, 1]
		);
		let p1 = await gv.getProposalLength();
		await gv.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 3, "Add new member", actionHash);
		await gv.submitVote(p1.toNumber(), 1);
		await gv.closeProposal(p1.toNumber());
		const c2 = await pc.totalCategories();
		assert.equal(c2.toNumber(), c1.toNumber(), "category added");
	});

	it("14.3 Should add a proposal category", async function () {
		let c1 = await pc.totalCategories();
		await assertRevert(pc.newCategory("Yo", 1, 1, 0, [1], 1, "", nullAddress, toHex("EX"), [0, 0, 0], ""));
		//proposal to add category
		let actionHash = encode(
			"addCategory(string,uint,uint,uint,uint[],uint,string,address,bytes2,uint[])",
			"Description",
			1,
			1,
			0,
			[1],
			1,
			"",
			nullAddress,
			toHex("EX"),
			[0, 0, 0, 1]
		);
		let p1 = await gv.getProposalLength();
		await gv.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 3, "Add new member", actionHash);
		await gv.submitVote(p1.toNumber(), 1);
		await gv.closeProposal(p1.toNumber());
	});

	it("14.4 Should update a proposal category", async function () {
		let c1 = await pc.totalCategories();
		c1 = c1.toNumber() - 1;
		const cat1 = await pc.category(c1);
		await assertRevert(pc.editCategory(c1, "Yo", 1, 1, 0, [1], 1, "", nullAddress, toHex("EX"), [0, 0, 0], ""));
		//proposal to update category
		let actionHash = encode(
			"edit(uint,string,uint,uint,uint,uint[],uint,string,address,bytes2,uint[],string)",
			c1,
			"YoYo",
			2,
			1,
			20,
			[1],
			1,
			"",
			nullAddress,
			toHex("EX"),
			[0, 0, 0],
			""
		);
		let p1 = await gv.getProposalLength();
		await gv.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
		await gv.submitVote(p1.toNumber(), 1);
		await gv.closeProposal(p1.toNumber());
		let cat2 = await pc.category(c1);
		assert.notEqual(cat1[1], cat2[1], "category not updated");
	});

	it("14.5 Should not update a proposal category if member roles are invalid", async function () {
		let c1 = await pc.totalCategories();
		c1 = c1.toNumber() - 1;
		const cat1 = await pc.category(c1);
		await assertRevert(pc.editCategory(c1, "Yo", 1, 1, 0, [1], 1, "", nullAddress, toHex("EX"), [0, 0, 0], ""));
		//proposal to update category
		let actionHash = encode(
			"updateCategory(uint,string,uint,uint,uint,uint[],uint,string,address,bytes2,uint[])",
			c1,
			"YoYo",
			2,
			1,
			20,
			[7],
			1,
			"",
			nullAddress,
			toHex("EX"),
			[0, 0, 0]
		);
		let p1 = await gv.getProposalLength();
		await gv.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
		await gv.submitVote(p1.toNumber(), 1);
		await gv.closeProposal(p1.toNumber());
		let cat2 = await pc.category(c1);
		assert.notEqual(cat1[1], cat2[1], "category not updated");
	});

	it("14.6 Add new category with no action hash and contract address as master, category should not be created", async function () {
		//externalLiquidityTrade
		let actionHash = encode1(
			["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			[
				"external Liquidity Trade",
				2,
				75,
				75,
				[2],
				604800,
				"QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
				tc.address,
				toHex("PD"),
				[0, 0, 0, 1],
				"externalLiquidityTrade()",
			]
		);
		let categoryLengthOld = (await pc.totalCategories()).toNumber();
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(3, actionHash, mr, gv, 1);
		let categoryLengthNew = (await pc.totalCategories()).toNumber();
		assert.equal(categoryLengthNew, categoryLengthOld + 1);
		await increaseTime(604800);

		actionHash = encode1(
			["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			["Test", 1, 60, 15, [2], 604800, "", nullAddress, toHex("MS"), [0, 0, 0, 0], ""]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(3, actionHash, mr, gv, 1);
		assert.equal((await gv.proposalActionStatus(pId)).toNumber(), 1);
		categoryLengthNew = (await pc.totalCategories()).toNumber();
		assert.equal(categoryLengthNew, categoryLengthOld);
	});

	it("14.7 Edit category with no action hash and contract address as master, category should not be updated", async function () {
		actionHash = encode1(
			["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			[2, "Test", 1, 65, 15, [2], 604800, "", nullAddress, toHex("MS"), [0, 0, 0, 0], ""]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(4, actionHash, mr, gv, 1);
		let category = await pc.category(2);
		assert.equal((await gv.proposalActionStatus(pId)).toNumber(), 1);
		assert.notEqual(category[2].toNumber(), 65, "Category updated");
	});

	it("14.8 Edit category with invalid member roles, category should not be updated", async function () {
		actionHash = encode1(
			["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			[2, "Test", 6, 54, 15, [5], 604800, "", nullAddress, toHex("EX"), [0, 0, 0, 0], ""]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(4, actionHash, mr, gv, 1);
		let category = await pc.category(2);
		assert.equal((await gv.proposalActionStatus(pId)).toNumber(), 1);
		assert.notEqual(category[2].toNumber(), 65, "Category updated");
		await gv.triggerAction(pId);
	});

	it("14.9 Add category with valid action data and invalid votepercent, category should not be added", async function () {
		let categoryId = await pc.totalCategories();
		actionHash = encode1(
			["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			[
				"New external Liquidity Trade",
				2,
				124,
				75,
				[2],
				604800,
				"QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
				tc.address,
				toHex("PD"),
				[0, 0, 0, 0],
				"externalLiquidityTrade()",
			]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(3, actionHash, mr, gv, 1);
		let proposalActionStatus = await gv.proposalActionStatus(pId);
		assert.equal(proposalActionStatus.toNumber(), 1, "Action executed");
	});

	it("14.10 Add category with valid action data and invalid member roles, category should not be added", async function () {
		let categoryId = await pc.totalCategories();
		actionHash = encode1(
			["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			[
				"New external Liquidity Trade",
				1,
				75,
				75,
				[9],
				604800,
				"QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
				tc.address,
				toHex("PD"),
				[0, 0, 0, 0],
				"externalLiquidityTrade()",
			]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(3, actionHash, mr, gv, 1);
		let proposalActionStatus = await gv.proposalActionStatus(pId);
		assert.equal(proposalActionStatus.toNumber(), 1, "Action executed");
	});

	it("14.11 Edit category with valid action data and invalid votepercent, category should be not updated", async function () {
		let categoryId = (await pc.totalCategories()) / 1 - 1;
		actionHash = encode1(
			["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			[
				categoryId,
				"external Liquidity Trade",
				2,
				124,
				75,
				[2],
				604800,
				"QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
				tc.address,
				toHex("PD"),
				[0, 0, 0, 1],
				"externalLiquidityTrade()",
			]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(4, actionHash, mr, gv, 1);
		let category = await pc.category(categoryId);
		assert.notEqual(category[2].toNumber(), 124, "Category updated");
	});

	it("14.12 Edit category with valid action hash and contract name, category should be updated", async function () {
		let categoryId = (await pc.totalCategories()) / 1 - 1;
		actionHash = encode1(
			["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			[
				categoryId,
				"external Liquidity Trade",
				2,
				68,
				75,
				[2],
				604800,
				"QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
				gv.address,
				toHex("EX"),
				[0, 0, 0, 1],
				"claimReward()",
			]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(4, actionHash, mr, gv, 1);
		let category = await pc.category(categoryId);
		let proposalActionStatus = await gv.proposalActionStatus(pId);
		assert.equal(proposalActionStatus.toNumber(), 3, "Action not executed");
	});

	it('Create proposal in category with external action, should execute', async function() {
	  let categoryId = (await pc.totalCategories())/1 - 1;
	  actionHash = encode(
	    null
	  );
	  pId = (await gv.getProposalLength()).toNumber();
	  await gv.createProposal('Proposal2', 'Proposal2', 'Proposal2', 0);
	  await gv.categorizeProposal(pId, categoryId, 0);
	  await gv.submitProposalWithSolution(pId, 'Upgrade', actionHash);
      await gv.submitVote(pId, 1);
	  await increaseTime(604800);
	  await gv.closeProposal(pId);
	  await increaseTime(86500);
	  await gv.triggerAction(pId);
	});

	it("14.13 Add category with no action hash and valid data, category should be added", async function () {
		let categoryId = await pc.totalCategories();
		actionHash = encode1(
			["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
			["Test", 2, 75, 75, [2], 604800, "", nullAddress, toHex("EX"), [0, 0, 0, 0], ""]
		);
		pId = (await gv.getProposalLength()).toNumber();
		categoryLengthOld = (await pc.totalCategories()).toNumber();
		await gvProposal(3, actionHash, mr, gv, 1);
		let proposalActionStatus = await gv.proposalActionStatus(pId);
		assert.equal(proposalActionStatus.toNumber(), 3, "Action not executed");
	});

	it("14.14 Should not be able to create a proposal with category ID less than one", async () => {
		await gv.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 1, "Add new member", actionHash);
		await assertRevert(gv.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 0, "Add new member", actionHash));
	});

	after(async function () {
		await revertSnapshot(snapshotId);
	});
});
