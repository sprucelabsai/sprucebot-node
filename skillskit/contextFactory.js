const glob = require('glob')
const path = require('path')

module.exports = (dir, key, ctx) => {
	if (!ctx[key]) {
		ctx[key] = {}
	}
	const matches = glob.sync(path.join(dir, '/**/*.js'))
	matches.forEach(match => {
		const m = require(match)
		const filename = path.basename(match, path.extname(match))
		ctx[key][filename] = m
	})
}
