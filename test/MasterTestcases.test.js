const Master = artifacts.require('Master');
const MemberRoles = artifacts.require('MemberRoles');
const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const TokenController = artifacts.require("TokenController");
const Plotus = artifacts.require("Plotus");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
// const NewProxyInternalContract = artifacts.require('NewProxyInternalContract');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const {ether, toHex, toWei} = require('./utils/ethTools');
const {increaseTime, duration} = require('./utils/increaseTime');
const {assertRevert} = require('./utils/assertRevert');
const gvProp = require('./utils/gvProposal.js').gvProposalWithIncentiveViaTokenHolder;
const encode = require('./utils/encoder.js').encode;
const encode1 = require('./utils/encoder.js').encode1;
const { takeSnapshot, revertSnapshot } = require('./utils/snapshot');

const BN = web3.utils.BN;
// const BigNumber = web3.BigNumber;
// require('chai')
//   .use(require('chai-bignumber')(BigNumber))
//   .should();


let ms;
let tc;
let addr = [];
let memberRoles;
let gov;
let propCat;
let nxmMas;
let pl;
let snapshotId;

contract('Master', function(accounts) {

  const [owner, newOwner, govVoter4] = accounts;
  // const fee = toWei(0.002);
  // const UNLIMITED_ALLOWANCE = new BN((2).toString())
  //   .pow(new BN((256).toString()))
  //   .sub(new BN((1).toString()));

  before(async function() {

    // snapshotId = await takeSnapshot();
    ms = await OwnedUpgradeabilityProxy.deployed();
    ms = await Master.at(ms.address);
    tc = await TokenController.at(await ms.getLatestAddress(toHex('TC')));
    propCat = await ProposalCategory.at(await ms.getLatestAddress(toHex('PC')));
    memberRoles = await MemberRoles.at(await ms.getLatestAddress(toHex('MR')));
    gov = await Governance.at(await ms.getLatestAddress(toHex('GV')));
    pl = await Plotus.at(await ms.getLatestAddress(toHex('PL')));

console.log("===", ms.address);
    // addr.push(tc.address);
    // addr.push(oldGv.address);
    // addr.push(propCat.address);
    // addr.push(oldMR.address);

    // for (let i = 2; i < 9; i++) {
    //   await oldMR.payJoiningFee(accounts[i], { from: accounts[i], value: fee });
    //   await oldMR.kycVerdict(accounts[i], true);
    //   (await nxms.isMember(accounts[i])).should.equal(true);
    //   await nxmtk.transfer(accounts[i], toWei(37500));
    // }

    // const tcProxyAddress = await nxms.getLatestAddress(toHex('TC'));
    // await nxmtk.approve(tcProxyAddress, UNLIMITED_ALLOWANCE, { from: govVoter4 });
    // await tc.lock(toHex('CLA'), ether(400), duration.days(500), { from: govVoter4 });

    // async function updateCategory(nxmAdd, functionName, updateCat) {
    //   let abReq = 80;
    //   if (updateCat == 27) abReq = 60;
    //   let actionHash = encode1(
    //     [
    //       'uint256',
    //       'string',
    //       'uint256',
    //       'uint256',
    //       'uint256',
    //       'uint256[]',
    //       'uint256',
    //       'string',
    //       'address',
    //       'bytes2',
    //       'uint256[]',
    //       'string'
    //     ],
    //     [
    //       updateCat,
    //       'Edit Category',
    //       2,
    //       50,
    //       15,
    //       [2],
    //       604800,
    //       '',
    //       nxmAdd,
    //       toHex('MS'),
    //       [0, 0, abReq, 0],
    //       functionName
    //     ]
    //   );
    //   await gvProp(4, actionHash, oldMR, oldGv, 1);
    // }
    // await updateCategory(
    //   nxms.address,
    //   'upgradeMultipleContracts(bytes2[],address[])',
    //   29
    // );
    // await updateCategory(
    //   nxms.address,
    //   'upgradeMultipleImplementations(bytes2[],address[])',
    //   5
    // );
    // await updateCategory(nxms.address, 'upgradeTo(address)', 27);
  });

  describe('Update master address', function() {
    it('Update master address after posting data in governance implementation', async function() {
      console.log("===>", ms.address);
      let proxy = await OwnedUpgradeabilityProxy.at(gov.address);
      let implementation = await Governance.at(await proxy.implementation());
      await implementation.changeMasterAddress(owner);
      proxy = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('PC'))
      );
      implementation = await ProposalCategory.at(await proxy.implementation());
      await implementation.changeMasterAddress(owner);
      proxy = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('MR'))
      );
      implementation = await MemberRoles.at(await proxy.implementation());
      await implementation.changeMasterAddress(owner);
      assert.equal(await implementation.ms(), owner);
      let newMaster = await Master.new();
      let actionHash = encode1(['address'], [newMaster.address]);
      await gvProp(
        8,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        gov,
        2,
        0
      );
      let implInc = await OwnedUpgradeabilityProxy.at(ms.address);
      assert.equal(await implInc.implementation(), newMaster.address);
    });

    // it('Create a sample proposal after updating master', async function() {
    //   let actionHash = encode(
    //     'updateUintParameters(bytes8,uint256)',
    //     toHex('MAXFOL'),
    //     7
    //   );
    //   await gvProp(
    //     22,
    //     actionHash,
    //     await MemberRoles.at(await nxms.getLatestAddress(toHex('MR'))),
    //     gov,
    //     2
    //   );
    //   assert.equal(
    //     (await gov.getUintParameters(toHex('MAXFOL')))[1].toNumber(),
    //     7
    //   );
    //   let APIID = await pd.allAPIcall((await pd.getApilCallLength()) - 1);
    // });

    // it('Sending funds to funds to QT, CR, P1, P2', async function() {
    //   await qt.sendEther({from: owner, value: toWei(100)});
    //   await pl1.sendEther({from: owner, value: toWei(100)});
    //   await pl2.sendEther({from: owner, value: toWei(100)});
    //   await dai.transfer(pl1.address, toWei(100));
    //   await dai.transfer(pl2.address, toWei(100));
    //   await tf.mint(cr.address, toWei(1));
    //   await tf.mint(await nxms.getLatestAddress(toHex('TC')), toWei(1));
    // });


    // it('Upgrade multiple contract implemenations', async function() {
    //   oldGv = await Governance.at(await nxms.getLatestAddress(toHex('GV')));
    //   oldMR = await MemberRoles.at(await nxms.getLatestAddress(toHex('MR')));
    //   oldTC = await TokenController.at(
    //     await nxms.getLatestAddress(toHex('TC'))
    //   );
    //   oldPC = await ProposalCategory.at(
    //     await nxms.getLatestAddress(toHex('PC'))
    //   );
    //   let tcbalNxm = await nxmtk.balanceOf(
    //     await nxms.getLatestAddress(toHex('TC'))
    //   );
    //   let proposalDetails = await oldGv.proposal(1);
    //   let totalSupply = await oldTC.totalSupply();
    //   let catDetails = await oldPC.category(5);
    //   let members = await oldMR.members(2);
    //   let catId = 5;
    //   let newGV = await Governance.new();
    //   let newPC = await ProposalCategory.new();
    //   let newMR = await MemberRoles.new();
    //   let newTC = await TokenController.new();
    //   actionHash = encode1(
    //     ['bytes2[]', 'address[]'],
    //     [
    //       [toHex('GV'), toHex('PC'), toHex('MR'), toHex('TC')],
    //       [newGV.address, newPC.address, newMR.address, newTC.address]
    //     ]
    //   );

    //   await gvProp(
    //     catId,
    //     actionHash,
    //     await MemberRoles.at(await nxms.getLatestAddress(toHex('MR'))),
    //     await Governance.at(await nxms.getLatestAddress(toHex('GV'))),
    //     2
    //   );

    //   // Checking Upgraded Contract addresses
    //   assert.equal(newGV.address, await qd.getImplementationAdd(toHex('GV')));
    //   assert.equal(newPC.address, await qd.getImplementationAdd(toHex('PC')));
    //   assert.equal(newMR.address, await qd.getImplementationAdd(toHex('MR')));
    //   assert.equal(newTC.address, await qd.getImplementationAdd(toHex('TC')));
    //   oldGv = await Governance.at(await nxms.getLatestAddress(toHex('GV')));
    //   oldMR = await MemberRoles.at(await nxms.getLatestAddress(toHex('MR')));

    //   // Checking Master address in upgraded Contracts
    //   assert.equal(nxms.address, await oldGv.ms());
    //   assert.equal(nxms.address, await oldMR.ms());
    //   assert.equal(nxms.address, await oldTC.ms());
    //   assert.equal(nxms.address, await oldPC.ms());

    //   // Checking Funds transfer in upgraded Contracts
    //   assert.equal(
    //     (await nxmtk.balanceOf(await nxms.getLatestAddress(toHex('TC')))) / 1,
    //     tcbalNxm / 1
    //   );

    //   // Checking getters in upgraded Contracts
    //   assert.equal(
    //     (await oldGv.proposal(1)).toString(),
    //     proposalDetails.toString()
    //   );
    //   assert.equal((await oldMR.members(2)).toString(), members.toString());
    //   assert.equal((await oldTC.totalSupply()) / 1, totalSupply / 1);
    //   assert.equal((await oldPC.category(5)).toString(), catDetails.toString());
    // });
    // it('Add new Proxy Internal contract', async function() {
    //   let nic = await NewProxyInternalContract.new();
    //   let CatId = await oldPC.totalCategories();
    //   // Creating proposal for adding new proxy internal contract
    //   actionHash = encode(
    //     'addNewInternalContract(bytes2,address,uint256)',
    //     toHex('NP'),
    //     nic.address,
    //     2
    //   );

    //   await gvProp(
    //     CatId - 1,
    //     actionHash,
    //     await MemberRoles.at(await nxms.getLatestAddress(toHex('MR'))),
    //     await Governance.at(await nxms.getLatestAddress(toHex('GV'))),
    //     2
    //   );
    //   p1 = await oldGv.getProposalLength();
    //   assert.equal(nic.address, await qd.getImplementationAdd(toHex('NP')));
    //   let proxyINS = await NewProxyInternalContract.at(
    //     await nxms.getLatestAddress(toHex('NP'))
    //   );
    //   assert.equal(nxms.address, await proxyINS.ms());
    //   assert.equal(await nxms.isUpgradable(toHex('NP')), false);
    //   assert.equal(await nxms.isProxy(toHex('NP')), true);
    //   assert.equal(await nxms.isInternal(nic.address), false);
    //   assert.equal(await nxms.isInternal(proxyINS.address), true);
    //   assert.notEqual(await nxms.pauseTime(), 200);
    //   await proxyINS.callUpdatePauseTime(200);
    //   assert.equal(await nxms.pauseTime(), 200);
    // });
    // it('Check if new master is updated properly', async function() {
    //   let tcProxy = await TokenController.at(
    //     await nxms.getLatestAddress(toHex('TC'))
    //   );
    //   let mrProxy = await MemberRoles.at(
    //     await nxms.getLatestAddress(toHex('MR'))
    //   );
    //   let catProxy = await ProposalCategory.at(
    //     await nxms.getLatestAddress(toHex('PC'))
    //   );

    //   assert.equal(nxms.address, await qd.ms());
    //   assert.equal(nxms.address, await td.ms());
    //   assert.equal(nxms.address, await cd.ms());
    //   assert.equal(nxms.address, await pd.ms());
    //   assert.equal(nxms.address, await newQT.ms());
    //   assert.equal(nxms.address, await newTF.ms());
    //   assert.equal(nxms.address, await tcProxy.ms());
    //   assert.equal(nxms.address, await newCL.ms());
    //   assert.equal(nxms.address, await newCR.ms());
    //   assert.equal(nxms.address, await newP1.ms());
    //   assert.equal(nxms.address, await newP2.ms());
    //   assert.equal(nxms.address, await newMC.ms());
    //   assert.equal(nxms.address, await gov.ms());
    //   assert.equal(nxms.address, await mrProxy.ms());
    //   assert.equal(nxms.address, await catProxy.ms());
    // });
  });
  // describe('Negative Test Cases', function() {
  //   it('Upgrade contract should revert if called directly', async function() {
  //     await assertRevert(
  //       nxms.upgradeMultipleContracts([toHex('P1')], [pl1.address])
  //     );
  //     await assertRevert(
  //       nxms.upgradeMultipleImplementations([toHex('GV')], [gov.address])
  //     );
  //   });
  //   it('Upgrade contract should revert if array length is different for contract code and address', async function() {
  //     await assertRevert(
  //       nxms.upgradeMultipleContracts([toHex('P1'), toHex('P2')], [pl1.address])
  //     );
  //     await assertRevert(
  //       nxms.upgradeMultipleImplementations(
  //         [toHex('GV')],
  //         [gov.address, pl1.address]
  //       )
  //     );
  //   });
  //   it('Add internal contract should revert if called directly', async function() {
  //     await assertRevert(
  //       nxms.addNewInternalContract(toHex('PS'), pl1.address, 1)
  //     );
  //   });
  //   it('Add internal contract should revert if new contract code already exist', async function() {
  //     await assertRevert(
  //       nxms.addNewInternalContract(toHex('P1'), pl1.address, 1)
  //     );
  //   });
  //   it('Add internal contract should revert if new contract address is null', async function() {
  //     await assertRevert(
  //       nxms.addNewInternalContract(toHex('PS'), ZERO_ADDRESS, 1)
  //     );
  //   });
  //   it('Upgrade contract implementation should revert if new address is null', async function() {
  //     oldGv = await Governance.at(await nxms.getLatestAddress(toHex('GV')));
  //     oldMR = await MemberRoles.at(await nxms.getLatestAddress(toHex('MR')));
  //     gvImplementation = await qd.getImplementationAdd(toHex('GV'));
  //     oldPC = await ProposalCategory.at(
  //       await nxms.getLatestAddress(toHex('PC'))
  //     );

  //     let catId = 5;

  //     actionHash = encode1(
  //       ['bytes2[]', 'address[]'],
  //       [[toHex('GV')], [ZERO_ADDRESS]]
  //     );

  //     await gvProp(
  //       catId,
  //       actionHash,
  //       await MemberRoles.at(await nxms.getLatestAddress(toHex('MR'))),
  //       await Governance.at(await nxms.getLatestAddress(toHex('GV'))),
  //       2
  //     );
  //     assert.equal(
  //       gvImplementation,
  //       await qd.getImplementationAdd(toHex('GV'))
  //     );
  //   });
  //   it('Upgrade contract should revert if new address is null', async function() {
  //     let catId = 29;
  //     let clAddress = await nxms.getLatestAddress(toHex('CL'));

  //     actionHash = encode1(
  //       ['bytes2[]', 'address[]'],
  //       [[toHex('CL')], [ZERO_ADDRESS]]
  //     );

  //     await gvProp(
  //       catId,
  //       actionHash,
  //       await MemberRoles.at(await nxms.getLatestAddress(toHex('MR'))),
  //       await Governance.at(await nxms.getLatestAddress(toHex('GV'))),
  //       2
  //     );
  //     assert.equal(clAddress, await nxms.getLatestAddress(toHex('CL')));
  //   });
  //   it('Upgrade contract implementation should revert if contract type is not isProxy', async function() {
  //     oldGv = await Governance.at(await nxms.getLatestAddress(toHex('GV')));
  //     oldMR = await MemberRoles.at(await nxms.getLatestAddress(toHex('MR')));
  //     clAddress = await nxms.getLatestAddress(toHex('CL'));
  //     oldPC = await ProposalCategory.at(
  //       await nxms.getLatestAddress(toHex('PC'))
  //     );
  //     let newCL = await Claims.new();
  //     let catId = 5;

  //     actionHash = encode1(
  //       ['bytes2[]', 'address[]'],
  //       [[toHex('CL')], [newCL.address]]
  //     );

  //     await gvProp(
  //       catId,
  //       actionHash,
  //       await MemberRoles.at(await nxms.getLatestAddress(toHex('MR'))),
  //       await Governance.at(await nxms.getLatestAddress(toHex('GV'))),
  //       2
  //     );
  //     assert.equal(clAddress, await nxms.getLatestAddress(toHex('CL')));
  //   });
  //   it('Upgrade contract should revert if contract type is not isUpgradable', async function() {
  //     let catId = 29;
  //     let gvImplementation = await qd.getImplementationAdd(toHex('GV'));
  //     let gvNew = await Governance.new();

  //     actionHash = encode1(
  //       ['bytes2[]', 'address[]'],
  //       [[toHex('GV')], [gvNew.address]]
  //     );

  //     await gvProp(
  //       catId,
  //       actionHash,
  //       await MemberRoles.at(await nxms.getLatestAddress(toHex('MR'))),
  //       await Governance.at(await nxms.getLatestAddress(toHex('GV'))),
  //       2
  //     );
  //     assert.equal(
  //       gvImplementation,
  //       await qd.getImplementationAdd(toHex('GV'))
  //     );
  //   });
  //   it('Should revert if passed invalid _by param in addEmergencyPause', async function() {
  //     await assertRevert(nxms.addEmergencyPause(true, toHex('ABC')));
  //   });

  //   it('Should revert if caller is not proxyOwner', async function() {
  //     nxmMas = await NXMaster.new();
  //     nxmMas = await OwnedUpgradeabilityProxy.new(nxmMas.address);
  //     nxmMas = await NXMaster.at(nxmMas.address);
  //     await assertRevert(
  //       nxmMas.initiateMaster(nxmtk.address, {from: newOwner})
  //     );
  //     await nxmMas.initiateMaster(nxmtk.address);
  //   });
  //   it('Should revert if master already initiated', async function() {
  //     await assertRevert(nxmMas.initiateMaster(nxmtk.address));
  //   });
  // });

  // after(async function () {
  //   await revertSnapshot(snapshotId);
  // });

});