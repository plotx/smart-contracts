pragma solidity 0.5.7;

import "../Market.sol";

contract MarketMock is Market {
    function initiate(
     uint[] memory _uintparams,
     string memory _feedsource,
     address payable[] memory _addressParams
    ) 
    public
    payable 
    {
      pl = IPlotus(msg.sender);
      startTime = _uintparams[0];
      FeedSource = _feedsource;
      predictionForDate = _uintparams[2];
      minBet = _uintparams[3];
      totalOptions = _uintparams[4];
      rate = _uintparams[5];
      currentPrice = _uintparams[6];
      DonationAccount = _addressParams[0];
      CommissionAccount = _addressParams[1];
      donationPerc = _uintparams[7];
      commissionPerc  = _uintparams[8];
      optionsAvailable[0] = option(0,0,0,0);
      delta = _uintparams[9];
      maxReturn = _uintparams[10];
      priceStep = _uintparams[11];
      require(expireTime > now);
      require(donationPerc <= 100);
      require(commissionPerc <= 100);
      setOptionRanges(totalOptions);
      currentPriceLocation = _getDistance(1) + 1;
      setPrice();
      // _oraclizeQuery(expireTime, "json(https://financialmodelingprep.com/api/v3/majors-indexes/.DJI).price", "", 0);
    }

}