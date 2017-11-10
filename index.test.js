const Sprucebot = require('./index')
const fs = require('fs')
const path = require('path')

// Test skill on Dev
const TIMESTAMP = new Date().getTime()
const SPRUCE_ID = '1975559c-e071-4198-8ab3-eccbeb00e1d0'
const TAYLOR_ID = '78245981-5022-49a7-b2f2-6ac687e0f3d1'
const SKILL = {
	id: '482D8B56-5223-43BF-8E7F-011509B9968A',
	apiKey: 'DD16373A-9482-4E27-A4A3-77B2664F6C82',
	host: 'local-api.sprucebot.com',
	name: `Unit Test Skill - ${TIMESTAMP}`,
	description: `This skill is for the tests that are run on pre-commit. ${TIMESTAMP}`,
	interfaceUrl: `http://noop/${TIMESTAMP}`,
	serverUrl: `http://noop/${TIMESTAMP}`,
	allowSelfSignedCerts: true,
	svgIcon: fs
		.readFileSync(path.join(__dirname, '__mocks__/icons/flask.svg'))
		.toString()
}
describe('API Tests', () => {
	beforeEach(async () => {
		const sb = new Sprucebot(SKILL)

		//should reset everything
		await sb.sync()

		//make sure everything is actually reset
		const data = await sb.https.get('/')

		if (data.name !== sb.name)
			throw new Error(`Environment not reset for sb.name: ${sb.name}`)
		if (data.description !== sb.description)
			throw new Error(
				`Environment not reset for sb.description: ${sb.description}`
			)
		if (data.icon !== sb.icon)
			throw new Error(`Environment not reset for sb.icon: ${sb.icon}`)
		if (data.iframeUrl !== sb.iframeUrl)
			throw new Error(`Environment not reset for sb.iframeUrl: ${sb.iframeUrl}`)
		if (data.marketingUrl !== sb.marketingUrl)
			throw new Error(
				`Environment not reset for sb.marketingUrl: ${sb.marketingUrl}`
			)
		if (data.skillUrl !== sb.skillUrl)
			throw new Error(`Environment not reset for sb.skillUrl: ${sb.skillUrl}`)

		//clear all meta data for this skill
		const metas = await sb.metas({ limit: 200 })
		await Promise.all(
			metas.map(meta => {
				return sb.deleteMeta(meta.id)
			})
		)
	})

	afterAll(async () => {
		const sb = new Sprucebot(SKILL)
		const metas = await sb.metas({ limit: 200 })
		await Promise.all(
			metas.map(meta => {
				return sb.deleteMeta(meta.id)
			})
		)
	})

	test(`Sprucebot should be able to change it's name`, async () => {
		expect.assertions(1)

		const options = { ...SKILL, name: 'Waka Waka' }
		const sb = new Sprucebot(options)
		await sb.sync()

		let data = await sb.https.get('/')

		expect(data.name).toEqual(options.name)
	})

	test('Sprucebot should be able to fetch locations', async () => {
		expect.assertions(2)

		const sb = new Sprucebot(SKILL)
		const locations = await sb.locations()
		expect(locations.length).toBeGreaterThan(0) // at least it's always enabled for Spruce

		// make sure exactly 1 is returned
		const first = await sb.locations({ limit: 1 })
		expect(first.length).toEqual(1)
	})

	test('Sprucebot should be able to load Spruce', async () => {
		expect.assertions(1)

		const sb = new Sprucebot(SKILL)
		const spruce = await sb.location(SPRUCE_ID)
		expect(spruce.id).toEqual(SPRUCE_ID)
	})

	test.skip('Sprucebot should be able to send messages', async () => {
		// I have no idea how to test this one
	})

	test('Sprucebot should be able to create skill wide meta data and find it', async () => {
		expect.assertions(2)

		const sb = new Sprucebot(SKILL)

		const luckyNumbers = await sb.createMeta('lucky-numbers', [1, 2, 3])
		expect(luckyNumbers.value).toEqual([1, 2, 3])

		const meta = await sb.meta('lucky-numbers')
		expect(meta.id).toEqual(luckyNumbers.id)
	})

	test('Sprucebot should be able to create location specific meta data and find it', async () => {
		expect.assertions(4)

		const sb = new Sprucebot(SKILL)

		const luckyNumbers = await sb.createMeta('lucky-numbers', [1, 2, 3], {
			locationId: SPRUCE_ID
		})
		expect(luckyNumbers.value).toEqual([1, 2, 3])
		expect(luckyNumbers.LocationId).toEqual(SPRUCE_ID)

		const meta = await sb.meta('lucky-numbers', { locationId: SPRUCE_ID })
		expect(meta.id).toEqual(luckyNumbers.id)
		expect(meta.LocationId).toEqual(luckyNumbers.LocationId)
	})

	test('Sprucebot should NOT be able to create guest specific meta data and find it', async () => {
		expect.assertions(1)

		const sb = new Sprucebot(SKILL)
		try {
			await sb.createMeta('lucky-numbers', [1, 2, 3], { userId: TAYLOR_ID })
		} catch (e) {
			expect(e.response.statusCode).toEqual(403)
		}
	})

	test('Sprucebot should be able to create meta data for a location+user and find it', async () => {
		expect.assertions(9)

		const sb = new Sprucebot(SKILL)

		const luckyNumbers = await sb.createMeta('lucky-numbers', [1, 2, 3], {
			locationId: SPRUCE_ID,
			userId: TAYLOR_ID
		})
		expect(luckyNumbers.value).toEqual([1, 2, 3])
		expect(luckyNumbers.LocationId).toEqual(SPRUCE_ID)
		expect(luckyNumbers.UserId).toEqual(TAYLOR_ID)

		//search just against location id
		const meta = await sb.meta('lucky-numbers', { locationId: SPRUCE_ID })
		expect(meta.id).toEqual(luckyNumbers.id)
		expect(meta.LocationId).toEqual(luckyNumbers.LocationId)
		expect(meta.UserId).toEqual(luckyNumbers.UserId)

		//search against user and location
		const meta2 = await sb.meta('lucky-numbers', {
			locationId: SPRUCE_ID,
			userId: TAYLOR_ID
		})
		expect(meta2.id).toEqual(luckyNumbers.id)
		expect(meta2.LocationId).toEqual(luckyNumbers.LocationId)
		expect(meta2.UserId).toEqual(luckyNumbers.UserId)
	})

	test('Sprucebot should be able to update meta data', async () => {
		expect.assertions(2)

		const sb = new Sprucebot(SKILL)
		const rewards = await sb.createMeta('rewards', [
			'Six foot',
			'Seven foot',
			'Eight foot',
			'BUNCH'
		])

		const updatedRewards = await sb.updateMeta(rewards.id, {
			value: ['Day light come', 'and he want to go home']
		})
		expect(updatedRewards.value).not.toEqual(rewards.value)

		// re-fetch and check again
		const fetchUpdatedRewards = await sb.meta('rewards')

		expect(fetchUpdatedRewards.value).toEqual(updatedRewards.value)
	})

	test('Sprucebot should be able to find or metadata', async () => {
		expect.assertions(4)

		const sb = new Sprucebot(SKILL)
		const value = { foo: 'bar' }
		const upserted = await sb.metaOrCreate('rewards-again', value)
		expect(upserted.id).toBeTruthy()

		const upserted2 = await sb.metaOrCreate('rewards-again', value) // need a better way to test if the value has not changes
		const upserted3 = await sb.metaOrCreate('rewards-again', { hello: 'world' }) //also should not have changed

		expect(upserted.id).toEqual(upserted2.id)
		expect(upserted.id).toEqual(upserted3.id)
		expect(upserted3.value).toEqual(value)
	})

	test('Sprucebot should be able to upsert metadata', async () => {
		expect.assertions(4)

		const sb = new Sprucebot(SKILL)
		const value = { foo: 'bar' }
		const upserted = await sb.upsertMeta('rewards-again', value)
		expect(upserted.id).toBeTruthy()

		const upserted2 = await sb.upsertMeta('rewards-again', value) // need a better way to test if the value has not changes
		const upserted3 = await sb.upsertMeta('rewards-again', { hello: 'world' }) //also should not have changed

		expect(upserted.id).toEqual(upserted2.id)
		expect(upserted.id).toEqual(upserted3.id)
		expect(upserted3.value).toEqual({ hello: 'world' })
	})

	test('Sprucebot should be able to create simple meta and fetch it', async () => {
		expect.assertions(1)
		const sb = new Sprucebot(SKILL)
		const meta = await sb.createMeta('test-1', true)
		const found = await sb.meta('test-1')

		expect(meta.value).toEqual(found.value)
	})

	test('Sprucebot should be able to create complex meta and search against it', async () => {
		expect.assertions(1)
		const sb = new Sprucebot(SKILL)
		const meta1 = await sb.createMeta('test-2', {
			foo: 'bar'
		})
		const meta2 = await sb.createMeta('test-2', {
			hello: 'world'
		})

		const matches = await sb.metas({
			value: {
				hello: 'world'
			}
		})

		expect(meta2.id).toEqual(matches[0].id)
	})

	test('Sprucebot should be able to create even more complex meta and search against $contains', async () => {
		expect.assertions(3)
		const sb = new Sprucebot(SKILL)
		const meta1 = await sb.createMeta('test-2', {
			foo: 'bar',
			bar: 'foo'
		})
		const meta2 = await sb.createMeta('test-2', {
			hello: 'world',
			world: 'hello'
		})

		const meta3 = await sb.createMeta('test-2', {
			hello: 'world',
			again: 'hello'
		})

		const matches = await sb.metas({
			value: {
				hello: 'world'
			}
		})

		const matches2 = await sb.metas({
			value: {
				hello: 'world',
				again: 'hello'
			}
		})

		expect(matches).toHaveLength(2)
		expect(matches2).toHaveLength(1)
		expect(matches2[0].id).toEqual(meta3.id)
	})

	test('Sprucebot should be able to create a few metas and find some with $or with exact match', async () => {
		expect.assertions(3)
		const sb = new Sprucebot(SKILL)
		const meta1 = await sb.createMeta('test-2', {
			foo: 'bar'
		})
		const meta2 = await sb.createMeta('test-2', {
			foo: 'world'
		})
		const meta3 = await sb.createMeta('test-2', {
			foo: 'go'
		})

		const matches = await sb.metas({
			value: {
				$or: [
					{
						foo: 'bar'
					},
					{
						foo: 'world'
					}
				]
			}
		})

		expect(matches).toHaveLength(2)
		expect(matches[0].id).toEqual(meta1.id)
		expect(matches[1].id).toEqual(meta2.id)
	})

	test('Sprucebot should be able to save meta data as arrays', async () => {
		expect.assertions(2)
		const sb = new Sprucebot(SKILL)
		const value = ['go', 'team']
		const meta = await sb.metaOrCreate('test-1', value, {
			locationId: SPRUCE_ID
		})

		expect(meta.value).toEqual(value)

		const meta2 = await sb.meta('test-1', {
			locationId: SPRUCE_ID
		})
		expect(meta2.value).toEqual(value)
	})

	test('Sprucebot should be able to create a few metas and find some with $or with $contains match', async () => {
		expect.assertions(3)
		const sb = new Sprucebot(SKILL)
		const meta1 = await sb.createMeta('test-2', {
			foo: 'bar',
			hello: 'world'
		})
		const meta2 = await sb.createMeta('test-2', {
			foo: 'world',
			plus: 'one'
		})
		const meta3 = await sb.createMeta('test-2', {
			foo: 'go',
			bananas: 'apples'
		})

		const matches = await sb.metas({
			value: {
				$or: [
					{
						foo: 'bar'
					},
					{
						foo: 'world'
					}
				]
			}
		})

		expect(matches).toHaveLength(2)
		expect(matches[0].id).toEqual(meta1.id)
		expect(matches[1].id).toEqual(meta2.id)
	})
})
