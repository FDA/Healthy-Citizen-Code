const Helpers = {
	excludeListUser: [
	  '__v'
	  , 'salt'
	  , 'password'
	]
	, excludeListPhi: [
	  '__v'
	  , 'salt'
	  , 'password'
	]
	, excludeListPii: [
	  '__v'
	  , 'salt'
	  , 'password'
	]
	, objectNormalize: (obj, excludeList) => {
		excludeList.forEach(function(el){
			delete obj[el];
		});
		return obj;
	}
}

module.exports = Helpers;
