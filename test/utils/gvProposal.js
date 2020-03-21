const increaseTime = require('./increaseTime.js').increaseTime;
async function gvProposal(...args) {
  let catId = args[0];
  let actionHash = args[1];
  let mr = args[2];
  let gv = args[3];
  let seq = args[4];
  let roleAuthorised = args[5];
  let roleToCreate = args[6];
  let roleToCat = args[7]; 
  let p = await gv.getProposalLength.call();
  await gv.createProposal('proposal', 'proposal', 'proposal', 0, {from:roleToCreate});
  await gv.categorizeProposal(p, catId,{from:roleToCat});
  await gv.submitProposalWithSolution(p, 'proposal', actionHash,{from:roleToCreate});
  let solution = await gv.getSolutionAction.call(p, 1);
  assert.equal(solution[1], actionHash);
  let members = await mr.members.call(seq);
  let iteration = 0;
  for (iteration = 0; iteration < members[1].length; iteration++)
    await gv.submitVote(p, 1, {
      from: members[1][iteration]
    });
  // console.log(await gv.proposalDetails(p));
  // if (seq != 3) 
  await gv.closeProposal(p);
  let proposal = await gv.proposal.call(p);
  assert.equal(proposal[2].toNumber(), 3);
}

async function gvProposalWithSolutionWithMultipleroles(...args) {
  let catId = args[0];
  let actionHash = args[1];
  let mr = args[2];
  let gv = args[3];
  let seq = args[4];
  let roleAuthorised = args[5];
  let p = await gv.getProposalLength.call();
  await gv.createProposal('proposal', 'proposal', 'proposal', 0);
  await gv.categorizeProposal(p, catId, {from:roleAuthorised});
  await gv.submitProposalWithSolution(p, 'proposal', actionHash);
  let j;
  for(j=0;j<seq.length;j++)
  {
      let members = await mr.members.call(seq[j]);
      let iteration = 0;
      for (iteration = 0; iteration < members[1].length; iteration++)
        await gv.submitVote(p, 1, {
          from: members[1][iteration]
        });
  }
 
  // console.log(await gv.proposalDetails(p));
  // await increaseTime(604800);
  await gv.closeProposal(p);
  let proposal = await gv.proposal.call(p);
  assert.equal(proposal[2].toNumber(), 3);
}

async function newCategory(...args){
  let roleToVote = args[0];
  let maj = args[1];
  let roleToCreate = args[2];
  let closeTime = args[3];
  let contractAdd = args[4];
  let contractCode = args[5];
  let roleToCat = args[6];
  let categoryInstance = args[7];
  let catId = await categoryInstance.totalCategories.call();
  await categoryInstance.addCategory("newCat",roleToVote,maj,roleToCreate,closeTime,"actionHash",contractAdd,contractCode,roleToCat);
  let result1 = await categoryInstance.category.call(catId)
  assert(result1[0], catId);
  let i;
  for(i=0;i<result1[1].length;i++)
  assert(result1[1][i], roleToVote[i]);
  assert(result1[1].length,roleToVote.length);
  assert(result1[2], maj);
  for(i=0;i<result1[3].length;i++)
  assert(result1[3][i], roleToCreate[i]);
  assert(result1[3].length,roleToCreate.length);
  assert(result1[4], closeTime);

  for(i=0;i<result1[5].length;i++)
  assert(result1[5][i], roleToCat[i]);
  assert(result1[5].length,roleToCat.length);

  return catId;
}

module.exports = { gvProposalWithSolutionWithMultipleroles, gvProposal, newCategory };
