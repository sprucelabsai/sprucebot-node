const context = require('./factories/context')
const routes = require('./factories/routes')
const wares = require('./factories/wares')
const Https = require('./https')

class Sprucebot {
	constructor({
		apiKey,
		skillId,
		host,
		name,
		description,
		webhookUrl,
		svgIcon,
		allowSelfSignedCerts = false
	}) {
		if (
			!apiKey ||
			!skillId ||
			!host ||
			!name ||
			!description ||
			!webhookUrl ||
			!svgIcon
		) {
			throw new Error(
				'You are missing some params! Make sure you pass the following: apiKey, skillId, host, name, description, webhookUrl, & svgIcon.'
			)
		}

		// Setup http(s) class with everything it needs to talk to api
		this.name = name
		this.description = description
		this.icon = svgIcon
		this.webhookUrl = webhookUrl + '/hook'
		this.iframeUrl = webhookUrl
		this.marketingUrl = webhookUrl + '/marketing'

		this.version = '1.0'
		this.https = new Https({
			host,
			apiKey,
			skillId,
			version: this.version,
			allowSelfSignedCerts
		})

		console.log(
			`🌲 Sprucebot🌲 Skills Kit API ${this
				.version}\n\napiKey : ${apiKey}, \nhost : ${host}, \nskillId : ${skillId} \nname : ${name}\n---------------------------------`
		)

		// Setup skillskit helpers
		this.skillskit = {
			factories: {
				context,
				routes,
				wares
			}
		}
	}

	/**
	 * Sync the settings saved here with specified host (including name,)
	 */
	async sync() {
		const data = {
			name: this.name,
			description: this.description,
			icon: this.icon,
			webhookUrl: this.webhookUrl,
			iframeUrl: this.iframeUrl,
			marketingUrl: this.marketingUrl
		}
		return this.https.patch('/', data)
	}

	/**
	 * Fetch a user based on their id and location
	 *
	 * @param {String} userId
	 * @param {String} locationId
	 * @param {Object} query Optional query string to be added onto request
	 * @returns {Promise}
	 */
	async user(locationId, userId, query) {
		return this.https.get(`/locations/${locationId}/users/${userId}`, query)
	}

	/**
	 * Search for users who have been to this location
	 *
	 * @param {String} locationId
	 * @param {Object} query
	 * @returns {Promise}
	 */
	async users(locationId, { role, status, page, limit } = {}) {
		return this.https.get(
			`/locations/${locationId}/users/`,
			Array.from(arguments)[1]
		)
	}

	/**
	 * Get a location by id
	 *
	 * @param {String} locationId
	 * @param {Object} query
	 * @returns {Promise}
	 */
	async location(locationId, query) {
		return this.https.get(`/locations/${locationId}`, query)
	}

	/**
	 * Fetch all locations where this skill is installed
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 */
	async locations({ page, limit } = {}) {
		return this.https.get('/locations', Array.from(arguments)[0])
	}

	/**
	 * Send a message to a user.
	 *
	 * @param {String} locationId
	 * @param {String} userId
	 * @param {String} message
	 * @param {Object} data Additional data sent when POST'ing message
	 */
	async message(
		locationId,
		userId,
		message,
		{ linksToWebView, webViewQueryData } = {},
		query = {}
	) {
		const data = Array.from(arguments)[3]
		data.userId = userId
		data.message = message
		return this.https.post(`/locations/${locationId}/messages`, data, query)
	}

	/**
	 * Get a bunch of meta data at once
	 *
	 * @param {Object} query
	 * @param {Boolean} suppressErrors
	 */
	async metas(
		{ key, locationId, userId, sortBy, limit } = {},
		suppressParseErrors = true
	) {
		// Get results as an array where values are JSON strings
		const metas = await this.https.get('/data', Array.from(arguments)[0])

		metas.forEach(meta => {
			try {
				meta.value = JSON.parse(meta.value)
			} catch (err) {
				if (suppressParseErrors) {
					console.error('Failed to parse JSON value for meta.', err)
				} else {
					throw err
				}
			}
		})

		return metas
	}

	/**
	 * Get one meta object back.
	 *
	 * @param {String} key
	 * @param {Object} query
	 * @param {Boolean} suppressParseErrors
	 */
	async meta(key, { locationId, userId } = {}, suppressParseErrors = true) {
		const args = Array.from(arguments)
		const query = args[1] || {}
		query.key = key
		query.limit = 1
		const metas = await this.metas(query)
		return metas[0]
	}

	/**
	 * Create a meta data record.
	 *
	 * @param {String} key
	 * @param {*} value
	 * @param {Object} data
	 */
	async createMeta(key, value, { locationId, userId } = {}) {
		const data = {
			...(Array.from(arguments)[2] || {}),
			key,
			value: value ? JSON.stringify(value) : value
		}

		const meta = await this.https.post('/data', data)
		meta.value = JSON.parse(meta.value)
		return meta
	}

	/**
	 * Update some meta data by id
	 * 
	 * @param {String} id 
	 * @param {Object} data 
	 */
	async updateMeta(id, { key, value, locationId, userId }) {
		const data = {
			...(Array.from(arguments)[1] || {})
		}

		if (value) {
			data.value = JSON.stringify(value)
		}

		const meta = await this.https.patch(`/data/${id}`, data)
		meta.value = JSON.parse(meta.value)
		return meta
	}

	/**
	 * Fetch some meta. Create it if it does not exist
	 *
	 * @param {String} key
	 * @param {Object} query
	 * @param {Boolean} suppressParseErrors
	 */
	async metaOrCreate(
		key,
		value,
		{ locationId, userId } = {},
		suppressParseErrors = true
	) {
		let meta = await this.meta(
			key,
			Array.from(arguments)[2],
			suppressParseErrors
		)

		// not found, create it
		if (!meta) {
			meta = await this.createMeta(key, value, Array.from(arguments)[2])
		} else if (JSON.stringify(meta.value) != JSON.stringify(value)) {
			//found, but value has changed
			meta = await this.updateMeta(meta.id, { value: value })
		}
		return meta
	}

	/**
	 * Delete meta data by id
	 *
	 * @param {String} id
	 */
	async deleteMeta(id) {
		return this.https.delete(`/data/${id}`)
	}
}

module.exports = Sprucebot
