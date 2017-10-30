const url = require('../utilities/url')
const https = require('https')

module.exports = class Https {
	constructor({
		host,
		apiKey,
		skillId,
		version,
		allowSelfSignedCerts = false
	}) {
		if (!host || !apiKey || !skillId || !version) {
			throw new Error(
				'You gotta pass host, apiKey, skillId, and version to the Http constructor'
			)
		}
		this.host = host
		this.apiKey = apiKey
		this.skillId = skillId
		this.version = version
		this.allowSelfSignedCerts = allowSelfSignedCerts
	}

	/**
     * GET an endpoint.
     * 
     * @param {String} url Path to the endpoint you want to hit. Do NOT include /api/${version}/skills/${skillId}
     * @param {Object} query Vanilla object that is converted into a query string
     * @returns {Promise}
     */
	async get(path, query) {
		// everything is a promise
		return new Promise((resolve, reject) => {
			// API Key must go with each request
			const headers = {
				'x-skill-api-key': this.apiKey
			}

			https.get(
				{
					host: this.host,
					path: url.build(path, query, this.version, this.skillId),
					rejectUnauthorized: !this.allowSelfSignedCerts,
					headers
				},
				response => {
					this.handleResponse(response, resolve, reject)
				}
			)
		})
	}

	/**
     * POST some data to the API. Override `method` to PATCH for patching.
     * 
     * @param {String} path 
     * @param {Object} data 
     * @param {Object} query 
     * @param {String} method 
     * @returns {Promise}
     */
	async post(path, data, query, method = 'POST') {
		return new Promise((resolve, reject) => {
			// API Key must go with each request
			const headers = {
				'x-skill-api-key': this.apiKey,
				'Content-Type': 'application/x-www-form-urlencoded'
			}

			const request = https.request(
				{
					method: method,
					host: this.host,
					headers,
					rejectUnauthorized: !this.allowSelfSignedCerts,
					path: url.build(path, query, this.version, this.skillId)
				},
				response => {
					this.handleResponse(response, resolve, reject)
				}
			)

			request.write(url.serialize(data))
			request.end()
		})
	}

	/**
	 * Make an update through the API
	 * 
	 * @param {String} path 
	 * @param {Object} data 
	 * @param {Object} query 
	 * @returns {Promise}
	 */
	async patch(path, data, query) {
		return this.post(path, data, query, 'PATCH')
	}

	/**
	 * Delete something from the API
	 * @param {String} path 
	 * @param {Object} query
	 * @returns {Promise} 
	 */
	async delete(path, query) {
		return new Promise((resolve, reject) => {
			const headers = {
				'x-skill-api-key': this.apiKey
			}
			const request = https.request(
				{
					method: 'DELETE',
					host: this.host,
					headers,
					rejectUnauthorized: !this.allowSelfSignedCerts,
					path: url.build(path, query, this.version, this.skillId)
				},
				response => {
					this.handleResponse(response, resolve, reject)
				}
			)
			request.write('')
			request.end()
		})
	}

	/**
	 * Univeral handling of all responses from the API
	 * 
	 * @param {Response} response 
	 * @param {Function} resolve 
	 * @param {Function} reject 
	 */
	handleResponse(response, resolve, reject) {
		// Build response as data comes in
		let body = ''
		response.on('data', d => (body += d))

		// Handle errors
		response.on('error', err => reject(err))

		// Handle completion
		response.on('end', () => {
			try {
				var parsed = JSON.parse(body)
				if (response.statusCode !== 200) {
					reject(new Error(parsed.friendlyReason || parsed.reason || parsed))
				} else {
					resolve(parsed)
				}
			} catch (err) {
				reject(err)
			}
		})
	}
}
