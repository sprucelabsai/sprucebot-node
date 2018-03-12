const Https = require('./https')

/**
 * Politely tell someone they didn't define an arg
 * @param {string} name
 */
function required(name) {
	throw new Error(
		`You are missing some params! Make sure you set ${name} properly (maybe .env) 🤷🏼‍`
	)
}

class Sprucebot {
	constructor({
		apiKey = required('apiKey'),
		id = required('id'),
		host = required('host'),
		name = required('name'),
		description = required('description'),
		interfaceUrl = required('interfaceUrl'),
		serverUrl = required('serverUrl'),
		svgIcon = required('svgIcon'),
		allowSelfSignedCerts = false,
		dbEnabled = false
	}) {
		const hostMatches = host.match(/^(https?\:\/\/|)([^\/:?#]+)(?:[\/:?#]|$)/i)
		const cleanedHost =
			hostMatches && hostMatches[2] ? hostMatches[2] : required('host')

		this.name = name || required('name')
		this.description = description || required('description')
		this.icon = svgIcon || required('svgIcon')
		this.webhookUrl = (serverUrl || required('serverUrl')) + '/hook.json'
		this.iframeUrl = interfaceUrl || required('interfaceUrl')
		this.marketingUrl =
			(interfaceUrl || required('interfaceUrl')) + '/marketing'

		this.dbEnabled = dbEnabled
		this._mutexes = {}

		this.version = '1.0' // maybe pull from package.json?

		// Setup http(s) class with everything it needs to talk to api
		this.https = new Https({
			host: cleanedHost,
			apiKey,
			id,
			version: this.version,
			allowSelfSignedCerts
		})

		console.log(
			`🌲 Sprucebot🌲 Skills Kit API ${this
				.version}\n\nhost : ${cleanedHost} \nid : ${id} \napiKey : ${apiKey.replace(
				/./g,
				'*'
			)} \nname : ${name}\n---------------------------------`
		)
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
		const results = await this.https.patch('/', data)
		let database = null
		if (this.dbEnabled) {
			database = await this.provisionDatabase()
		}

		return { ...results, database }
	}

	async provisionDatabase() {
		return this.https.get('/database/provision')
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
	 * Get a user without a location. GLOBAL SKILLS ONLY
	 * 
	 * @param {String} userId 
	 * @param {Object} Optional query string to be added to the request
	 */
	async globalUser(userId, query) {
		return this.https.get(`/users/${userId}`, query)
	}

	/**
	 * Get all locations. GLOBAL SKILLS ONLY
	 * 
	 * @param {Object} Optional query string to be added to the request
	 */
	async globalLocations(query) {
		return this.https.get(`/ge/locations`, query)
	}

	/**
     * Create a user
     *
     * @param {Object} values
     * @returns {Promise}
     */
	async createUser(values) {
		return this.https.post('/ge/users', values)
	}

	/**
     * Update a users role
     *
     * @param {String} locationId
     * @param {String} userId
     * @param {String} role
     * @returns {Promise}
     */
	async updateRole(locationId, userId, role) {
		return this.https.patch(
			`/ge/locations/${locationId}/users/${userId}/${role}`
		)
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
	 * Update for user who have been to this location
	 *
	 * @param {String} id
	 * @param {Object} values
	 * @returns {Promise}
	 */
	async updateUser(id, values) {
		return this.https.patch('/users/' + id, values)
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
		{ linksToWebView, webViewQueryData, payload } = {},
		query = {}
	) {
		const data = Array.from(arguments)[3] || {}
		data.userId = userId
		data.message = message
		if (data.webViewQueryData) {
			data.webViewQueryData = JSON.stringify(data.webViewQueryData)
		}
		return this.https.post(`/locations/${locationId}/messages`, data, query)
	}

	/**
	 * ONLY APPLIES TO SKILLS THAT ARE GLOBAL (are not attached to a location).  
	 * This allows Sprucebot to communicate to business owners without them 
	 * actually needing any skills enabled. Core usage only. 
	 * 
	 * @param {String} userId 
	 * @param {String} message 
	 */
	async globalMessage(userId, message) {
		return this.https.post('/messages', { userId, message })
	}

	/**
	 * Get a bunch of meta data at once
	 *
	 * @param {Object} query
	 * @param {Boolean} suppressErrors
	 */
	async metas(
		{
			key,
			locationId,
			userId,
			createdAt,
			updatedAt,
			sortBy,
			order,
			limit,
			value
		} = {},
		suppressParseErrors = true
	) {
		const query = { ...(Array.from(arguments)[0] || {}) }
		if (query.value) {
			query.value = JSON.stringify(query.value)
		}
		if (query.userId) {
			query.userId = JSON.stringify(query.userId)
		}

		if (query.locationId) {
			query.locationId = JSON.stringify(query.locationId)
		}
		if (query.createdAt) {
			query.createdAt = JSON.stringify(query.createdAt)
		}
		if (query.updatedAt) {
			query.updatedAt = JSON.stringify(query.updatedAt)
		}
		return this.https.get('/data', query)
	}

	/**
	 * Get one meta object back.
	 *
	 * @param {String} key
	 * @param {Object} query
	 * @param {Boolean} suppressParseErrors
	 */
	async meta(
		key,
		{ locationId, userId, value, sortBy, order } = {},
		suppressParseErrors = true
	) {
		const args = Array.from(arguments)
		const query = { ...(args[1] || {}) }
		query.key = key
		query.limit = 1
		const metas = await this.metas(query)
		return metas[0]
	}

	/**
	 * Get skill meta data by id
	 * 
	 * @param {String} id 
	 */
	async metaById(id, { locationId, userId } = {}) {
		return this.https.get(`/data/${id}`, Array.from(arguments)[1])
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
			value
		}

		const meta = await this.https.post('/data', data)
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

		const meta = await this.https.patch(`/data/${id}`, data)
		return meta
	}

	/**
	 * Fetch some meta. Create it if it does not exist
	 *
	 * @param {String} key
	 * @param {*} value
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
		}
		return meta
	}
	/**
	 * Creates a meta if it does not exist, updates it if it does
	 * @param {String} key
	 * @param {*} value
	 * @param {Object} query
	 * @param {Boolean} suppressParseErrors
	 */
	async upsertMeta(
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
		} else if (JSON.stringify(meta.value) !== JSON.stringify(value)) {
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

	/**
	 * Emit a custom event. The response is the response from all skills
	 *
	 * @param {String} name
	 * @param {Object} payload
	 */
	async emit(locationId, eventName, payload = {}) {
		return this.https.post(`locations/${locationId}/emit`, {
			eventName,
			payload
		})
	}

	/**
	 * To stop race conditions, you can have requests wait before starting the next.
	 *
	 * @param {String} key
	 */
	async wait(key) {
		if (!this._mutexes[key]) {
			this._mutexes[key] = {
				promises: [],
				resolvers: [],
				count: 0
			}
		}

		//track which we are on
		this._mutexes[key].count++

		//first is always auto resolved
		if (this._mutexes[key].count === 1) {
			this._mutexes[key].promises.push(new Promise(resolve => resolve()))
			this._mutexes[key].resolvers.push(() => {})
		} else {
			let resolver = resolve => {
				this._mutexes[key].resolvers.push(resolve)
			}
			let promise = new Promise(resolver)
			this._mutexes[key].promises.push(promise)
		}

		return this._mutexes[key].promises[this._mutexes[key].count - 1]
	}

	/**
	 * Long operation is complete, start up again.
	 *
	 * @param {String} key
	 */
	async go(key) {
		if (this._mutexes[key]) {
			//remove this promise
			this._mutexes[key].promises.shift()
			this._mutexes[key].resolvers.shift()
			this._mutexes[key].count--

			//if we are done, clear
			if (this._mutexes[key].count === 0) {
				delete this._mutexes[key]
			} else {
				//otherwise resolve the next promise
				this._mutexes[key].resolvers[0]()
			}
		}
	}
}

module.exports = Sprucebot
