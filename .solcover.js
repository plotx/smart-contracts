module.exports = {
  skipFiles: ['external', 'mock', 'interfaces'],
  providerOptions: {
    default_balance_ether: 100, // Extra zero, coverage consumes more gas
    network_id: 5777,
    mnemonic:
      'grocery obvious wire insane limit weather parade parrot patrol stock blast ivory',
    total_accounts: 47,
    hardfork: 'constantinople'
  }
};