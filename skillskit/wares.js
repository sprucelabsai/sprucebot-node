const glob = require('glob')
const path = require('path')

module.exports = dir => {
	const matches = glob.sync(path.join(dir, '/**/*.js'))
	let wares = []
	matches.forEach(match => {
		const m = require(match)
		wares.push(m)
	})
	return wares
}
