module.exports = {
	/**
     * Takes an object and turns it into a query string. Keys and values. No depth, can't handle arrays
     * @param {Object} obj Any vanilla object with keys and values
     * @returns {String}
     */
	serialize: function(obj) {
		var str = []
		for (var p in obj)
			if (obj.hasOwnProperty(p)) {
				str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
			}
		return str.join('&')
	},

	/**
     * Builds the path to the endpoint off all the crutial tidbits
     */
	build: function(path, query, version, skillId) {
		// build url with query and make sure there are no double /
		let pathWithQuery = `/api/${version}/skills/${skillId}/${path}`
			.replace(/\/\//g, '/')
			.replace(/\/$/, '')

		// Construct URL using the query
		pathWithQuery += pathWithQuery.search(/\?/) === -1 ? '?' : '&'
		if (query) {
			pathWithQuery += '&' + this.serialize(query)
		}

		return pathWithQuery
	}
}
