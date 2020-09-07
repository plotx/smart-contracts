pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/token/ERC20/SafeERC20.sol";
import "./external/openzeppelin-solidity/utils/ReentrancyGuard.sol";

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with USDC/USDT. This contract implements
 * such functionality in its most fundamental form and can be extended to provide additional
 * functionality and/or custom behavior.
 * The external interface represents the basic interface for purchasing tokens, and conforms
 * the base architecture for crowdsales. It is *not* intended to be modified / overridden.
 * The internal interface conforms the extensible and modifiable surface of crowdsales. Override
 * the methods to add functionality. Consider using 'super' where appropriate to concatenate
 * behavior.
 */
contract Crowdsale is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // The token being sold
    IERC20 private _token;

    // Address where funds are collected
    address payable private _wallet;

    // Max spending amount allowed 
    uint private _spendingLimitPreSale;

    uint private _spendingLimitPublicSale;

    // How many token units a buyer gets per wei.
    // The rate is the conversion between wei and the smallest and indivisible token unit.
    // So, if you are using a rate of 1 with a ERC20Detailed token with 3 decimals called TOK
    // 1 wei will give you 1 unit, or 0.001 TOK.
    uint256 private _startRate; 

    uint256 private _slope;

    // Amount of Tokens sold
    uint256 private _tokenSold;

    uint256 private _startTime;

    uint256 public _preSaleStartTime;

    uint256 public _preSaleEndTime;

    uint256 private _endTime;

    // Authorised address to whitelist
    address private _authorisedToWhitelist;

    uint256 private _maxTokensToSold;

    // USDC Token
    IERC20 private _tokenUSDC;
    // USDT Token
    IERC20 private _tokenUSDT;

    // Tells if user is whitlisted or not.
    mapping(address => uint) public whitelisted;

    // Maintains amount spent by user.
    mapping(address => uint) public userSpentSoFar;

    /**
     * Event raised when user is whitelisted.
     * @param _user address of user.
     * @param _time time when user is whitelisted.
     */
    event UserWhitelisted(address indexed _user, uint _type, uint _time);

    /**
     * Event raised when user is removed from whitelisted.
     * @param _user address of user.
     * @param _time time when user is whitelisted.
     */
    event UserBlacklisted(address indexed _user, uint _time);

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /**
    * @param authorisedToWhitelist authorised address who can whitelist
     * @param wallet Address where collected funds will be forwarded to
     * @param token Address of the token being sold
     * @param tokenUSDC Address of the USDC token
     * @param tokenUSDT Address of the USDT token
     */
    constructor (address authorisedToWhitelist, address payable wallet, IERC20 token, IERC20 tokenUSDC, IERC20 tokenUSDT, uint256 startTime, uint256 endTime, uint256 preSaleStartTime, uint256 preSaleEndTime) public {
        require(authorisedToWhitelist != address(0), "Crowdsale: Authorised address is the zero address");
        require(wallet != address(0), "Crowdsale: wallet is the zero address");
        require(address(token) != address(0), "Crowdsale: token is the zero address");
        require(address(tokenUSDC) != address(0), "USDC token is the zero address");
        require(address(tokenUSDT) != address(0), "USDT token is the zero address");

        _authorisedToWhitelist = authorisedToWhitelist;
        _tokenUSDC = tokenUSDC; 
        _tokenUSDT = tokenUSDT;
        _wallet = wallet;
        _token = token;
        _spendingLimitPublicSale = uint(10000).mul(10 ** 18);
        _spendingLimitPreSale = uint(1000).mul(10 ** 18);
        _startRate = uint(7).mul(10 ** 16); 
        _slope = 4000000000;
        _maxTokensToSold = uint256(5000000).mul(10 ** 18);
        _startTime = startTime;
        _endTime = endTime;
        _preSaleStartTime = preSaleStartTime;
        _preSaleEndTime = preSaleEndTime;
    }

    /**
     * @return the token being sold.
     */
    function token() public view returns (IERC20) {
        return _token;
    }

    /**
     * @return the address where funds are collected.
     */
    function wallet() public view returns (address payable) {
        return _wallet;
    }

    /**
     * @return the USDC token.
     */
    function tokenUSDC() public view returns (IERC20) {
        return _tokenUSDC;
    }

    /**
     * @return the USDT token.
     */
    function tokenUSDT() public view returns (IERC20) {
        return _tokenUSDT;
    }

    /**
     * @return the amount of USDC + USDT raised.
     */
    function tokenSold() public view returns (uint256) {
        return _tokenSold;
    }

    /**
     * @return the amount of USDC + USDT raised.
     */
    function slope() public view returns (uint256) {
        return _slope;
    }

    /**
     * @return the amount of USDC + USDT raised.
     */
    function startRate() public view returns (uint256) {
        return _startRate;
    }

    /**
     * @return the max amount user an spend (in usd).
     */
    function spendingLimitPublicSale() public view returns (uint256) {
        return _spendingLimitPublicSale;
    }
    
    function authorisedToWhitelist() public view returns (address) {
        return _authorisedToWhitelist;
    }

    function saleType() public view returns (uint) {
        if(_preSaleStartTime<= now && _preSaleEndTime >= now)
        {
            return 1;
        } 
        if(_startTime<= now && _endTime >= now)
        {
            return 2;
        }

        return 3;
    }

    /**
     * @dev This function is used to add users into whitelist by authorised address.
     * @param _user address of user.
     */
    function addUserToWhiteList(address _user, uint _type) external {
        require(msg.sender == _authorisedToWhitelist, "Not authorised to whitelist");
        whitelisted[_user] = _type;
        emit UserWhitelisted(_user, _type, now);
    }

    /**
     * @dev This function is used to remove users from whitelist by authorised address.
     * @param _user address of user.
     */
    function removeUserFromWhiteList(address _user) external {
        require(msg.sender == _authorisedToWhitelist, "Not authorised to whitelist");
        whitelisted[_user] = 0;
        emit UserBlacklisted(_user, now);
    }

    /**
     * @dev low level token purchase ***DO NOT OVERRIDE***
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     * @param beneficiary Recipient of the token purchase
     * @param spendingAmount amount user want to spend.
     * @param spendingAsset asset user want to spend.
     */
    function buyTokens(address beneficiary, uint spendingAmount, IERC20 spendingAsset) public nonReentrant {
        
        uint saleType = saleType();
        uint256 _amount = spendingAmount;
        _preValidatePurchase(beneficiary, _amount, spendingAsset, saleType);

        require(spendingAsset.transferFrom(msg.sender, address(this), _amount), "Tranfer failed");

        

        // calculate token amount to be created
        (uint256 tokens, uint usdToReturn) = _getTokenAmount(_amount, saleType);

        _processPurchase(beneficiary, tokens, spendingAsset, usdToReturn);
        emit TokensPurchased(msg.sender, beneficiary, _amount, tokens);

        _updatePurchasingState(beneficiary, _amount, tokens);
        _forwardFunds();
        _postValidatePurchase(beneficiary, _amount);
    }

    /// @dev Will forward funds to wallet if funds are stuck.
    function forwardFunds() external {
        _forwardFunds();
    }

    function transferLeftOverTokens() external {
        require(_endTime !=0 && now > _endTime, "Sale has not ended yet");
        _token.safeTransfer(_wallet, _token.balanceOf(address(this)));
    }

    /**
     * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
     * Use `super` in contracts that inherit from Crowdsale to extend their validations.
     * Example from CappedCrowdsale.sol's _preValidatePurchase method:
     *     super._preValidatePurchase(beneficiary, weiAmount);
     *     require(weiRaised().add(weiAmount) <= cap);
     * @param beneficiary Address performing the token purchase
     * @param amount Value in (USDC/USDT) involved in the purchase
     * @param spendingAsset Asset user want to spend
     */
    function _preValidatePurchase(address beneficiary, uint256 amount, IERC20 spendingAsset, uint saleType) internal view {
        require(saleType == 1 || saleType == 2, "Sale is not active");
        require(spendingAsset == _tokenUSDC || spendingAsset == _tokenUSDT, "Only USDC & USDT are allowed");
        require(amount != 0, "Crowdsale: amount is 0");
        require(beneficiary != address(0), "beneficiary is the zero address");
        if(saleType == 1) {

            require(whitelisted[beneficiary] == 1, "Not whitelisted");
            require(userSpentSoFar[beneficiary].add(amount) <= _spendingLimitPreSale, "Spending limit exceeds");
        }

        if(saleType == 2) {

            require(whitelisted[beneficiary] > 0, "Not whitelisted");
            require(userSpentSoFar[beneficiary].add(amount) <= _spendingLimitPublicSale, "Spending limit exceeds");
        }
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
    }

    /**
     * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
     * conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param amount Value in (USDC/USDT) involved in the purchase
     */
    function _postValidatePurchase(address beneficiary, uint256 amount) internal view {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Executed when a purchase has been validated and is ready to be executed. Doesn't necessarily emit/send
     * tokens.
     * @param beneficiary Address receiving the tokens
     * @param tokenAmount Number of tokens to be purchased
     */
    function _processPurchase(address beneficiary, uint256 tokenAmount, IERC20 spendingAsset, uint256 returnAmount) internal {
        
        _token.safeTransfer(beneficiary, tokenAmount);
        spendingAsset.safeTransfer(msg.sender, returnAmount);

    }

    /**
     * @dev Override for extensions that require an internal state to check for validity (current user contributions,
     * etc.)
     * @param beneficiary Address receiving the tokens
     * @param amount Value in (USDC/USDT) involved in the purchase
     */
    function _updatePurchasingState(address beneficiary, uint256 amount, uint256 tokensPurchased) internal {
        userSpentSoFar[beneficiary] = userSpentSoFar[beneficiary].add(amount);
        _tokenSold = _tokenSold.add(tokensPurchased);
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param amount Value in (USDC/USDT) involved in the purchase
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 amount, uint saleType) public view returns (uint256, uint256) {

        if(saleType == 1)
        {
            return (amount.mul(10**18).div(_startRate), 0);
        }
        uint tokenRate = (_slope.mul(_tokenSold).div(10**18)).add(_startRate);
        uint tokenToSell = amount.mul(10 ** 18).div(tokenRate);
        uint usdToReturn = 0;
        if(_tokenSold.add(tokenToSell) > _maxTokensToSold)
        {
            tokenToSell = _maxTokensToSold.sub(_tokenSold);
            uint usdRate = tokenToSell.mul(tokenRate).div(10 ** 18);
            usdToReturn = amount.sub(usdRate);
        }
        return (tokenToSell, usdToReturn);
    }

    /**
     * @dev Forwards entire USDC & USDT available in contract to `_wallet`.
     */
    function _forwardFunds() internal {
        uint balanceUSDC = _tokenUSDC.balanceOf(address(this));
        uint balanceUSDT = _tokenUSDT.balanceOf(address(this));
        if(balanceUSDC > 0) {

            require(_tokenUSDC.transfer(_wallet, balanceUSDC), "Transfer failed for USDC funds");
        }

        if(balanceUSDT > 0) {

            require(_tokenUSDT.transfer(_wallet, balanceUSDT), "Transfer failed for USDT funds");
        }
    }
}