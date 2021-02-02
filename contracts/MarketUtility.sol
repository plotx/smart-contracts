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
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IMarketRegistry.sol";
import "./interfaces/IChainLinkOracle.sol";
import "./interfaces/IToken.sol";

contract IAllMarkets {
  enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }
  function getMarketOptionPricingParams(uint _marketId, uint _option) public view returns(uint[] memory,uint32,address);
  function getMarketData(uint256 _marketId) external view returns
       (bytes32 _marketCurrency,uint neutralMinValue,uint neutralMaxValue, uint[] memory _tokenStaked,uint _predictionTime,uint _expireTime, PredictionStatus _predictionStatus);
}

contract MarketUtility is Governed {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    uint256 constant updatePeriod = 1 hours;

    uint256 internal minTimeElapsedDivisor;
    uint256 internal minPredictionAmount;
    uint256 internal maxPredictionAmount;
    uint256 internal positionDecimals;
    uint256 internal minStakeForMultiplier;
    uint256 internal riskPercentage;
    uint256 internal tokenStakeForDispute;
    bool public initialized;
    uint256 public stakingFactorMinStake;
    uint256 public stakingFactorWeightage;
    uint256 public currentPriceWeightage;


    mapping(address => uint256) public conversionRate;
    mapping(address => uint256) public userLevel;
    mapping(uint256 => uint256) public levelMultiplier;
    mapping (address => bool) internal authorizedAddresses;

    ITokenController internal tokenController;
    IAllMarkets internal allMarkets;
    modifier onlyAuthorized() {
        require(authorizedAddresses[msg.sender], "Not authorized");
        _;
    }

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
      OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      require(msg.sender == proxy.proxyOwner(),"not owner.");
      IMaster ms = IMaster(msg.sender);
      tokenController = ITokenController(ms.getLatestAddress("TC"));
      allMarkets = IAllMarkets(ms.getLatestAddress("AM"));
      masterAddress = msg.sender;
    }

    /**
     * @dev Initiates the config contact with initial values
     **/
    function initialize(address _initiater) public {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");
        require(!initialized, "Already initialized");
        initialized = true;
        _setInitialParameters();
        authorizedAddresses[_initiater] = true;
    }

    /**
    * @dev Function to set authorized address
    **/
    function addAuthorizedAddress(address _address) external onlyAuthorized {
        authorizedAddresses[_address] = true;
    }

    /**
    * @dev Function to check if given `_address` is  authorized address
    **/
    function isAuthorized(address _address) external view returns(bool) {
      return authorizedAddresses[_address];
    }

    /**
     * @dev Internal function to set initial value
     **/
    function _setInitialParameters() internal {
        minTimeElapsedDivisor = 6;
        minPredictionAmount = 10 ether;// need to change the value according to prediction token
        maxPredictionAmount = 100000 ether; // need to change the value according to prediction token
        positionDecimals = 1e2;
        minStakeForMultiplier = 5e17;
        riskPercentage = 20;
        tokenStakeForDispute = 500 ether;
        stakingFactorMinStake = 20000 ether;
        stakingFactorWeightage = 40;
        currentPriceWeightage = 60;
    }

    /**
    * @dev Check if user gets any multiplier on his positions
    * @param _user User address
    * @param predictionPoints The actual positions user got during prediction.
    * @return uint256 representing multiplied positions
    * @return bool returns true if multplier applied
    */
    function checkMultiplier(address _user, uint predictionPoints) public view returns(uint, bool) {
      bool multiplierApplied;
      uint _muliplier = 100;
      if(userLevel[_user] > 0) {
        _muliplier = _muliplier + levelMultiplier[userLevel[_user]];
        multiplierApplied = true;
      }
      return (predictionPoints.mul(_muliplier).div(100),multiplierApplied);
    }

    /**
     * @dev Updates integer parameters of config
     **/
    function updateUintParameters(bytes8 code, uint256 value)
        external
        onlyAuthorized
    {
        if (code == "MTED") { // Minimum time elapsed divisor
            minTimeElapsedDivisor = value;
        } else if (code == "MINPRD") { // Minimum predictionamount
            minPredictionAmount = value;
        } else if (code == "MAXPRD") { // Maximum predictionamount
            maxPredictionAmount = value;
        } else if (code == "PDEC") { // Position's Decimals
            positionDecimals = value;
        } else if (code == "MINSTM") { // Min stake required for applying multiplier
            minStakeForMultiplier = value;
        } else if (code == "RPERC") { // Risk percentage
            riskPercentage = value;
        } else if (code == "TSDISP") { // Amount of tokens to be staked for raising a dispute
            tokenStakeForDispute = value;
        } else if (code == "SFMS") { // Minimum amount of tokens to be staked for considering staking factor
            stakingFactorMinStake = value;
        } else if (code == "SFCPW") { // Staking Factor Weightage and Current Price weightage
            stakingFactorWeightage = value;
            currentPriceWeightage = uint(100).sub(value);
        }else {
            revert("Invalid code");
        }
    }
    
    /**
    * @dev Function to set `_asset` to PLOT token value conversion rate
    * @param _asset Token Address
    * @param _rate `_asset` to PLOT conversion rate
    */
    function setAssetPlotConversionRate(address _asset, uint256 _rate) public onlyAuthorized {
      conversionRate[_asset] = _rate;
    }

    /**
    * @dev Function to set `_user` level for prediction points multiplier
    * @param _user User address
    * @param _level user level indicator
    */
    function setUserLevel(address _user, uint256 _level) public onlyAuthorized {
      userLevel[_user] = _level;
    }

    /**
    * @dev Function to set multiplier per level (With 2 decimals)
    * @param _userLevels Array of levels
    * @param _multipliers Array of corresponding multipliers
    */
    function setMultiplierLevels(uint256[] memory _userLevels, uint256[] memory _multipliers) public onlyAuthorizedToGovern {
      require(_userLevels.length == _multipliers.length);
      for(uint256 i = 0; i < _userLevels.length; i++) {
        levelMultiplier[_userLevels[i]] = _multipliers[i];
      }
    }

    /**
    * @dev Get decimals of given price feed address 
    */
    function getPriceFeedDecimals(address _priceFeed) public view returns(uint8) {
      return IChainLinkOracle(_priceFeed).decimals();
    }

    /**
     * @dev Get basic market details
     * @return Minimum amount required to predict in market
     * @return Percentage of users leveraged amount to deduct when placed in wrong prediction
     * @return Decimal points for prediction positions
     * @return Maximum prediction amount
     **/
    function getBasicMarketDetails()
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (minPredictionAmount, riskPercentage, positionDecimals, maxPredictionAmount);
    }

    /**
     * @dev Get Parameter required for option price calculation
     * @param _marketFeedAddress  Feed Address of currency on which market options are based on
     * @return Stake weightage percentage for calculation option price
     * @return minimum amount of stake required to consider stake weightage
     * @return Current price of the market currency
     * @return Divisor to calculate minimum time elapsed for a market type
     **/
    function getPriceCalculationParams(
        address _marketFeedAddress
    )
        public
        view
        returns (
            uint256,
            uint256
        )
    {
        uint256 _currencyPrice = getAssetPriceUSD(
            _marketFeedAddress
        );
        return (
            _currencyPrice,
            minTimeElapsedDivisor
        );
    }

    /**
     * @dev Get price of provided feed address
     * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
     * @return Current price of the market currency
     **/
    function getAssetPriceUSD(
        address _currencyFeedAddress
    ) public view returns (uint256 latestAnswer) {
        return uint256(IChainLinkOracle(_currencyFeedAddress).latestAnswer());
    }

    /**
     * @dev Get price of provided feed address
     * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
     * @return Current price of the market currency
     **/
    function getSettlemetPrice(
        address _currencyFeedAddress,
        uint256 _settleTime
    ) public view returns (uint256 latestAnswer, uint256 roundId) {
        uint80 currentRoundId;
        uint256 currentRoundTime;
        int256 currentRoundAnswer;
        (currentRoundId, currentRoundAnswer, , currentRoundTime, )= IChainLinkOracle(_currencyFeedAddress).latestRoundData();
        while(currentRoundTime > _settleTime) {
            currentRoundId--;
            (currentRoundId, currentRoundAnswer, , currentRoundTime, )= IChainLinkOracle(_currencyFeedAddress).getRoundData(currentRoundId);
            if(currentRoundTime <= _settleTime) {
                break;
            }
        }
        return
            (uint256(currentRoundAnswer), currentRoundId);
    }

    /**
     * @dev Get amount of stake required to raise a dispute
     **/
    function getDisputeResolutionParams() public view returns (uint256) {
        return tokenStakeForDispute;
    }

    function calculateOptionRange(uint _optionRangePerc, uint64 _decimals, uint8 _roundOfToNearest, address _marketFeed) external view returns(uint64 _minValue, uint64 _maxValue) {
      uint currentPrice = getAssetPriceUSD(_marketFeed);
      uint optionRangePerc = currentPrice.mul(_optionRangePerc.div(2)).div(10000);
      _minValue = uint64((ceil(currentPrice.sub(optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      _maxValue = uint64((ceil(currentPrice.add(optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
    }

    function calculatePredictionPoints(uint _marketId, uint256 _prediction, address _user, bool multiplierApplied, uint _predictionStake) external view returns(uint64 predictionPoints, bool isMultiplierApplied) {
      uint _stakeValue = _predictionStake.mul(1e10);
      if(_stakeValue < minPredictionAmount || _stakeValue > maxPredictionAmount) {
        return (0, isMultiplierApplied);
      }
      uint64 _optionPrice = getOptionPrice(_marketId, _prediction);
      predictionPoints = uint64(_stakeValue.mul(1e8)).div(_optionPrice);
      if(!multiplierApplied) {
        uint256 _predictionPoints;
        (_predictionPoints, isMultiplierApplied) = checkMultiplier(_user,  predictionPoints);
        predictionPoints = uint64(_predictionPoints);
      }
    }

    function getAllOptionPrices(uint _marketId) external view returns(uint64[] memory _optionPrices) {
      _optionPrices = new uint64[](3);
      for(uint i=0;i<3;i++) {

        _optionPrices[i] = getOptionPrice(_marketId,i+1);
      }

    }

    function getOptionPrice(uint _marketId, uint256 _prediction) public view returns(uint64) {
      (uint[] memory _optionPricingParams, uint32 startTime, address _feedAddress) = allMarkets.getMarketOptionPricingParams(_marketId,_prediction);
      uint stakingFactorConst;
      if(_optionPricingParams[1] > _optionPricingParams[2])
      {
        stakingFactorConst = uint(10000).mul(10**18).div(_optionPricingParams[1].mul(_optionPricingParams[3]));
      }
      (, , , , uint totalTime, , ) = allMarkets.getMarketData(_marketId);
      uint timeElapsed = uint(now).sub(startTime);
      if(timeElapsed<_optionPricingParams[5]) {
        timeElapsed = _optionPricingParams[5];
      }
      uint timeFactor = timeElapsed.mul(10000).div(_optionPricingParams[4].mul(totalTime)); 
      uint[] memory _distanceData = getOptionDistanceData(_marketId,_prediction, _feedAddress);

      uint optionPrice = _optionPricingParams[0].mul(stakingFactorConst).mul((_distanceData[0]).add(1)).add((_distanceData[1].add(1)).mul(timeFactor).mul(10**18));
      optionPrice = optionPrice.div(stakingFactorConst.mul(_optionPricingParams[1]).mul(_distanceData[0].add(1)).add((_distanceData[2].add(3)).mul(timeFactor)));

      return uint64(optionPrice);

    }

    function getOptionDistanceData(uint _marketId,uint _prediction, address _feedAddress) internal view returns(uint[] memory) {
      (, uint minVal, uint maxVal , , , , ) = allMarkets.getMarketData(_marketId);
      // [0]--> max Distance+1, 
      // [1]--> option distance + 1, 
      // [2]--> optionDistance1+1+optionDistance2+1+optionDistance3+1
      uint[] memory _distanceData = new uint256[](3); 
      
      uint currentPrice = getAssetPriceUSD(
            _feedAddress
        );
      _distanceData[0] = 2;
      uint currentOption;
      _distanceData[2] = 3;
      if(currentPrice < minVal)
      {
        currentOption = 1;
      } else if(currentPrice > maxVal) {
        currentOption = 3;
      } else {
        currentOption = 2;
        _distanceData[0] = 1;
        _distanceData[2] = 1;
      }
        _distanceData[1] = _distanceData[0].sub(modDiff(currentOption,_prediction)); // option distance + 1
      return _distanceData;
    }

    function modDiff(uint a, uint b) internal pure returns(uint) {
      if(a>b)
      {
        return a.sub(b);
      } else {
        return b.sub(a);
      }
    }

    function ceil(uint256 a, uint256 m) internal pure returns (uint256) {
        return ((a + m - 1) / m) * m;
    }
}
