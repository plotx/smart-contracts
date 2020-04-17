import "./external/oraclize/ethereum-api/usingOraclize.sol";


contract TestOraclize is usingOraclize {

	uint public oraclizeResult;

	function sendOraclizeCall(uint callTime) public {
    	_oraclizeQuery(now + callTime, "json(https://financialmodelingprep.com/api/v3/majors-indexes/.DJI).price", "", 0);

	}

	function _oraclizeQuery(
        uint timestamp,
        string memory datasource,
        string memory arg,
        uint gasLimit
    ) 
        internal
        returns (bytes32 id)
    {
        id = oraclize_query(timestamp, datasource, arg, gasLimit);
    }

    function __callback(bytes32 myid, string memory result) public {
        oraclizeResult = parseInt(result);
    }
}