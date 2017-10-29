const contextFactory = require('./skillskit/contextFactory')
const routes = require('./skillskit/routes')
const wares = require('./skillskit/wares')

class Sprucebot {
	constructor({apiKey, skillId, host,skillName}) {

		// Check against defaults to see if dev has updated their env vars
		const dqStr = 'you should'
		if (
			apiKey.indexOf(dqStr) >= 0 ||
			skillId.indexOf(dqStr) >= 0 ||
			host.indexOf(dqStr) >= 0 ||
			skillName.indexOf(dqStr) >= 0
		) {
			throw new Error(
				'Oi! You need to create an .env file at the root of this repository! 😠  Jk, but for real, you should take a peak at .env.sample and then customize your own but just call it .env . Alternatively, if you prefer, you can use an awesome tool like PM2, Nodemon, or ForeverJS to manage this server-process and environment.'
			)
		}

		// Check required configs for instantiating the class
		const configParamErrorBaseStr =
			'Sprucebot Class requires a single configuration object including'
		if (!apiKey) {
			throw new Error(`${configParamErrorBaseStr} an apiKey key/value pair`)
		} else if (!host) {
			throw new Error(`${configParamErrorBaseStr} a host key/value pair`)
		} else if (!skillId) {
			throw new Error(`${configParamErrorBaseStr} a skillId key/value pair`)
		} else if (!skillName) {
			throw new Error(`${configParamErrorBaseStr} a skillName key/value pair`)
		}
		this.apiKey = apiKey
		this.host = host
		this.skillId = skillId
		this.skillName = skillName

		console.log(
			`🌲 Sprucebot🌲 Skills Kit instantiated with : \napiKey : ${this
				.apiKey}, \nhost : ${this.host}, \nskillId : ${this
				.skillId} \nskillName : ${this
				.skillName} \n---------------------------------`
        )
        
        // Setup skillskit helpers
        this.skillskit = {
            contextFactory,
            routes,
            wares
        }
	}

    
	
}

module.exports = Sprucebot
