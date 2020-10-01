/* Copyright (C) 2020 PlotX.io

  This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

  This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
    along with this program.  If not, see http://www.gnu.org/licenses/ */

pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/IMarketUtility.sol";
import "./interfaces/IToken.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IMarketRegistry.sol";

contract Market {
    using SafeMath for *;

    enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }
    
    struct option
    {
      uint predictionPoints;
      mapping(address => uint256) assetStaked;
      mapping(address => uint256) assetLeveraged;
    }

    struct MarketSettleData {
      uint64 WinningOption;
      uint64 settleTime;
    }

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address constant marketFeedAddress = 0x5e2aa6b66531142bEAB830c385646F97fa03D80a;
    address constant plotToken = 0xa626089A947Eadc8a782293B53fCf42247C71111;

    IMarketRegistry constant marketRegistry = IMarketRegistry(0x65Add15C5Ff3Abc069358AAe842dE13Ce92f3447);
    ITokenController constant tokenController = ITokenController(0x3A3d9ca9d9b25AF1fF7eB9d8a1ea9f61B5892Ee9);
    IMarketUtility constant marketUtility = IMarketUtility(0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2);

    uint constant totalOptions = 3;
    uint constant MAX_LEVERAGE = 5;
    uint constant ethCommissionPerc = 10; //with 2 decimals
    uint constant plotCommissionPerc = 5; //with 2 decimals
    bytes32 public constant marketCurrency = "ETH/USDT";
    
    bool internal lockedForDispute;
    address internal incentiveToken;
    uint internal ethAmountToPool;
    uint internal ethCommissionAmount;
    uint internal plotCommissionAmount;
    uint internal tokenAmountToPool;
    uint internal incentiveToDistribute;
    uint[] internal rewardToDistribute;
    PredictionStatus internal predictionStatus;

    
    struct UserData {
      bool claimedReward;
      bool predictedWithBlot;
      bool multiplierApplied;
      mapping(uint => uint) predictionPoints;
      mapping(address => mapping(uint => uint)) assetStaked;
      mapping(address => mapping(uint => uint)) LeverageAsset;
    }

    struct MarketData {
      uint64 startTime;
      uint64 predictionTime;
      uint64 neutralMinValue;
      uint64 neutralMaxValue;
    }

    MarketData public marketData;
    MarketSettleData public marketSettleData;

    mapping(address => UserData) internal userData;

    mapping(uint=>option) public optionsAvailable;

    /**
    * @dev Initialize the market.
    * @param _startTime The time at which market will create.
    * @param _predictionTime The time duration of market.
    * @param _minValue The minimum value of neutral option range.
    * @param _maxValue The maximum value of neutral option range.
    */
    function initiate(uint64 _startTime, uint64 _predictionTime, uint64 _minValue, uint64 _maxValue) public payable {
      OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
      require(marketData.startTime == 0, "Already initialized");
      require(_startTime.add(_predictionTime) > now);
      marketData.startTime = _startTime;
      marketData.predictionTime = _predictionTime;
      
      marketData.neutralMinValue = _minValue;
      marketData.neutralMaxValue = _maxValue;
    }

    /**
    * @dev Place prediction on the available options of the market.
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    * @param _leverage The leverage opted by user at the time of prediction.
    */
    function placePrediction(address _asset, uint256 _predictionStake, uint256 _prediction,uint256 _leverage) public payable {
      require(!marketRegistry.marketCreationPaused() && _prediction <= totalOptions && _leverage <= MAX_LEVERAGE);
      require(now >= marketData.startTime && now <= marketExpireTime());

      uint256 _commissionStake;
      if(_asset == ETH_ADDRESS) {
        require(_predictionStake == msg.value);
        _commissionStake = _calculatePercentage(ethCommissionPerc, _predictionStake, 10000);
        ethCommissionAmount = ethCommissionAmount.add(_commissionStake);
      } else {
        require(msg.value == 0);
        if (_asset == plotToken){
          require(IToken(_asset).transferFrom(msg.sender, address(this), _predictionStake));
        } else {
          require(_asset == tokenController.bLOTToken());
          require(_leverage == MAX_LEVERAGE);
          require(!userData[msg.sender].predictedWithBlot);
          userData[msg.sender].predictedWithBlot = true;
          tokenController.swapBLOT(msg.sender, address(this), _predictionStake);
          _asset = plotToken;
        }
        _commissionStake = _calculatePercentage(plotCommissionPerc, _predictionStake, 10000);
        plotCommissionAmount = plotCommissionAmount.add(_commissionStake);
      }
      _commissionStake = _predictionStake.sub(_commissionStake);


      (uint predictionPoints, bool isMultiplierApplied) = calculatePredictionValue(_prediction, _commissionStake, _leverage, _asset);
      if(isMultiplierApplied) {
        userData[msg.sender].multiplierApplied = true; 
      }
      require(predictionPoints > 0);

      _storePredictionData(_prediction, _commissionStake, _asset, _leverage, predictionPoints);
      marketRegistry.setUserGlobalPredictionData(msg.sender,_predictionStake, predictionPoints, _asset, _prediction, _leverage);
    }

    function calculatePredictionValue(uint _prediction, uint _predictionStake, uint _leverage, address _asset) internal view returns(uint predictionPoints, bool isMultiplierApplied) {
      uint[] memory params = new uint[](11);
      params[0] = _prediction;
      params[1] = marketData.neutralMinValue;
      params[2] = marketData.neutralMaxValue;
      params[3] = marketData.startTime;
      params[4] = marketExpireTime();
      (params[5], params[6]) = getTotalAssetsStaked();
      params[7] = optionsAvailable[_prediction].assetStaked[ETH_ADDRESS];
      params[8] = optionsAvailable[_prediction].assetStaked[plotToken];
      params[9] = _predictionStake;
      params[10] = _leverage;
      bool checkMultiplier;
      if(!userData[msg.sender].multiplierApplied) {
        checkMultiplier = true;
      }
      (predictionPoints, isMultiplierApplied) = marketUtility.calculatePredictionValue(params, _asset, msg.sender, marketFeedAddress, checkMultiplier);
      
    }

    function getTotalAssetsStaked() public view returns(uint256 ethStaked, uint256 plotStaked) {
      for(uint256 i = 1; i<= totalOptions;i++) {
        ethStaked = ethStaked.add(optionsAvailable[i].assetStaked[ETH_ADDRESS]);
        plotStaked = plotStaked.add(optionsAvailable[i].assetStaked[plotToken]);
      }
    }

    /**
    * @dev Stores the prediction data.
    * @param _prediction The option on which user place prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _asset The asset used by user during prediction.
    * @param _leverage The leverage opted by user during prediction.
    * @param predictionPoints The positions user got during prediction.
    */
    function _storePredictionData(uint _prediction, uint _predictionStake, address _asset, uint _leverage, uint predictionPoints) internal {
      userData[msg.sender].predictionPoints[_prediction] = userData[msg.sender].predictionPoints[_prediction].add(predictionPoints);
      userData[msg.sender].assetStaked[_asset][_prediction] = userData[msg.sender].assetStaked[_asset][_prediction].add(_predictionStake);
      userData[msg.sender].LeverageAsset[_asset][_prediction] = userData[msg.sender].LeverageAsset[_asset][_prediction].add(_predictionStake.mul(_leverage));
      optionsAvailable[_prediction].predictionPoints = optionsAvailable[_prediction].predictionPoints.add(predictionPoints);
      optionsAvailable[_prediction].assetStaked[_asset] = optionsAvailable[_prediction].assetStaked[_asset].add(_predictionStake);
      optionsAvailable[_prediction].assetLeveraged[_asset] = optionsAvailable[_prediction].assetLeveraged[_asset].add(_predictionStake.mul(_leverage));
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function settleMarket() external {
      (uint256 _value, uint256 _roundId) = marketUtility.getSettlemetPrice(marketFeedAddress, uint256(marketSettleTime()));
      if(marketStatus() == PredictionStatus.InSettlement) {
        _postResult(_value, _roundId);
      }
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function _postResult(uint256 _value, uint256 _roundId) internal {
      require(now >= marketSettleTime(),"Time not reached");
      require(_value > 0,"value should be greater than 0");
      uint riskPercentage;
      ( , riskPercentage, , ) = marketUtility.getBasicMarketDetails();
      predictionStatus = PredictionStatus.Settled;
      if(marketStatus() != PredictionStatus.InDispute) {
        marketSettleData.settleTime = uint64(now);
      } else {
        delete marketSettleData.settleTime;
      }
      if(_value < marketData.neutralMinValue) {
        marketSettleData.WinningOption = 1;
      } else if(_value > marketData.neutralMaxValue) {
        marketSettleData.WinningOption = 3;
      } else {
        marketSettleData.WinningOption = 2;
      }
      uint[] memory totalReward = new uint256[](2);
      if(optionsAvailable[marketSettleData.WinningOption].assetStaked[ETH_ADDRESS] > 0 ||
        optionsAvailable[marketSettleData.WinningOption].assetStaked[plotToken] > 0
      ){
        for(uint i=1;i <= totalOptions;i++){
          if(i!=marketSettleData.WinningOption) {
            uint256 leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100);
            totalReward[0] = totalReward[0].add(leveragedAsset);
            leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100);
            totalReward[1] = totalReward[1].add(leveragedAsset);
          }
        }
        rewardToDistribute = totalReward;
      } else {
        for(uint i=1;i <= totalOptions;i++){
          uint256 leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100);
          tokenAmountToPool = tokenAmountToPool.add(leveragedAsset);
          leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100);
          ethAmountToPool = ethAmountToPool.add(leveragedAsset);
        }
      }
      _transferAsset(ETH_ADDRESS, address(marketRegistry), ethAmountToPool.add(ethCommissionAmount));
      _transferAsset(plotToken, address(marketRegistry), tokenAmountToPool.add(plotCommissionAmount));
      delete ethCommissionAmount;
      delete plotCommissionAmount;
      marketRegistry.callMarketResultEvent(rewardToDistribute, marketSettleData.WinningOption, _value, _roundId);
    }

    function _calculatePercentage(uint256 _percent, uint256 _value, uint256 _divisor) internal pure returns(uint256) {
      return _percent.mul(_value).div(_divisor);
    }

    /**
    * @dev Raise the dispute if wrong value passed at the time of market result declaration.
    * @param proposedValue The proposed value of market currency.
    * @param proposalTitle The title of proposal created by user.
    * @param description The description of dispute.
    * @param solutionHash The ipfs solution hash.
    */
    function raiseDispute(uint256 proposedValue, string memory proposalTitle, string memory description, string memory solutionHash) public {
      require(marketStatus() == PredictionStatus.Cooling);
      uint _stakeForDispute =  marketUtility.getDisputeResolutionParams();
      require(IToken(plotToken).transferFrom(msg.sender, address(marketRegistry), _stakeForDispute));
      lockedForDispute = true;
      marketRegistry.createGovernanceProposal(proposalTitle, description, solutionHash, abi.encode(address(this), proposedValue), _stakeForDispute, msg.sender, ethAmountToPool, tokenAmountToPool, proposedValue);
      delete ethAmountToPool;
      delete tokenAmountToPool;
      predictionStatus = PredictionStatus.InDispute;
    }

    /**
    * @dev Resolve the dispute
    * @param accepted Flag mentioning if dispute is accepted or not
    * @param finalResult The final correct value of market currency.
    */
    function resolveDispute(bool accepted, uint256 finalResult) external payable {
      require(msg.sender == address(marketRegistry) && marketStatus() == PredictionStatus.InDispute);
      if(accepted) {
        _postResult(finalResult, 0);
      }
      lockedForDispute = false;
      predictionStatus = PredictionStatus.Settled;
    }

    function sponsorIncentives(address _token, uint256 _value) external {
      require(marketRegistry.isWhitelistedSponsor(msg.sender));
      require(marketStatus() <= PredictionStatus.InSettlement);
      require(incentiveToken == address(0), "Already sponsored");
      incentiveToken = _token;
      incentiveToDistribute = _value;
      require(IToken(_token).transferFrom(msg.sender, address(this), _value));
    }


    /**
    * @dev Claim the return amount of the specified address.
    * @param _user The address to query the claim return amount of.
    * @return Flag, if 0:cannot claim, 1: Already Claimed, 2: Claimed
    */
    function claimReturn(address payable _user) public returns(uint256) {

      if(lockedForDispute || marketStatus() != PredictionStatus.Settled || marketRegistry.marketCreationPaused()) {
        return 0;
      }
      if(userData[_user].claimedReward) {
        return 1;
      }
      userData[_user].claimedReward = true;
      (uint[] memory _returnAmount, address[] memory _predictionAssets, uint _incentive, ) = getReturn(_user);
      _transferAsset(plotToken, _user, _returnAmount[0]);
      _transferAsset(ETH_ADDRESS, _user, _returnAmount[1]);
      _transferAsset(incentiveToken, _user, _incentive);
      marketRegistry.callClaimedEvent(_user, _returnAmount, _predictionAssets, _incentive, incentiveToken);
      return 2;
    }

    /**
    * @dev Transfer the assets to specified address.
    * @param _asset The asset transfer to the specific address.
    * @param _recipient The address to transfer the asset of
    * @param _amount The amount which is transfer.
    */
    function _transferAsset(address _asset, address payable _recipient, uint256 _amount) internal {
      if(_amount > 0) { 
        if(_asset == ETH_ADDRESS) {
          _recipient.transfer(_amount);
        } else {
          require(IToken(_asset).transfer(_recipient, _amount));
        }
      }
    }

    /**
    * @dev Get market settle time
    * @return the time at which the market result will be declared
    */
    function marketSettleTime() public view returns(uint64) {
      if(marketSettleData.settleTime > 0) {
        return marketSettleData.settleTime;
      }
      return uint64(marketData.startTime.add(marketData.predictionTime.mul(2)));
    }

    /**
    * @dev Get market expire time
    * @return the time upto which user can place predictions in market
    */
    function marketExpireTime() internal view returns(uint256) {
      return marketData.startTime.add(marketData.predictionTime);
    }

    /**
    * @dev Get market cooldown time
    * @return the time upto which user can raise the dispute after the market is settled
    */
    function marketCoolDownTime() public view returns(uint256) {
      return marketSettleData.settleTime.add(marketData.predictionTime.div(4));
    }

    /**
    * @dev Get market Feed data
    * @return market currency name
    * @return market currency feed address
    */
    function getMarketFeedData() public view returns(bytes32, address) {
      return (marketCurrency, marketFeedAddress);
    }

   /**
    * @dev Get estimated amount of prediction points for given inputs.
    * @param _prediction The option on which user place prediction.
    * @param _stakeValueInEth The amount staked by user.
    * @param _leverage The leverage opted by user at the time of prediction.
    * @return uint256 representing the prediction points.
    */
    function estimatePredictionValue(uint _prediction, uint _stakeValueInEth, uint _leverage) public view returns(uint _predictionValue){
      (_predictionValue, ) = calculatePredictionValue(_prediction, _stakeValueInEth, _leverage, ETH_ADDRESS);
    }

    /**
    * @dev Gets the price of specific option.
    * @param _prediction The option number to query the balance of.
    * @return Price of the option.
    */
    function getOptionPrice(uint _prediction) public view returns(uint) {
      uint[] memory params = new uint[](9);
      params[0] = _prediction;
      params[1] = marketData.neutralMinValue;
      params[2] = marketData.neutralMaxValue;
      params[3] = marketData.startTime;
      params[4] = marketExpireTime();
      (params[5], params[6]) = getTotalAssetsStaked();
      params[7] = optionsAvailable[_prediction].assetStaked[ETH_ADDRESS];
      params[8] = optionsAvailable[_prediction].assetStaked[plotToken];
      return marketUtility.calculateOptionPrice(params, marketFeedAddress);
    }

    /**
    * @dev Gets number of positions user got in prediction
    * @param _user Address of user
    * @param _option Option Id
    */
    function getUserPredictionPoints(address _user, uint256 _option) external view returns(uint256) {
      return userData[_user].predictionPoints[_option];
    }

    /**
    * @dev Gets the market data.
    * @return _marketCurrency bytes32 representing the currency or stock name of the market.
    * @return minvalue uint[] memory representing the minimum range of all the options of the market.
    * @return maxvalue uint[] memory representing the maximum range of all the options of the market.
    * @return _optionPrice uint[] memory representing the option price of each option ranges of the market.
    * @return _ethStaked uint[] memory representing the ether staked on each option ranges of the market.
    * @return _plotStaked uint[] memory representing the plot staked on each option ranges of the market.
    * @return _predictionTime uint representing the type of market.
    * @return _expireTime uint representing the time at which market closes for prediction
    * @return _predictionStatus uint representing the status of the market.
    */
    function getData() public view returns
       (bytes32 _marketCurrency,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice, uint[] memory _ethStaked, uint[] memory _plotStaked,uint _predictionTime,uint _expireTime, uint _predictionStatus){
        _marketCurrency = marketCurrency;
        _predictionTime = marketData.predictionTime;
        _expireTime =marketExpireTime();
        _predictionStatus = uint(marketStatus());
        minvalue = new uint[](totalOptions);
        minvalue[1] = marketData.neutralMinValue;
        minvalue[2] = marketData.neutralMaxValue.add(1);
        maxvalue = new uint[](totalOptions);
        maxvalue[0] = marketData.neutralMinValue.sub(1);
        maxvalue[1] = marketData.neutralMaxValue;
        maxvalue[2] = ~uint256(0);
        
        _optionPrice = new uint[](totalOptions);
        _ethStaked = new uint[](totalOptions);
        _plotStaked = new uint[](totalOptions);
        for (uint i = 0; i < totalOptions; i++) {
        _ethStaked[i] = optionsAvailable[i+1].assetStaked[ETH_ADDRESS];
        _plotStaked[i] = optionsAvailable[i+1].assetStaked[plotToken];
        _optionPrice[i] = getOptionPrice(i+1);
       }
    }

   /**
    * @dev Gets the result of the market.
    * @return uint256 representing the winning option of the market.
    * @return uint256 Value of market currently at the time closing market.
    * @return uint256 representing the positions of the winning option.
    * @return uint[] memory representing the reward to be distributed.
    * @return uint256 representing the Eth staked on winning option.
    * @return uint256 representing the PLOT staked on winning option.
    */
    function getMarketResults() public view returns(uint256, uint256, uint256[] memory, uint256, uint256) {
      return (marketSettleData.WinningOption, optionsAvailable[marketSettleData.WinningOption].predictionPoints, rewardToDistribute, optionsAvailable[marketSettleData.WinningOption].assetStaked[ETH_ADDRESS], optionsAvailable[marketSettleData.WinningOption].assetStaked[plotToken]);
    }


    /**
    * @dev Gets the return amount of the specified address.
    * @param _user The address to specify the return of
    * @return returnAmount uint[] memory representing the return amount.
    * @return incentive uint[] memory representing the amount incentive.
    * @return _incentiveTokens address[] memory representing the incentive tokens.
    */
    function getReturn(address _user)public view returns (uint[] memory returnAmount, address[] memory _predictionAssets, uint incentive, address _incentiveToken){
      (uint256 ethStaked, uint256 plotStaked) = getTotalAssetsStaked();
      if(marketStatus() != PredictionStatus.Settled || ethStaked.add(plotStaked) ==0) {
       return (returnAmount, _predictionAssets, incentive, incentiveToken);
      }
      _predictionAssets = new address[](2);
      _predictionAssets[0] = plotToken;
      _predictionAssets[1] = ETH_ADDRESS;

      uint256 _totalUserPredictionPoints = 0;
      uint256 _totalPredictionPoints = 0;
      (returnAmount, _totalUserPredictionPoints, _totalPredictionPoints) = _calculateUserReturn(_user);
      incentive = _calculateIncentives(_totalUserPredictionPoints, _totalPredictionPoints);
      if(userData[_user].predictionPoints[marketSettleData.WinningOption] > 0) {
        returnAmount = _addUserReward(_user, returnAmount);
      }
      return (returnAmount, _predictionAssets, incentive, incentiveToken);
    }

    /**
    * @dev Get flags set for user
    * @param _user User address
    * @return Flag defining if user had availed multiplier
    * @return Flag defining if user had predicted with bPLOT
    */
    function getUserFlags(address _user) external view returns(bool, bool) {
      return (userData[_user].multiplierApplied, userData[_user].predictedWithBlot);
    }

    /**
    * @dev Adds the reward in the total return of the specified address.
    * @param _user The address to specify the return of.
    * @param returnAmount The return amount.
    * @return uint[] memory representing the return amount after adding reward.
    */
    function _addUserReward(address _user, uint[] memory returnAmount) internal view returns(uint[] memory){
      uint reward;
      for(uint j = 0; j< returnAmount.length; j++) {
        reward = userData[_user].predictionPoints[marketSettleData.WinningOption].mul(rewardToDistribute[j]).div(optionsAvailable[marketSettleData.WinningOption].predictionPoints);
        returnAmount[j] = returnAmount[j].add(reward);
      }
      return returnAmount;
    }

    /**
    * @dev Calculate the return of the specified address.
    * @param _user The address to query the return of.
    * @return _return uint[] memory representing the return amount owned by the passed address.
    * @return _totalUserPredictionPoints uint representing the positions owned by the passed address.
    * @return _totalPredictionPoints uint representing the total positions of winners.
    */
    function _calculateUserReturn(address _user) internal view returns(uint[] memory _return, uint _totalUserPredictionPoints, uint _totalPredictionPoints){
      ( , uint riskPercentage, , ) = marketUtility.getBasicMarketDetails();
      _return = new uint256[](2);
      for(uint  i=1;i<=totalOptions;i++){
        _totalUserPredictionPoints = _totalUserPredictionPoints.add(userData[_user].predictionPoints[i]);
        _totalPredictionPoints = _totalPredictionPoints.add(optionsAvailable[i].predictionPoints);
        _return[0] =  _callReturn(_return[0], _user, i, riskPercentage, plotToken);
        _return[1] =  _callReturn(_return[1], _user, i, riskPercentage, ETH_ADDRESS);
      }
    }

    /**
    * @dev Calculates the incentives.
    * @param _totalUserPredictionPoints The positions of user.
    * @param _totalPredictionPoints The total positions of winners.
    * @return incentive the calculated incentive.
    */
    function _calculateIncentives(uint256 _totalUserPredictionPoints, uint256 _totalPredictionPoints) internal view returns(uint256 incentive){
      incentive = _totalUserPredictionPoints.mul(incentiveToDistribute.div(_totalPredictionPoints));
    }

    // /**
    // * @dev Gets the pending return.
    // * @param _user The address to specify the return of.
    // * @return uint representing the pending return amount.
    // */
    // function getPendingReturn(address _user) external view returns(uint[] memory returnAmount, address[] memory _predictionAssets, uint[] memory incentive, address[] memory _incentiveTokens){
    //   if(userClaimedReward[_user]) return (0,0);
    //   return getReturn(_user);
    // }
    
    /**
    * @dev Calls the total return amount internally.
    */
    function _callReturn(uint _return,address _user,uint i,uint riskPercentage, address _asset)internal view returns(uint){
      if(i == marketSettleData.WinningOption) {
        riskPercentage = 0;
      }
      uint256 leveragedAsset = _calculatePercentage(riskPercentage, userData[_user].LeverageAsset[_asset][i], 100);
      return _return.add(userData[_user].assetStaked[_asset][i].sub(leveragedAsset));
    }


    /**
    * @dev Gets the status of market.
    * @return PredictionStatus representing the status of market.
    */
    function marketStatus() internal view returns(PredictionStatus){
      if(predictionStatus == PredictionStatus.Live && now >= marketExpireTime()) {
        return PredictionStatus.InSettlement;
      } else if(predictionStatus == PredictionStatus.Settled && now <= marketCoolDownTime()) {
        return PredictionStatus.Cooling;
      }
      return predictionStatus;
    }

}
