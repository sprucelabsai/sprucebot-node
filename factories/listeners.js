const glob = require('glob')
const path = require('path')
const { camelCase } = require('lodash')

module.exports = (dir, router) => {
	const matches = glob.sync(path.join(dir, '/**/*.js'))
	return matches.reduce((ctx, match) => {
		const m = require(match)
		const eventName = camelCase(
			match
				.split('/events/')
				.pop()
				.split('.')
				.shift()
		)

		ctx[eventName] = require(match)

		return ctx
	}, {})
}
